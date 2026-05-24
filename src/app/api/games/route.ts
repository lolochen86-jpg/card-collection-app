import { NextRequest, NextResponse } from "next/server";
import { MOCK_DASHBOARD_ROWS } from "@/lib/mock-data";
import type {
  League,
  Game,
  EdgeSignal,
  FairProbability,
  OddsSnapshot,
  DashboardRow,
} from "@/types";

const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

/** Transform raw Supabase join result → DashboardRow[] */
function toRows(rawGames: Record<string, unknown>[]): DashboardRow[] {
  return rawGames.map((raw) => {
    const game = {
      id: raw.id,
      league: raw.league,
      home_team: raw.home_team,
      away_team: raw.away_team,
      home_team_zh: raw.home_team_zh,
      away_team_zh: raw.away_team_zh,
      game_time: raw.game_time,
      status: raw.status,
      external_id: raw.external_id,
      taiwan_game_id: raw.taiwan_game_id,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    } as Game;

    const signals = (raw.edge_signals as EdgeSignal[]) ?? [];
    const fairProbs = (raw.fair_probabilities as FairProbability[]) ?? [];
    const snapshots = (raw.odds_snapshots as OddsSnapshot[]) ?? [];

    const homeSignal =
      signals.find((s) => s.side === "home" && s.market_type === "moneyline") ??
      null;
    const awaySignal =
      signals.find((s) => s.side === "away" && s.market_type === "moneyline") ??
      null;
    const fairProb =
      fairProbs.find((f) => f.market_type === "moneyline") ?? null;
    const taiwanSnapshot =
      snapshots.find((s) => s.bookmaker === "taiwan_sports") ?? null;

    const lastUpdated =
      snapshots.length > 0
        ? snapshots.reduce((latest, s) =>
            s.snapshot_time > latest.snapshot_time ? s : latest
          ).snapshot_time
        : null;

    return {
      game,
      homeSignal,
      awaySignal,
      fairProb,
      snapshots,
      taiwanSnapshot,
      lastUpdated,
    };
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const league = searchParams.get("league") as League | null;
  const status = searchParams.get("status");

  if (USE_MOCK) {
    let rows = MOCK_DASHBOARD_ROWS;
    if (league) rows = rows.filter((r) => r.game.league === league);
    if (status) rows = rows.filter((r) => r.game.status === status);
    return NextResponse.json({ data: rows, source: "mock" });
  }

  try {
    const { getServiceClient } = await import("@/lib/supabase");
    const db = getServiceClient();

    let query = db
      .from("games")
      .select(
        `*, edge_signals(*), fair_probabilities(*), odds_snapshots(*)`
      )
      .order("game_time", { ascending: true });

    if (league) query = query.eq("league", league);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      data: toRows((data ?? []) as Record<string, unknown>[]),
      source: "supabase",
    });
  } catch (err) {
    console.error("GET /api/games error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
