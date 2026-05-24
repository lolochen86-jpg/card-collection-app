/**
 * Taiwan Sports Lottery odds utilities.
 *
 * The official site (sportslottery.com.tw) does not provide a public API.
 * Options for data ingestion:
 *   1. Manual CSV/JSON import via the admin UI
 *   2. Browser extension scraper that posts to /api/taiwan-odds
 *   3. Third-party data provider
 *
 * This module provides:
 *   - Types for Taiwan odds payloads
 *   - Parsing helpers
 *   - Matching logic against international games
 */

import type { League, OddsSnapshot } from "@/types";
import { canAutoMatch, isWithinAllowedTimeDiff, resolveTeamName } from "./team-matcher";

export interface TaiwanOddsPayload {
  gameNo: string;        // 台灣運彩內部場次編號
  league: string;        // "NBA" | "MLB"
  gameTime: string;      // ISO string
  homeTeam: string;      // 可能是中文或英文
  awayTeam: string;
  homeOdds: number;      // 小數賠率
  awayOdds: number;
  source: "manual" | "import";
}

/** Normalise a Taiwan odds payload into an OddsSnapshot row. */
export function parseTaiwanOdds(
  payload: TaiwanOddsPayload,
  gameId: string
): OddsSnapshot {
  return {
    id: crypto.randomUUID(),
    game_id: gameId,
    bookmaker: "taiwan_sports",
    market_type: "moneyline",
    home_odds: payload.homeOdds,
    away_odds: payload.awayOdds,
    draw_odds: null,
    line: null,
    snapshot_time: new Date().toISOString(),
    source: payload.source,
    raw_data: payload,
    created_at: new Date().toISOString(),
  };
}

export interface MatchResult {
  matched: boolean;
  similarity: number;
  reason?: string;
  resolvedHomeTeam?: string;
  resolvedAwayTeam?: string;
}

/**
 * Try to match a Taiwan odds entry to an international game.
 * Enforces the two safety rules:
 *   - Time diff ≤ 6 hours
 *   - Team name similarity ≥ 85%
 */
export async function matchTaiwanToInternational(
  taiwan: TaiwanOddsPayload,
  international: {
    homeTeam: string;
    awayTeam: string;
    gameTime: string;
    league: League;
  }
): Promise<MatchResult> {
  // 1. Time guard
  if (!isWithinAllowedTimeDiff(international.gameTime, taiwan.gameTime)) {
    return {
      matched: false,
      similarity: 0,
      reason: "比賽時間差超過 6 小時，不允許自動配對",
    };
  }

  // 2. Resolve Chinese/abbreviated names to canonical English
  const league = international.league;
  const twHome = resolveTeamName(taiwan.homeTeam, league) ?? taiwan.homeTeam;
  const twAway = resolveTeamName(taiwan.awayTeam, league) ?? taiwan.awayTeam;

  const intHome = resolveTeamName(international.homeTeam, league) ?? international.homeTeam;
  const intAway = resolveTeamName(international.awayTeam, league) ?? international.awayTeam;

  const homeMatch = canAutoMatch(twHome, intHome);
  const awayMatch = canAutoMatch(twAway, intAway);

  if (!homeMatch || !awayMatch) {
    const { similarity: sim } = await import("./team-matcher");
    const minSimilarity = Math.min(
      sim(twHome, intHome),
      sim(twAway, intAway)
    );

    return {
      matched: false,
      similarity: minSimilarity,
      reason: `隊名相似度低於 85%（主隊: ${twHome} vs ${intHome}，客隊: ${twAway} vs ${intAway}）`,
    };
  }

  return {
    matched: true,
    similarity: 1,
    resolvedHomeTeam: intHome,
    resolvedAwayTeam: intAway,
  };
}
