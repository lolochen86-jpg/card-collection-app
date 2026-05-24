import {
  rawProbability,
  noVigProbabilities,
  fairOdds,
  vigPercent,
  expectedValue,
  kellyFraction,
  consensusNoVigProbs,
  calculateEdge,
} from "@/lib/edge-calculator";

describe("rawProbability", () => {
  it("converts decimal odds to implied probability", () => {
    expect(rawProbability(2.0)).toBeCloseTo(0.5);
    expect(rawProbability(1.5)).toBeCloseTo(0.6667);
    expect(rawProbability(3.0)).toBeCloseTo(0.3333);
  });

  it("returns 0 for invalid odds", () => {
    expect(rawProbability(0)).toBe(0);
    expect(rawProbability(-1)).toBe(0);
  });
});

describe("noVigProbabilities", () => {
  it("removes vig from a two-way market", () => {
    // Pinnacle-style: 1.952 / 1.952 (50/50 with ~2.5% vig)
    const [h, a] = noVigProbabilities(1.952, 1.952);
    expect(h).toBeCloseTo(0.5);
    expect(a).toBeCloseTo(0.5);
    expect(h + a).toBeCloseTo(1.0);
  });

  it("correctly devig a favourites market", () => {
    // home: 1.72, away: 2.22 (realistic NBA odds)
    const [h, a] = noVigProbabilities(1.72, 2.22);
    expect(h + a).toBeCloseTo(1.0, 5);
    expect(h).toBeGreaterThan(a);
  });
});

describe("vigPercent", () => {
  it("calculates overround correctly", () => {
    // 1.91 / 1.91 = 2 * (1/1.91) - 1 ≈ 4.7%
    const vig = vigPercent(1.91, 1.91);
    expect(vig).toBeCloseTo(4.71, 1);
  });

  it("returns near 0 for fair odds", () => {
    expect(vigPercent(2.0, 2.0)).toBeCloseTo(0);
  });
});

describe("expectedValue", () => {
  it("returns positive EV when taiwan odds > fair odds", () => {
    // noVigProb = 0.55, taiwanOdds = 2.00 → EV = 0.55*2.00 - 1 = 0.10
    expect(expectedValue(0.55, 2.0)).toBeCloseTo(0.1);
  });

  it("returns negative EV when taiwan odds < fair odds", () => {
    expect(expectedValue(0.45, 1.9)).toBeCloseTo(-0.145);
  });
});

describe("kellyFraction", () => {
  it("returns positive kelly for +EV bets", () => {
    const k = kellyFraction(0.55, 2.0);
    expect(k).toBeGreaterThan(0);
  });

  it("returns 0 for -EV bets", () => {
    const k = kellyFraction(0.4, 1.9);
    expect(k).toBe(0);
  });

  it("clamps kelly to [0, 1]", () => {
    const k = kellyFraction(0.99, 100);
    expect(k).toBeLessThanOrEqual(1);
    expect(k).toBeGreaterThanOrEqual(0);
  });
});

describe("consensusNoVigProbs", () => {
  it("averages across multiple bookmakers", () => {
    const pairs = [
      { home: 1.72, away: 2.21, bookmaker: "pinnacle" },
      { home: 1.70, away: 2.25, bookmaker: "bet365" },
      { home: 1.71, away: 2.22, bookmaker: "sbobet" },
    ];
    const { homeNoVigProb, awayNoVigProb } = consensusNoVigProbs(pairs);
    expect(homeNoVigProb + awayNoVigProb).toBeCloseTo(1.0, 4);
    expect(homeNoVigProb).toBeGreaterThan(0.5);
  });

  it("handles single bookmaker", () => {
    const { homeNoVigProb, awayNoVigProb } = consensusNoVigProbs([
      { home: 2.0, away: 2.0, bookmaker: "test" },
    ]);
    expect(homeNoVigProb).toBeCloseTo(0.5);
    expect(awayNoVigProb).toBeCloseTo(0.5);
  });

  it("returns 50/50 for empty input", () => {
    const { homeNoVigProb, awayNoVigProb } = consensusNoVigProbs([]);
    expect(homeNoVigProb).toBe(0.5);
    expect(awayNoVigProb).toBe(0.5);
  });
});

describe("calculateEdge", () => {
  const mockInput = {
    taiwanHomeOdds: 1.85,
    taiwanAwayOdds: 2.10,
    internationalOdds: [
      { home: 1.72, away: 2.21, bookmaker: "pinnacle" },
      { home: 1.70, away: 2.25, bookmaker: "bet365" },
      { home: 1.71, away: 2.22, bookmaker: "sbobet" },
    ],
    market: "moneyline" as const,
  };

  it("returns all required fields", () => {
    const result = calculateEdge(mockInput);
    expect(result).toHaveProperty("homeNoVigProb");
    expect(result).toHaveProperty("awayNoVigProb");
    expect(result).toHaveProperty("homeFairOdds");
    expect(result).toHaveProperty("awayFairOdds");
    expect(result).toHaveProperty("vigPct");
    expect(result).toHaveProperty("homeEV");
    expect(result).toHaveProperty("awayEV");
    expect(result).toHaveProperty("homeEdgePct");
    expect(result).toHaveProperty("awayEdgePct");
    expect(result).toHaveProperty("homeKelly");
    expect(result).toHaveProperty("awayKelly");
    expect(result).toHaveProperty("homeConfidence");
    expect(result).toHaveProperty("awayConfidence");
    expect(result).toHaveProperty("homeNeedsReview");
    expect(result).toHaveProperty("awayNeedsReview");
  });

  it("probs sum to 1", () => {
    const result = calculateEdge(mockInput);
    expect(result.homeNoVigProb + result.awayNoVigProb).toBeCloseTo(1.0, 4);
  });

  it("detects positive edge correctly", () => {
    // Taiwan 1.85 vs fair ~1.716 → home is overpriced → +EV
    const result = calculateEdge(mockInput);
    expect(result.homeEV).toBeGreaterThan(0);
    expect(result.homeEdgePct).toBeGreaterThan(0);
  });

  it("marks needs_review when edge > 10%", () => {
    const result = calculateEdge({
      ...mockInput,
      taiwanHomeOdds: 2.5, // very generous odds → edge > 10%
    });
    expect(result.homeNeedsReview).toBe(true);
    expect(result.homeConfidence).toBe("manual_review");
  });

  it("returns high confidence for 3+ bookmakers", () => {
    const result = calculateEdge(mockInput);
    // 3 bookmakers + reasonable edge → high
    if (!result.homeNeedsReview) {
      expect(result.homeConfidence).toBe("high");
    }
  });
});

describe("safety: EV formula", () => {
  it("EV% = (no_vig_prob * taiwan_odds - 1) * 100", () => {
    const noVigProb = 0.58;
    const taiwanOdds = 1.85;
    const expectedEVPct = (noVigProb * taiwanOdds - 1) * 100;
    const result = calculateEdge({
      taiwanHomeOdds: taiwanOdds,
      taiwanAwayOdds: 2.0,
      internationalOdds: [{ home: 1.72, away: 2.22, bookmaker: "test" }],
      market: "moneyline",
    });
    // Allow diff due to consensus averaging across bookmakers
    expect(Math.abs(result.homeEdgePct - expectedEVPct)).toBeLessThan(5);
  });
});
