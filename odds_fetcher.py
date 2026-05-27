"""
Real bookmaker odds via The Odds API (https://the-odds-api.com).
Free tier: 500 requests/month.
API key stored in Streamlit secrets as ODDS_API_KEY.
"""
import requests
import streamlit as st
from typing import Dict, List, Optional, Tuple

ODDS_API_BASE = "https://api.the-odds-api.com/v4"
NBA_SPORT_KEY = "basketball_nba"
MLB_SPORT_KEY = "baseball_mlb"


def _api_key() -> Optional[str]:
    try:
        return st.secrets["ODDS_API_KEY"]
    except (KeyError, FileNotFoundError, AttributeError):
        return None


def _name_matches(api_name: str, local_name: str) -> bool:
    """Fuzzy match: check if key words overlap (handles LA vs Los Angeles etc.)."""
    a = set(api_name.lower().split())
    b = set(local_name.lower().split())
    return len(a & b) >= 2 or api_name.lower() == local_name.lower()


@st.cache_data(ttl=300, show_spinner=False)
def get_live_odds(
    sport_key: str, home_team: str, away_team: str
) -> Optional[Dict]:
    """
    Fetch h2h (moneyline) decimal odds for a specific matchup.
    Returns None when API key is absent, game not found, or request fails.
    """
    key = _api_key()
    if not key:
        return None

    try:
        resp = requests.get(
            f"{ODDS_API_BASE}/sports/{sport_key}/odds/",
            params={
                "apiKey": key,
                "regions": "us",
                "markets": "h2h",
                "oddsFormat": "decimal",
            },
            timeout=10,
        )
        if resp.status_code == 401:
            st.warning("Odds API 金鑰無效，請至 Streamlit Secrets 確認 ODDS_API_KEY。")
            return None
        if resp.status_code != 200:
            return None

        for game in resp.json():
            gh = game.get("home_team", "")
            ga = game.get("away_team", "")
            if _name_matches(gh, home_team) and _name_matches(ga, away_team):
                return _parse_game(game, home_team, away_team)
            if _name_matches(gh, away_team) and _name_matches(ga, home_team):
                # API home/away flipped vs. user selection
                return _parse_game(game, away_team, home_team, flipped=True)

    except Exception:
        return None
    return None


def _parse_game(
    game: Dict, home_team: str, away_team: str, flipped: bool = False
) -> Dict:
    """Extract per-bookmaker odds and compute best available price."""
    home_odds: List[Tuple[str, float]] = []
    away_odds: List[Tuple[str, float]] = []

    api_home = game.get("home_team", "")
    api_away = game.get("away_team", "")

    for bm in game.get("bookmakers", []):
        for market in bm.get("markets", []):
            if market["key"] != "h2h":
                continue
            for outcome in market.get("outcomes", []):
                name, price = outcome["name"], float(outcome["price"])
                if _name_matches(name, home_team if not flipped else away_team):
                    home_odds.append((bm["title"], price))
                elif _name_matches(name, away_team if not flipped else home_team):
                    away_odds.append((bm["title"], price))

    best_home = max((p for _, p in home_odds), default=None)
    best_away = max((p for _, p in away_odds), default=None)

    return {
        "home_team": home_team,
        "away_team": away_team,
        "home_odds": home_odds,
        "away_odds": away_odds,
        "best_home": best_home,
        "best_away": best_away,
        "commence_time": game.get("commence_time", ""),
    }


def ev_pct(win_prob: float, decimal_odds: Optional[float]) -> Optional[float]:
    """EV% = win_prob × decimal_odds − 1. Positive → +EV bet."""
    if decimal_odds is None or decimal_odds <= 1:
        return None
    return win_prob * decimal_odds - 1
