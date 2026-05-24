import { NextRequest, NextResponse } from "next/server";
import { MOCK_DASHBOARD_ROWS } from "@/lib/mock-data";
import type { League } from "@/types";

const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

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
      .select(`
        *,
        edge_signals(*),
        fair_probabilities(*),
        odds_snapshots(*)
      `)
      .order("game_time", { ascending: true });

    if (league) query = query.eq("league", league);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data, source: "supabase" });
  } catch (err) {
    console.error("GET /api/games error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
