import type {
  ConfidenceLevel,
  EdgeCalculationInput,
  EdgeCalculationResult,
  OddsPair,
} from "@/types";

// ── Core formulae ─────────────────────────────────────────────────────────

/** Convert decimal odds to raw implied probability. */
export function rawProbability(decimalOdds: number): number {
  if (decimalOdds <= 0) return 0;
  return 1 / decimalOdds;
}

/**
 * Remove vig from a two-way market.
 * Returns [homeNoVig, awayNoVig] that sum to 1.
 */
export function noVigProbabilities(
  homeOdds: number,
  awayOdds: number
): [number, number] {
  const pHome = rawProbability(homeOdds);
  const pAway = rawProbability(awayOdds);
  const total = pHome + pAway;
  if (total === 0) return [0.5, 0.5];
  return [pHome / total, pAway / total];
}

/** Convert a no-vig probability back to fair decimal odds. */
export function fairOdds(noVigProb: number): number {
  if (noVigProb <= 0) return Infinity;
  return 1 / noVigProb;
}

/** Overround / vig percentage. */
export function vigPercent(homeOdds: number, awayOdds: number): number {
  const pHome = rawProbability(homeOdds);
  const pAway = rawProbability(awayOdds);
  return (pHome + pAway - 1) * 100;
}

/**
 * Expected Value as a decimal.
 * EV = noVigProb * taiwanOdds - 1
 * Positive EV → positive edge for the bettor.
 */
export function expectedValue(noVigProb: number, taiwanOdds: number): number {
  return noVigProb * taiwanOdds - 1;
}

/**
 * Kelly Criterion fraction.
 * Kelly = ((odds - 1) * p - (1 - p)) / (odds - 1)
 * Clamp to [0, 1]; negative Kelly means no bet.
 */
export function kellyFraction(
  noVigProb: number,
  taiwanOdds: number
): number {
  const b = taiwanOdds - 1; // net profit per unit staked
  if (b <= 0) return 0;
  const k = (b * noVigProb - (1 - noVigProb)) / b;
  return Math.max(0, Math.min(k, 1));
}

// ── Aggregate from multiple bookmakers ───────────────────────────────────

/**
 * Compute consensus no-vig probabilities by averaging across bookmakers.
 * Each bookmaker's pair is de-vigged individually, then averaged.
 */
export function consensusNoVigProbs(pairs: OddsPair[]): {
  homeNoVigProb: number;
  awayNoVigProb: number;
  vigPct: number;
} {
  if (pairs.length === 0) {
    return { homeNoVigProb: 0.5, awayNoVigProb: 0.5, vigPct: 0 };
  }

  let sumHome = 0;
  let sumAway = 0;
  let sumVig = 0;

  for (const { home, away } of pairs) {
    const [h, a] = noVigProbabilities(home, away);
    sumHome += h;
    sumAway += a;
    sumVig += vigPercent(home, away);
  }

  const n = pairs.length;
  return {
    homeNoVigProb: sumHome / n,
    awayNoVigProb: sumAway / n,
    vigPct: sumVig / n,
  };
}

// ── Confidence level ─────────────────────────────────────────────────────

function confidenceLevel(bookmakerCount: number, evPct: number): ConfidenceLevel {
  if (Math.abs(evPct) > 10) return "manual_review";
  if (bookmakerCount >= 3) return "high";
  if (bookmakerCount === 2) return "medium";
  return "low";
}

// ── Main calculation entry point ──────────────────────────────────────────

export function calculateEdge(
  input: EdgeCalculationInput
): EdgeCalculationResult {
  const { taiwanHomeOdds, taiwanAwayOdds, internationalOdds } = input;

  const { homeNoVigProb, awayNoVigProb, vigPct } =
    consensusNoVigProbs(internationalOdds);

  const homeFairOdds = fairOdds(homeNoVigProb);
  const awayFairOdds = fairOdds(awayNoVigProb);

  const homeEV = expectedValue(homeNoVigProb, taiwanHomeOdds);
  const awayEV = expectedValue(awayNoVigProb, taiwanAwayOdds);

  const homeEdgePct = homeEV * 100;
  const awayEdgePct = awayEV * 100;

  const homeKelly = kellyFraction(homeNoVigProb, taiwanHomeOdds);
  const awayKelly = kellyFraction(awayNoVigProb, taiwanAwayOdds);

  const n = internationalOdds.length;
  const homeConfidence = confidenceLevel(n, homeEdgePct);
  const awayConfidence = confidenceLevel(n, awayEdgePct);

  return {
    homeNoVigProb,
    awayNoVigProb,
    homeFairOdds,
    awayFairOdds,
    vigPct,
    homeEV,
    awayEV,
    homeEdgePct,
    awayEdgePct,
    homeKelly,
    awayKelly,
    homeConfidence,
    awayConfidence,
    homeNeedsReview: Math.abs(homeEdgePct) > 10,
    awayNeedsReview: Math.abs(awayEdgePct) > 10,
  };
}
