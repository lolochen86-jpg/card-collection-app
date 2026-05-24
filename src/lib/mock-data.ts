/**
 * Mock data for development and testing.
 * Represents a typical day of NBA + MLB games with realistic odds.
 */

import type {
  Game,
  OddsSnapshot,
  FairProbability,
  EdgeSignal,
  DashboardRow,
} from "@/types";

const now = new Date();
const today = now.toISOString();

function hoursFromNow(h: number): string {
  return new Date(now.getTime() + h * 3_600_000).toISOString();
}

// ── Games ─────────────────────────────────────────────────────────────────

export const MOCK_GAMES: Game[] = [
  {
    id: "g1",
    league: "NBA",
    home_team: "Boston Celtics",
    away_team: "Miami Heat",
    home_team_zh: "塞爾提克",
    away_team_zh: "熱火",
    game_time: hoursFromNow(3),
    status: "scheduled",
    external_id: "ext-nba-001",
    taiwan_game_id: "tw-nba-001",
    created_at: today,
    updated_at: today,
  },
  {
    id: "g2",
    league: "NBA",
    home_team: "Los Angeles Lakers",
    away_team: "Golden State Warriors",
    home_team_zh: "湖人",
    away_team_zh: "勇士",
    game_time: hoursFromNow(5),
    status: "scheduled",
    external_id: "ext-nba-002",
    taiwan_game_id: "tw-nba-002",
    created_at: today,
    updated_at: today,
  },
  {
    id: "g3",
    league: "NBA",
    home_team: "Denver Nuggets",
    away_team: "Phoenix Suns",
    home_team_zh: "金塊",
    away_team_zh: "太陽",
    game_time: hoursFromNow(6),
    status: "scheduled",
    external_id: "ext-nba-003",
    taiwan_game_id: "tw-nba-003",
    created_at: today,
    updated_at: today,
  },
  {
    id: "g4",
    league: "MLB",
    home_team: "New York Yankees",
    away_team: "Boston Red Sox",
    home_team_zh: "洋基",
    away_team_zh: "紅襪",
    game_time: hoursFromNow(4),
    status: "scheduled",
    external_id: "ext-mlb-001",
    taiwan_game_id: "tw-mlb-001",
    created_at: today,
    updated_at: today,
  },
  {
    id: "g5",
    league: "MLB",
    home_team: "Los Angeles Dodgers",
    away_team: "San Francisco Giants",
    home_team_zh: "道奇",
    away_team_zh: "巨人",
    game_time: hoursFromNow(7),
    status: "scheduled",
    external_id: "ext-mlb-002",
    taiwan_game_id: "tw-mlb-002",
    created_at: today,
    updated_at: today,
  },
  {
    id: "g6",
    league: "MLB",
    home_team: "Houston Astros",
    away_team: "Texas Rangers",
    home_team_zh: "太空人",
    away_team_zh: "遊騎兵",
    game_time: hoursFromNow(2),
    status: "live",
    external_id: "ext-mlb-003",
    taiwan_game_id: "tw-mlb-003",
    created_at: today,
    updated_at: today,
  },
];

// ── Odds Snapshots ────────────────────────────────────────────────────────

function snap(
  id: string,
  gameId: string,
  bookmaker: string,
  homeOdds: number,
  awayOdds: number
): OddsSnapshot {
  return {
    id,
    game_id: gameId,
    bookmaker,
    market_type: "moneyline",
    home_odds: homeOdds,
    away_odds: awayOdds,
    draw_odds: null,
    line: null,
    snapshot_time: today,
    source: "mock",
    created_at: today,
  };
}

