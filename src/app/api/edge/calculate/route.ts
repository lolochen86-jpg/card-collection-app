import { NextRequest, NextResponse } from "next/server";
import { calculateEdge } from "@/lib/edge-calculator";
import { selectSharpBookmakers } from "@/lib/odds-fetcher";
import type { OddsPair } from "@/types";

const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

/**
 * POST /api/edge/calculate
 * Re-compute edge signals for all games that have both
 * international and Taiwan odds snapshots.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const gameId: string | undefined = body.gameId;

  if (USE_MOCK) {
    const { MOCK_EDGE_SIGNALS } = await import("@/lib/mock-data");
    return NextResponse.json({
      message: "Mock mode — returning pre-computed signals",
      signals: MOCK_EDGE_SIGNALS,
      source: "mock",
    });
  }

  const { getServiceClient } = await import("@/lib/supabase");
  const db = getServiceClient();

  // Load games that have Taiwan odds
  let query = db
    .from("games")
    .select("id, league")
    .not("taiwan_game_id", "is", null);
  if (gameId) query = query.eq("id", gameId);

  const { data: games, error: gamesErr } = await query;
  if (gamesErr) {
    return NextResponse.json({ error: String(gamesErr) }, { status: 500 });
  }

  let totalSignals = 0;

  for (const game of games ?? []) {
    // Load all snapshots for this game
    const { data: snaps } = await db
      .from("odds_snapshots")
      .select("*")
      .eq("game_id", game.id)
      .eq("market_type", "moneyline");

    if (!snaps || snaps.length === 0) continue;

    const taiwanSnap = snaps.find((s) => s.bookmaker === "taiwan_sports");
    const intlSnaps = snaps.filter((s) => s.bookmaker !== "taiwan_sports");

    if (!taiwanSnap || intlSnaps.length === 0) continue;

    const sharpSnaps = selectSharpBookmakers(intlSnaps);
    const pairs: OddsPair[] = sharpSnaps
      .filter((s) => s.home_odds && s.away_odds)
      .map((s) => ({
        home: Number(s.home_odds),
        away: Number(s.away_odds),
        bookmaker: s.bookmaker,
      }));

    if (pairs.length === 0) continue;

    const result = calculateEdge({
      taiwanHomeOdds: Number(taiwanSnap.home_odds),
      taiwanAwayOdds: Number(taiwanSnap.away_odds),
      internationalOdds: pairs,
      market: "moneyline",
    });

    // Upsert home signal
    const homeSignal = {
      game_id: game.id,
      market_type: "moneyline",
      side: "home",
      taiwan_odds: Number(taiwanSnap.home_odds),
      no_vig_prob: result.homeNoVigProb,
      fair_odds: result.homeFairOdds,
      ev_pct: result.homeEdgePct,
      edge_pct: result.homeEdgePct,
      kelly_fraction: result.homeKelly,
      confidence_level: result.homeConfidence,
      needs_review: result.homeNeedsReview,
      data_sources: {
        bookmakers: pairs.map((p) => p.bookmaker),
        snapshot_ids: sharpSnaps.map((s) => s.id),
      },
    };

    const awaySignal = {
      ...homeSignal,
      side: "away",
      taiwan_odds: Number(taiwanSnap.away_odds),
      no_vig_prob: result.awayNoVigProb,
      fair_odds: result.awayFairOdds,
      ev_pct: result.awayEdgePct,
      edge_pct: result.awayEdgePct,
      kelly_fraction: result.awayKelly,
      confidence_level: result.awayConfidence,
      needs_review: result.awayNeedsReview,
    };

    await db.from("edge_signals").upsert([homeSignal, awaySignal], {
      onConflict: "game_id,market_type,side",
    });

    totalSignals += 2;
  }

  return NextResponse.json({ success: true, signalsUpdated: totalSignals });
}

/**
 * GET /api/edge/calculate
 * Quick ad-hoc calculation without DB — useful for testing.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const twHome = parseFloat(searchParams.get("twHome") ?? "0");
  const twAway = parseFloat(searchParams.get("twAway") ?? "0");
  const intHome = parseFloat(searchParams.get("intHome") ?? "0");
  const intAway = parseFloat(searchParams.get("intAway") ?? "0");

  if (!twHome || !twAway || !intHome || !intAway) {
    return NextResponse.json(
      {
        error:
          "Pass ?twHome=1.85&twAway=2.10&intHome=1.72&intAway=2.20 to get a quick calculation",
      },
      { status: 400 }
    );
  }

  const result = calculateEdge({
    taiwanHomeOdds: twHome,
    taiwanAwayOdds: twAway,
    internationalOdds: [{ home: intHome, away: intAway, bookmaker: "manual" }],
    market: "moneyline",
  });

  return NextResponse.json(result);
}
