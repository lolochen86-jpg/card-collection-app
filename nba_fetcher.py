"""
NBA data fetcher — uses nba_api to pull live Advanced Stats
(Pace, OffRtg, DefRtg) for the current season.
"""
import time
import pandas as pd
import streamlit as st
from typing import Dict, List, Tuple

try:
    from nba_api.stats.endpoints import leaguedashteamstats
    from nba_api.stats.static import teams as nba_teams_static
    NBA_API_AVAILABLE = True
except ImportError:
    NBA_API_AVAILABLE = False

NBA_SEASON = "2024-25"
LEAGUE_AVG_PACE: float = 99.2
LEAGUE_AVG_OFF_RTG: float = 114.1
LEAGUE_AVG_DEF_RTG: float = 114.1


@st.cache_data(ttl=86400, show_spinner=False)
def get_nba_teams() -> Tuple[List[str], Dict[str, int]]:
    if not NBA_API_AVAILABLE:
        raise RuntimeError("nba_api 套件未安裝，請執行 pip install nba_api")
    all_teams = nba_teams_static.get_teams()
    team_dict = {t["full_name"]: t["id"] for t in all_teams}
    return sorted(team_dict.keys()), team_dict


@st.cache_data(ttl=600, show_spinner=False)  # 10 分鐘快取，每天比賽結束後可拿到當日最新數據
def _fetch_league_advanced_stats(season: str = NBA_SEASON) -> pd.DataFrame:
    """Fetch ALL teams' Advanced Stats for the season (cached 1 hr)."""
    if not NBA_API_AVAILABLE:
        raise RuntimeError("nba_api 套件未安裝")
    time.sleep(0.6)  # respect NBA API rate-limit
    # NBA Stats API rejects requests without browser-like headers
    _NBA_HEADERS = {
        "Host": "stats.nba.com",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "x-nba-stats-origin": "stats",
        "x-nba-stats-token": "true",
        "Referer": "https://stats.nba.com/",
        "Connection": "keep-alive",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
    }
    try:
        endpoint = leaguedashteamstats.LeagueDashTeamStats(
            season=season,
            measure_type_detailed_defense="Advanced",
            per_mode_simple="PerGame",
            season_type_all_star="Regular Season",
            timeout=30,
            headers=_NBA_HEADERS,
        )
        df = endpoint.get_data_frames()[0]
        if df.empty:
            raise ValueError("API 回傳空資料，請確認賽季字串格式（如 '2024-25'）")
        return df
    except Exception as exc:
        raise RuntimeError(f"NBA API 請求失敗：{exc}") from exc


def get_nba_team_stats(team_name: str, season: str = NBA_SEASON) -> Dict:
    """Return a stats dict for a single team."""
    df = _fetch_league_advanced_stats(season)
    row = df[df["TEAM_NAME"] == team_name]
    if row.empty:
        raise ValueError(f"找不到球隊：{team_name}")
    return {
        "name": team_name,
        "pace": float(row["PACE"].values[0]),
        "off_rtg": float(row["OFF_RATING"].values[0]),
        "def_rtg": float(row["DEF_RATING"].values[0]),
        "net_rtg": float(row["NET_RATING"].values[0]),
        "ts_pct": float(row["TS_PCT"].values[0]),
        "efg_pct": float(row["EFG_PCT"].values[0]),
    }