export const MOCK_SNAPSHOTS: OddsSnapshot[] = [
  // g1: Celtics vs Heat
  snap("s1", "g1", "pinnacle", 1.72, 2.21),
  snap("s2", "g1", "bet365", 1.70, 2.25),
  snap("s3", "g1", "sbobet", 1.71, 2.22),
  snap("s4", "g1", "taiwan_sports", 1.85, 2.10), // TW odds less sharp

  // g2: Lakers vs Warriors
  snap("s5", "g2", "pinnacle", 2.08, 1.85),
  snap("s6", "g2", "bet365", 2.10, 1.83),
  snap("s7", "g2", "sbobet", 2.05, 1.88),
  snap("s8", "g2", "taiwan_sports", 2.20, 1.80),

  // g3: Nuggets vs Suns
  snap("s9", "g3", "pinnacle", 1.55, 2.65),
  snap("s10", "g3", "bet365", 1.57, 2.60),
  snap("s11", "g3", "taiwan_sports", 1.60, 2.55),

  // g4: Yankees vs Red Sox
  snap("s12", "g4", "pinnacle", 1.82, 2.10),
  snap("s13", "g4", "bet365", 1.80, 2.12),
  snap("s14", "g4", "sbobet", 1.83, 2.08),
  snap("s15", "g4", "taiwan_sports", 1.95, 2.00),

  // g5: Dodgers vs Giants
  snap("s16", "g5", "pinnacle", 1.45, 2.90),
  snap("s17", "g5", "bet365", 1.47, 2.85),
  snap("s18", "g5", "taiwan_sports", 1.50, 2.80),

  // g6: Astros vs Rangers (live)
  snap("s19", "g6", "pinnacle", 1.65, 2.35),
  snap("s20", "g6", "bet365", 1.67, 2.30),
  snap("s21", "g6", "taiwan_sports", 1.75, 2.25),
];

// ── Fair Probabilities ────────────────────────────────────────────────────

export const MOCK_FAIR_PROBS: FairProbability[] = [
  {
    id: "fp1",
    game_id: "g1",
    market_type: "moneyline",
    home_no_vig_prob: 0.5826,
    away_no_vig_prob: 0.4174,
    home_fair_odds: 1.7163,
    away_fair_odds: 2.3958,
    vig_pct: 2.8,
    bookmakers_used: ["pinnacle", "bet365", "sbobet"],
    bookmakers_count: 3,
    calculated_at: today,
    created_at: today,
  },
  {
    id: "fp2",
    game_id: "g2",
    market_type: "moneyline",
    home_no_vig_prob: 0.4730,
    away_no_vig_prob: 0.5270,
    home_fair_odds: 2.1141,
    away_fair_odds: 1.8975,
    vig_pct: 3.1,
    bookmakers_used: ["pinnacle", "bet365", "sbobet"],
    bookmakers_count: 3,
    calculated_at: today,
    created_at: today,
  },
  {
    id: "fp3",
    game_id: "g3",
    market_type: "moneyline",
    home_no_vig_prob: 0.6393,
    away_no_vig_prob: 0.3607,
    home_fair_odds: 1.5642,
    away_fair_odds: 2.7724,
    vig_pct: 2.5,
    bookmakers_used: ["pinnacle", "bet365"],
    bookmakers_count: 2,
    calculated_at: today,
    created_at: today,
  },
  {
    id: "fp4",
    game_id: "g4",
    market_type: "moneyline",
    home_no_vig_prob: 0.5332,
    away_no_vig_prob: 0.4668,
    home_fair_odds: 1.8754,
    away_fair_odds: 2.1421,
    vig_pct: 3.6,
    bookmakers_used: ["pinnacle", "bet365", "sbobet"],
    bookmakers_count: 3,
    calculated_at: today,
    created_at: today,
  },
  {
    id: "fp5",
    game_id: "g5",
    market_type: "moneyline",
    home_no_vig_prob: 0.6720,
    away_no_vig_prob: 0.3280,
    home_fair_odds: 1.4881,
    away_fair_odds: 3.0488,
    vig_pct: 2.2,
    bookmakers_used: ["pinnacle", "bet365"],
    bookmakers_count: 2,
    calculated_at: today,
    created_at: today,
  },
  {
    id: "fp6",
    game_id: "g6",
    market_type: "moneyline",
    home_no_vig_prob: 0.5892,
    away_no_vig_prob: 0.4108,
    home_fair_odds: 1.6973,
    away_fair_odds: 2.4343,
    vig_pct: 2.9,
    bookmakers_used: ["pinnacle", "bet365"],
    bookmakers_count: 2,
    calculated_at: today,
    created_at: today,
  },
];

// ── Edge Signals ──────────────────────────────────────────────────────────

