import { NextRequest, NextResponse } from "next/server";
import type { League } from "@/types";
import {
  fetchFromTheOddsApi,
  parseTheOddsApiResponse,
  selectSharpBookmakers,
} from "@/lib/odds-fetcher";
import { calculateEdge, consensusNoVigProbs } from "@/lib/edge-calculator";
import { canAutoMatch, isWithinAllowedTimeDiff, resolveTeamName } from "@/lib/team-matcher";

export async function POST(req: NextRequest) {
  // Validate cron/admin secret
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const league: League = body.league ?? "NBA";
  const dryRun: boolean = body.dryRun ?? false;

  if (!process.env.THE_ODDS_API_KEY) {
    return NextResponse.json(
      {
        error:
          "THE_ODDS_API_KEY not set. Add it to .env.local and restart the server.",
        hint: "See .env.local.example for required variables.",
      },
      { status: 503 }
    );
  }

  try {
    // 1. Fetch from The Odds API
    const rawGames = await fetchFromTheOddsApi({ league });

    if (dryRun) {
      return NextResponse.json({
        message: "Dry run — no data written",
        gamesFound: rawGames.length,
        sample: rawGames.slice(0, 2),
      });
    }

    const { getServiceClient } = await import("@/lib/supabase");
    const db = getServiceClient();

    let upserted = 0;
    let snapshotsSaved = 0;

    for (const apiGame of rawGames) {
      // 2. Upsert game record
      const resolvedHome =
        resolveTeamName(apiGame.home_team, league) ?? apiGame.home_team;
      const resolvedAway =
        resolveTeamName(apiGame.away_team, league) ?? apiGame.away_team;

      const { data: gameRow, error: gameErr } = await db
        .from("games")
        .upsert(
          {
            league,
            home_team: apiGame.home_team,
            away_team: apiGame.away_team,
            game_time: apiGame.commence_time,
            status: "scheduled",
            external_id: apiGame.id,
          },
          { onConflict: "external_id" }
        )
        .select("id")
        .single();

      if (gameErr || !gameRow) {
        console.error("Game upsert failed:", gameErr);
        continue;
      }

      upserted++;
      const gameId = gameRow.id as string;

      // 3. Parse and save odds snapshots
      const snapshots = parseTheOddsApiResponse([apiGame], { [apiGame.id]: gameId });

      if (snapshots.length > 0) {
        const { error: snapErr } = await db
          .from("odds_snapshots")
          .insert(snapshots);
        if (snapErr) console.error("Snapshot insert failed:", snapErr);
        else snapshotsSaved += snapshots.length;
      }

      // 4. Calculate fair probabilities
      const sharpSnaps = selectSharpBookmakers(snapshots);
      const pairs = sharpSnaps
        .filter((s) => s.home_odds && s.away_odds)
        .map((s) => ({
          home: s.home_odds!,
          away: s.away_odds!,
          bookmaker: s.bookmaker,
        }));

      if (pairs.length > 0) {
        const { homeNoVigProb, awayNoVigProb, vigPct } = consensusNoVigProbs(pairs);

        await db.from("fair_probabilities").insert({
          game_id: gameId,
          market_type: "moneyline",
          home_no_vig_prob: homeNoVigProb,
          away_no_vig_prob: awayNoVigProb,
          home_fair_odds: 1 / homeNoVigProb,
          away_fair_odds: 1 / awayNoVigProb,
          vig_pct: vigPct,
          bookmakers_used: pairs.map((p) => p.bookmaker),
          bookmakers_count: pairs.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      league,
      gamesUpserted: upserted,
      snapshotsSaved,
    });
  } catch (err) {
    console.error("POST /api/odds/fetch error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
