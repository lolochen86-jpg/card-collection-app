"""
MLB Monte Carlo simulation engine — Poisson run model.

Model per game:
  λ_home = home_rpg × (LgAvgERA / away_pitcher_era) × HOME_FACTOR
  λ_away = away_rpg × (LgAvgERA / home_pitcher_era)

  home_runs ~ Poisson(λ_home)  (9-inning total)
  away_runs ~ Poisson(λ_away)

  If tied after 9 innings → 50/50 extra-inning coin-flip (simplified).

Bounds: λ is clamped to [1.5, 8.0] to avoid degenerate inputs.
"""

import numpy as np
from typing import Dict

LEAGUE_AVG_ERA: float = 4.20
HOME_FIELD_FACTOR: float = 1.04    # ~4 % run boost for home team
LAMBDA_MIN: float = 1.5
LAMBDA_MAX: float = 8.0
N_SIMULATIONS: int = 10_000


def _clamp_lambda(value: float) -> float:
    return float(np.clip(value, LAMBDA_MIN, LAMBDA_MAX))


def simulate_mlb(
    home_team: Dict,
    away_team: Dict,
    home_pitcher_era: float = LEAGUE_AVG_ERA,
    away_pitcher_era: float = LEAGUE_AVG_ERA,
    n: int = N_SIMULATIONS,
    seed: int | None = None,
) -> Dict:
    """
    Run n Poisson-based MLB game simulations.

    Parameters
    ----------
    home_team, away_team : dicts with keys name, runs_per_game, era
    home_pitcher_era     : starting pitcher ERA for the home team
    away_pitcher_era     : starting pitcher ERA for the away team
    n                    : simulations
    seed                 : optional RNG seed

    Returns
    -------
    dict with win probabilities, expected runs, raw arrays
    """
    rng = np.random.default_rng(seed)

    # Expected runs this game
    lambda_home = _clamp_lambda(
        home_team["runs_per_game"]
        * (LEAGUE_AVG_ERA / max(away_pitcher_era, 0.5))
        * HOME_FIELD_FACTOR
    )
    lambda_away = _clamp_lambda(
        away_team["runs_per_game"]
        * (LEAGUE_AVG_ERA / max(home_pitcher_era, 0.5))
    )

    home_runs = rng.poisson(lambda_home, n).astype(float)
    away_runs = rng.poisson(lambda_away, n).astype(float)

    # Resolve ties: fair coin for extra innings
    tied = home_runs == away_runs
    n_ties = int(np.sum(tied))
    if n_ties:
        extra_flip = rng.integers(0, 2, n_ties)          # 0 = home wins, 1 = away wins
        home_runs[tied] += extra_flip == 0
        away_runs[tied] += extra_flip == 1

    home_wins = int(np.sum(home_runs > away_runs))
    away_wins = n - home_wins

    win_prob_home = home_wins / n
    win_prob_away = away_wins / n

    return {
        "home_team": home_team["name"],
        "away_team": away_team["name"],
        "win_prob_home": win_prob_home,
        "win_prob_away": win_prob_away,
        "lambda_home": lambda_home,
        "lambda_away": lambda_away,
        "home_runs": home_runs,
        "away_runs": away_runs,
        "n_simulations": n,
    }
