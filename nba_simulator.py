"""
NBA Monte Carlo simulation engine.

Model:
  Expected possessions  = avg(Pace_A, Pace_B)
  Expected pts_A        = possessions × (OffRtg_A/100) × (DefRtg_B / LgAvgDefRtg)
  Expected pts_B        = possessions × (OffRtg_B/100) × (DefRtg_A / LgAvgDefRtg)
  Noise                 = Normal(0, σ≈11) per team per game

Rationale for def_factor:
  DefRtg = pts allowed per 100 possessions; LOWER = better defence.
  factor = opponent_DefRtg / league_avg_DefRtg
  • opponent DefRtg 108 (elite D)  → factor 0.947 → we score ~5% less  ✓
  • opponent DefRtg 120 (bad D)    → factor 1.052 → we score ~5% more  ✓
"""

import numpy as np
from typing import Dict

LEAGUE_AVG_DEF_RTG: float = 115.0
SCORE_STD_DEV: float = 11.0          # empirical std-dev for single-game NBA scores
HOME_COURT_ADVANTAGE: float = 3.0    # pts added for home team
N_SIMULATIONS: int = 10_000


def simulate_nba(
    team_a: Dict,
    team_b: Dict,
    team_a_is_home: bool = True,
    n: int = N_SIMULATIONS,
    seed: int | None = None,
) -> Dict:
    """
    Run n Monte-Carlo games between team_a and team_b.

    Parameters
    ----------
    team_a, team_b : dicts with keys pace, off_rtg, def_rtg, name
    team_a_is_home : whether team_a has home-court advantage
    n               : number of simulations
    seed            : optional RNG seed for reproducibility

    Returns
    -------
    dict with win probabilities, expected scores, spread, raw score arrays
    """
    rng = np.random.default_rng(seed)

    possessions = (team_a["pace"] + team_b["pace"]) / 2.0

    def_factor_a = team_b["def_rtg"] / LEAGUE_AVG_DEF_RTG
    def_factor_b = team_a["def_rtg"] / LEAGUE_AVG_DEF_RTG

    mu_a = possessions * (team_a["off_rtg"] / 100.0) * def_factor_a
    mu_b = possessions * (team_b["off_rtg"] / 100.0) * def_factor_b

    # Home-court adjustment
    if team_a_is_home:
        mu_a += HOME_COURT_ADVANTAGE
    else:
        mu_b += HOME_COURT_ADVANTAGE

    scores_a = rng.normal(mu_a, SCORE_STD_DEV, n)
    scores_b = rng.normal(mu_b, SCORE_STD_DEV, n)

    diff = scores_a - scores_b
    a_wins = int(np.sum(diff > 0))
    b_wins = int(np.sum(diff < 0))
    # ties (essentially zero with normal dist, but handle for safety)
    ties = n - a_wins - b_wins

    win_prob_a = (a_wins + 0.5 * ties) / n
    win_prob_b = 1.0 - win_prob_a

    return {
        "team_a": team_a["name"],
        "team_b": team_b["name"],
        "win_prob_a": win_prob_a,
        "win_prob_b": win_prob_b,
        "expected_score_a": mu_a,
        "expected_score_b": mu_b,
        "spread": mu_a - mu_b,          # positive → A favoured
        "scores_a": scores_a,
        "scores_b": scores_b,
        "score_diff": diff,
        "n_simulations": n,
    }
