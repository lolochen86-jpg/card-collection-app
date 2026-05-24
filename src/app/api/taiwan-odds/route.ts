import { NextRequest, NextResponse } from "next/server";
import type { TaiwanOddsPayload } from "@/lib/taiwan-odds";
import { parseTaiwanOdds } from "@/lib/taiwan-odds";
import { resolveTeamName, similarity, isWithinAllowedTimeDiff } from "@/lib/team-matcher";
import type { League } from "@/types";

const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

/**
 * POST /api/taiwan-odds
 * Accept a batch of Taiwan sports lottery odds and attempt to match
 * them to existing games in the database.
 *
 * Body: { odds: TaiwanOddsPayload[] }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.odds || !Array.isArray(body.odds)) {
    return NextResponse.json(
      { error: "Body must be { odds: TaiwanOddsPayload[] }" },
      { status: 400 }
    );
  }

  const payloads: TaiwanOddsPayload[] = body.odds;
  const results: {
    payload: TaiwanOddsPayload;
    matched: boolean;
    gameId?: string;
    reason?: string;
  }[] = [];

  if (USE_MOCK) {
    for (const p of payloads) {
      results.push({ payload: p, matched: false, reason: "Mock mode — no DB" });
    }
    return NextResponse.json({ results, source: "mock" });
  }

  const { getServiceClient } = await import("@/lib/supabase");
  const db = getServiceClient();

  for (const payload of payloads) {
    const league = payload.league.toUpperCase() as League;

    // Load candidate games within ±7 hours
    const timeMin = new Date(
      new Date(payload.gameTime).getTime() - 7 * 3_600_000
    ).toISOString();
    const timeMax = new Date(
      new Date(payload.gameTime).getTime() + 7 * 3_600_000
    ).toISOString();

    const { data: candidates } = await db
      .from("games")
      .select("id, home_team, away_team, game_time")
      .eq("league", league)
      .gte("game_time", timeMin)
      .lte("game_time", timeMax);

    if (!candidates || candidates.length === 0) {
      results.push({ payload, matched: false, reason: "No candidate games found" });
      continue;
    }

    // Safety rule 1 + 2: time diff ≤ 6h AND similarity ≥ 85%
    const twHome =
      resolveTeamName(payload.homeTeam, league) ?? payload.homeTeam;
    const twAway =
      resolveTeamName(payload.awayTeam, league) ?? payload.awayTeam;

    let bestMatch: (typeof candidates)[number] | null = null;
    let bestScore = 0;

    for (const c of candidates) {
      if (!isWithinAllowedTimeDiff(c.game_time, payload.gameTime)) continue;

      const intHome = resolveTeamName(c.home_team, league) ?? c.home_team;
      const intAway = resolveTeamName(c.away_team, league) ?? c.away_team;

      const score =
        (similarity(twHome, intHome) + similarity(twAway, intAway)) / 2;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = c;
      }
    }

    if (!bestMatch || bestScore < 0.85) {
      results.push({
        payload,
        matched: false,
        reason: `Best similarity ${(bestScore * 100).toFixed(1)}% < 85%`,
      });
      continue;
    }

    const gameId = bestMatch.id as string;
    const snapshot = parseTaiwanOdds(payload, gameId);

    await db.from("odds_snapshots").insert(snapshot);
    await db
      .from("games")
      .update({ taiwan_game_id: payload.gameNo })
      .eq("id", gameId);

    results.push({ payload, matched: true, gameId });
  }

  return NextResponse.json({ results });
}

/** GET /api/taiwan-odds — list latest Taiwan snapshots */
export async function GET(_req: NextRequest) {
  if (USE_MOCK) {
    const { MOCK_SNAPSHOTS } = await import("@/lib/mock-data");
    return NextResponse.json({
      data: MOCK_SNAPSHOTS.filter((s) => s.bookmaker === "taiwan_sports"),
      source: "mock",
    });
  }

  const { getServiceClient } = await import("@/lib/supabase");
  const db = getServiceClient();

  const { data, error } = await db
    .from("odds_snapshots")
    .select("*")
    .eq("bookmaker", "taiwan_sports")
    .order("snapshot_time", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  return NextResponse.json({ data });
}
