"""
MLB data fetcher — uses mlb-statsapi (public MLB Stats API)
for team batting/pitching stats and individual pitcher ERA.
Optional xFIP enrichment via pybaseball (Fangraphs scraper).
"""
import statsapi
import streamlit as st
from typing import Dict, List, Optional, Tuple

MLB_SEASON = 2025
LEAGUE_AVG_ERA: float = 4.20
LEAGUE_AVG_RPG: float = 4.50

# ---------- helpers ---------------------------------------------------------

def _parse_float(value, default: float = 0.0) -> float:
    """Safely parse MLB API string stats like '.265' or '3.85'."""
    if value is None:
        return default
    s = str(value).strip()
    if not s or s in ("-", "--", "-.--"):
        return default
    if s.startswith("."):
        s = "0" + s
    try:
        return float(s)
    except ValueError:
        return default


# ---------- teams -----------------------------------------------------------

@st.cache_data(ttl=600, show_spinner=False)
def get_mlb_teams() -> Tuple[List[str], Dict[str, int]]:
    """Return sorted team names and {name: id} mapping."""
    data = statsapi.get("teams", {"sportId": 1, "activeStatus": "Yes"})
    team_dict: Dict[str, int] = {}
    for t in data.get("teams", []):
        if t.get("sport", {}).get("id") == 1:
            team_dict[t["name"]] = t["id"]
    if not team_dict:
        raise RuntimeError("無法獲取 MLB 球隊清單，請檢查網路連線")
    return sorted(team_dict.keys()), team_dict


# ---------- team season stats -----------------------------------------------

@st.cache_data(ttl=600, show_spinner=False)
def get_team_season_stats(team_id: int, season: int = MLB_SEASON) -> Dict:
    """
    Returns combined hitting + pitching season stats for the team.
    Falls back to league-average values on any error.
    """
    result = {
        "games_played": 0,
        "runs_per_game": LEAGUE_AVG_RPG,
        "ops": 0.720,
        "avg": 0.250,
        "era": LEAGUE_AVG_ERA,
        "whip": 1.30,
    }

    # --- hitting ---
    try:
        hit_data = statsapi.get(
            "team_stats",
            {"teamId": team_id, "stats": "season", "group": "hitting", "season": season},
        )
        splits = hit_data.get("stats", [{}])[0].get("splits", [])
        if splits:
            s = splits[0]["stat"]
            gp = int(s.get("gamesPlayed", 1)) or 1
            runs = int(s.get("runs", 0))
            result["games_played"] = gp
            result["runs_per_game"] = runs / gp
            result["ops"] = _parse_float(s.get("ops"), 0.720)
            result["avg"] = _parse_float(s.get("avg"), 0.250)
    except Exception:
        pass  # keep defaults

    # --- pitching ---
    try:
        pit_data = statsapi.get(
            "team_stats",
            {"teamId": team_id, "stats": "season", "group": "pitching", "season": season},
        )
        splits = pit_data.get("stats", [{}])[0].get("splits", [])
        if splits:
            s = splits[0]["stat"]
            result["era"] = _parse_float(s.get("era"), LEAGUE_AVG_ERA)
            result["whip"] = _parse_float(s.get("whip"), 1.30)
    except Exception:
        pass  # keep defaults

    return result


# ---------- roster + pitcher stats ------------------------------------------

@st.cache_data(ttl=600, show_spinner=False)
def get_team_pitchers(team_id: int) -> List[Dict]:
    """Return list of active pitchers: [{id, name, position}, ...]."""
    try:
        data = statsapi.get("roster", {"teamId": team_id, "rosterType": "active"})
        pitchers = []
        for player in data.get("roster", []):
            if player.get("position", {}).get("type") == "Pitcher":
                pitchers.append(
                    {
                        "id": player["person"]["id"],
                        "name": player["person"]["fullName"],
                        "abbreviation": player["position"].get("abbreviation", "P"),
                    }
                )
        return sorted(pitchers, key=lambda p: p["name"])
    except Exception:
        return []


@st.cache_data(ttl=600, show_spinner=False)
def get_pitcher_stats(pitcher_id: int, season: int = MLB_SEASON) -> Dict:
    """Return ERA, WHIP, K/9, BB/9 for a specific pitcher."""
    defaults = {"era": LEAGUE_AVG_ERA, "whip": 1.30, "k9": 8.5, "bb9": 3.0, "innings": 0.0}
    try:
        data = statsapi.get(
            "person_stats",
            {"personId": pitcher_id, "stats": "season", "group": "pitching", "season": season},
        )
        for group in data.get("stats", []):
            splits = group.get("splits", [])
            if not splits:
                continue
            s = splits[0]["stat"]
            return {
                "era": _parse_float(s.get("era"), LEAGUE_AVG_ERA),
                "whip": _parse_float(s.get("whip"), 1.30),
                "k9": _parse_float(s.get("strikeoutsPer9Inn"), 8.5),
                "bb9": _parse_float(s.get("walksPer9Inn"), 3.0),
                "innings": _parse_float(s.get("inningsPitched"), 0.0),
            }
    except Exception:
        pass
    return defaults


# ---------- optional xFIP from pybaseball ------------------------------------

def try_get_xfip(pitcher_name: str, season: int = MLB_SEASON) -> Optional[float]:
    """
    Attempt to fetch xFIP from Fangraphs via pybaseball.
    Returns None if unavailable (slow network, package missing, player not found).
    """
    try:
        from pybaseball import pitching_stats  # type: ignore

        df = pitching_stats(season, qual=20)
        last = pitcher_name.split()[-1]
        mask = df["Name"].str.contains(last, case=False, na=False)
        if mask.any() and "xFIP" in df.columns:
            return float(df[mask].iloc[0]["xFIP"])
    except Exception:
        pass
    return None
