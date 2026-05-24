export type League = "NBA" | "MLB";
export type GameStatus = "scheduled" | "live" | "finished" | "cancelled";
export type MarketType = "moneyline" | "spread" | "totals";
export type Side = "home" | "away";
export type ConfidenceLevel = "high" | "medium" | "low" | "manual_review";

export interface Game {
  id: string;
  league: League;
  home_team: string;
  away_team: string;
  home_team_zh?: string;
  away_team_zh?: string;
  game_time: string;
  status: GameStatus;
  external_id?: string;
  taiwan_game_id?: string;
  created_at: string;
  updated_at: string;
}

export interface OddsSnapshot {
  id: string;
  game_id: string;
  bookmaker: string;
  market_type: MarketType;
  home_odds: number | null;
  away_odds: number | null;
  draw_odds: number | null;
  line: number | null;
  snapshot_time: string;
  source: string | null;
  raw_data?: unknown;
  created_at: string;
}

export interface FairProbability {
  id: string;
  game_id: string;
  market_type: MarketType;
  home_no_vig_prob: number;
  away_no_vig_prob: number;
  home_fair_odds: number;
  away_fair_odds: number;
  vig_pct: number;
  bookmakers_used: string[];
  bookmakers_count: number;
  calculated_at: string;
  created_at: string;
}

export interface EdgeSignal {
  id: string;
  game_id: string;
  market_type: MarketType;
  side: Side;
  taiwan_odds: number;
  no_vig_prob: number;
  fair_odds: number;
  ev_pct: number;
  edge_pct: number;
  kelly_fraction: number;
  confidence_level: ConfidenceLevel;
  needs_review: boolean;
  data_sources?: {
    bookmakers: string[];
    snapshot_ids: string[];
  };
  calculated_at: string;
  created_at: string;
}

// ── API / The Odds API shapes ──────────────────────────────────────────────

export interface TheOddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface TheOddsApiMarket {
  key: MarketType;
  last_update: string;
  outcomes: TheOddsApiOutcome[];
}

export interface TheOddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: TheOddsApiMarket[];
}

export interface TheOddsApiGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: TheOddsApiBookmaker[];
}

// ── Dashboard view model ───────────────────────────────────────────────────

export interface DashboardRow {
  game: Game;
  homeSignal: EdgeSignal | null;
  awaySignal: EdgeSignal | null;
  fairProb: FairProbability | null;
  snapshots: OddsSnapshot[];
  taiwanSnapshot: OddsSnapshot | null;
  lastUpdated: string | null;
}

// ── Calculation inputs ─────────────────────────────────────────────────────

export interface OddsPair {
  home: number;
  away: number;
  bookmaker: string;
}

export interface EdgeCalculationInput {
  taiwanHomeOdds: number;
  taiwanAwayOdds: number;
  internationalOdds: OddsPair[];
  market: MarketType;
}

export interface EdgeCalculationResult {
  homeNoVigProb: number;
  awayNoVigProb: number;
  homeFairOdds: number;
  awayFairOdds: number;
  vigPct: number;
  homeEV: number;
  awayEV: number;
  homeEdgePct: number;
  awayEdgePct: number;
  homeKelly: number;
  awayKelly: number;
  homeConfidence: ConfidenceLevel;
  awayConfidence: ConfidenceLevel;
  homeNeedsReview: boolean;
  awayNeedsReview: boolean;
}
