/**
 * International odds fetcher.
 * Supports: The Odds API (primary), with hooks for OpticOdds.
 * All API keys must come from environment variables.
 */

import type { TheOddsApiGame, League, OddsSnapshot } from "@/types";

const THE_ODDS_API_BASE = "https://api.the-odds-api.com/v4";

const SPORT_KEYS: Record<League, string> = {
  NBA: "basketball_nba",
  MLB: "baseball_mlb",
};

// Bookmakers we care about — Pinnacle first (sharpest line)
const TARGET_BOOKMAKERS = [
  "pinnacle",
  "bet365",
  "betfair_ex_eu",
  "betfair",
  "sbobet",
  "draftkings",
  "fanduel",
  "williamhill_us",
];

export interface FetchOddsOptions {
  league: League;
  markets?: string;
  regions?: string;
}

/** Fetch live odds from The Odds API. Returns raw game objects. */
export async function fetchFromTheOddsApi(
  opts: FetchOddsOptions
): Promise<TheOddsApiGame[]> {
  const apiKey = process.env.THE_ODDS_API_KEY;
  if (!apiKey) {
    throw new Error("THE_ODDS_API_KEY is not set in environment variables");
  }

  const sportKey = SPORT_KEYS[opts.league];
  const markets = opts.markets ?? "h2h";
  const regions = opts.regions ?? "us,uk,eu,au";

  const url = new URL(`${THE_ODDS_API_BASE}/sports/${sportKey}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", regions);
  url.searchParams.set("markets", markets);
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("dateFormat", "iso");

  const res = await fetch(url.toString(), {
    next: { revalidate: 300 }, // cache 5 min in Next.js
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`The Odds API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<TheOddsApiGame[]>;
}

/** Convert The Odds API game data into OddsSnapshot rows. */
export function parseTheOddsApiResponse(
  games: TheOddsApiGame[],
  gameIdMap: Record<string, string> // externalId -> internal game UUID
): OddsSnapshot[] {
  const snapshots: OddsSnapshot[] = [];
  const now = new Date().toISOString();

  for (const game of games) {
    const gameId = gameIdMap[game.id];
    if (!gameId) continue;

    for (const bk of game.bookmakers) {
      if (!TARGET_BOOKMAKERS.includes(bk.key)) continue;

      for (const market of bk.markets) {
        if ((market.key as string) !== "h2h") continue; // moneyline only for v1

        const homeOutcome = market.outcomes.find(
          (o) => o.name === game.home_team
        );
        const awayOutcome = market.outcomes.find(
          (o) => o.name === game.away_team
        );

        if (!homeOutcome || !awayOutcome) continue;

        snapshots.push({
          id: crypto.randomUUID(),
          game_id: gameId,
          bookmaker: bk.key,
          market_type: "moneyline",
          home_odds: homeOutcome.price,
          away_odds: awayOutcome.price,
          draw_odds: null,
          line: null,
          snapshot_time: bk.last_update ?? now,
          source: "the-odds-api",
          raw_data: { bookmaker: bk.key, market },
          created_at: now,
        });
      }
    }
  }

  return snapshots;
}

// ── OpticOdds stub (implement when you have a key) ───────────────────────

export async function fetchFromOpticOdds(
  _opts: FetchOddsOptions
): Promise<TheOddsApiGame[]> {
  const apiKey = process.env.OPTIC_ODDS_API_KEY;
  if (!apiKey) {
    throw new Error("OPTIC_ODDS_API_KEY is not set — OpticOdds not configured");
  }
  // TODO: implement OpticOdds API integration
  // Their API format differs slightly; normalise to TheOddsApiGame shape here
  throw new Error("OpticOdds integration not yet implemented");
}

/** Select the sharpest available bookmakers for no-vig calculation. */
export function selectSharpBookmakers(
  snapshots: OddsSnapshot[]
): OddsSnapshot[] {
  const priority = ["pinnacle", "betfair_ex_eu", "betfair", "sbobet", "bet365"];
  const result: OddsSnapshot[] = [];

  for (const bk of priority) {
    const snap = snapshots.find((s) => s.bookmaker === bk);
    if (snap) result.push(snap);
    if (result.length >= 3) break; // top 3 sharp lines
  }

  // fallback: use whatever is available
  if (result.length === 0) return snapshots.slice(0, 3);
  return result;
}