function makeSignal(
  id: string,
  gameId: string,
  side: "home" | "away",
  taiwanOdds: number,
  noVigProb: number,
  fairOdds: number
): EdgeSignal {
  const ev = noVigProb * taiwanOdds - 1;
  const evPct = ev * 100;
  const b = taiwanOdds - 1;
  const kelly = b > 0 ? Math.max(0, (b * noVigProb - (1 - noVigProb)) / b) : 0;
  const absEdge = Math.abs(evPct);
  const needsReview = absEdge > 10;
  const confidence =
    needsReview
      ? "manual_review"
      : absEdge >= 3
      ? "high"
      : absEdge >= 1
      ? "medium"
      : "low";

  return {
    id,
    game_id: gameId,
    market_type: "moneyline",
    side,
    taiwan_odds: taiwanOdds,
    no_vig_prob: noVigProb,
    fair_odds: fairOdds,
    ev_pct: evPct,
    edge_pct: evPct,
    kelly_fraction: kelly,
    confidence_level: confidence,
    needs_review: needsReview,
    data_sources: { bookmakers: ["pinnacle", "bet365", "sbobet"], snapshot_ids: [] },
    calculated_at: today,
    created_at: today,
  };
}

export const MOCK_EDGE_SIGNALS: EdgeSignal[] = [
  // g1 Celtics home: Taiwan 1.85 vs fair 1.7163  → +EV
  makeSignal("e1h", "g1", "home", 1.85, 0.5826, 1.7163),
  // g1 Heat away: Taiwan 2.10 vs fair 2.3958  → -EV
  makeSignal("e1a", "g1", "away", 2.10, 0.4174, 2.3958),

  // g2 Lakers home: Taiwan 2.20 vs fair 2.1141  → +EV (small)
  makeSignal("e2h", "g2", "home", 2.20, 0.4730, 2.1141),
  // g2 Warriors away: Taiwan 1.80 vs fair 1.8975  → -EV
  makeSignal("e2a", "g2", "away", 1.80, 0.5270, 1.8975),

  // g3 Nuggets home: Taiwan 1.60 vs fair 1.5642  → +EV (small)
  makeSignal("e3h", "g3", "home", 1.60, 0.6393, 1.5642),
  // g3 Suns away: Taiwan 2.55 vs fair 2.7724  → -EV
  makeSignal("e3a", "g3", "away", 2.55, 0.3607, 2.7724),

  // g4 Yankees home: Taiwan 1.95 vs fair 1.8754  → +EV
  makeSignal("e4h", "g4", "home", 1.95, 0.5332, 1.8754),
  // g4 Red Sox away: Taiwan 2.00 vs fair 2.1421  → -EV
  makeSignal("e4a", "g4", "away", 2.00, 0.4668, 2.1421),

  // g5 Dodgers home: Taiwan 1.50 vs fair 1.4881  → +EV (small)
  makeSignal("e5h", "g5", "home", 1.50, 0.6720, 1.4881),
  // g5 Giants away: Taiwan 2.80 vs fair 3.0488  → -EV
  makeSignal("e5a", "g5", "away", 2.80, 0.3280, 3.0488),

  // g6 Astros home: Taiwan 1.75 vs fair 1.6973  → +EV
  makeSignal("e6h", "g6", "home", 1.75, 0.5892, 1.6973),
  // g6 Rangers away: Taiwan 2.25 vs fair 2.4343  → -EV
  makeSignal("e6a", "g6", "away", 2.25, 0.4108, 2.4343),
];

// ── Dashboard rows ────────────────────────────────────────────────────────

export const MOCK_DASHBOARD_ROWS: DashboardRow[] = MOCK_GAMES.map((game) => {
  const homeSignal =
    MOCK_EDGE_SIGNALS.find((s) => s.game_id === game.id && s.side === "home") ??
    null;
  const awaySignal =
    MOCK_EDGE_SIGNALS.find((s) => s.game_id === game.id && s.side === "away") ??
    null;
  const fairProb =
    MOCK_FAIR_PROBS.find((f) => f.game_id === game.id) ?? null;
  const snapshots = MOCK_SNAPSHOTS.filter((s) => s.game_id === game.id);
  const taiwanSnapshot =
    snapshots.find((s) => s.bookmaker === "taiwan_sports") ?? null;

  return {
    game,
    homeSignal,
    awaySignal,
    fairProb,
    snapshots,
    taiwanSnapshot,
    lastUpdated: today,
  };
});
