"""
賽事預測蒙地卡羅模擬器  ⚾🏀
Supports: MLB (Poisson runs model) · NBA (Normal score model)
Deploy: Streamlit Community Cloud  —  streamlit run app.py
"""

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from plotly.subplots import make_subplots

# ── local modules ────────────────────────────────────────────────────────────
from nba_fetcher import (
    LEAGUE_AVG_DEF_RTG,
    LEAGUE_AVG_OFF_RTG,
    LEAGUE_AVG_PACE,
    get_nba_team_stats,
    get_nba_teams,
)
from nba_simulator import simulate_nba
from mlb_fetcher import (
    LEAGUE_AVG_ERA,
    LEAGUE_AVG_RPG,
    get_mlb_teams,
    get_pitcher_stats,
    get_team_pitchers,
    get_team_season_stats,
    try_get_xfip,
)
from mlb_simulator import simulate_mlb
from team_names_zh import MLB_TEAMS_ZH, NBA_TEAMS_ZH, build_display_map, zh_label
from odds_fetcher import (
    NBA_SPORT_KEY,
    MLB_SPORT_KEY,
    get_live_odds,
    ev_pct,
)

# ── page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="蒙地卡羅賽事模擬器",
    page_icon="🎲",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── CSS: mobile-friendly ─────────────────────────────────────────────────────
st.markdown(
    """
    <style>
    .metric-box {
        background: #1e1e2e; border-radius: 12px; padding: 18px 12px;
        text-align: center; margin: 6px 0;
    }
    .team-name { font-size: 1.05rem; color: #cdd6f4; font-weight: 600; }
    .win-prob  { font-size: 2.4rem; font-weight: 800; color: #89b4fa; line-height: 1.1; }
    .fair-odds { font-size: 1.1rem; color: #a6e3a1; }
    .spread-tag{ font-size: 0.85rem; color: #f38ba8; }
    .section-header { font-size: 1.2rem; font-weight: 700; color: #cdd6f4;
                      border-left: 4px solid #89b4fa; padding-left: 10px; margin: 18px 0 8px; }
    @media (max-width: 640px) { .win-prob { font-size: 1.9rem; } }
    </style>
    """,
    unsafe_allow_html=True,
)

# ── helpers ──────────────────────────────────────────────────────────────────

def fair_odds(prob: float) -> str:
    """Convert win probability to decimal fair odds string."""
    if prob <= 0:
        return "∞"
    return f"{1 / prob:.3f}"


def american_odds(prob: float) -> str:
    """Convert probability to American-style moneyline."""
    if prob <= 0 or prob >= 1:
        return "N/A"
    if prob >= 0.5:
        return f"-{round((prob / (1 - prob)) * 100)}"
    return f"+{round(((1 - prob) / prob) * 100)}"


def _metric_card(team_name: str, win_prob: float, spread_label: str = "") -> str:
    return f"""
    <div class="metric-box">
      <div class="team-name">{team_name}</div>
      <div class="win-prob">{win_prob:.1%}</div>
      <div class="fair-odds">公平賠率 {fair_odds(win_prob)}（美式 {american_odds(win_prob)}）</div>
      {"<div class='spread-tag'>" + spread_label + "</div>" if spread_label else ""}
    </div>
    """


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  HEADER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
st.title("🎲 賽事預測蒙地卡羅模擬器")
st.caption("10,000 次模擬 · 真實 API 數據 · MLB ⚾ & NBA 🏀")

top_col1, top_col2 = st.columns([3, 1])
with top_col1:
    sport = st.radio("選擇運動", ["NBA 🏀", "MLB ⚾"], horizontal=True)
with top_col2:
    if st.button("🔄 強制更新數據", help="清除快取，重新從官方 API 抓取當日最新數據"):
        st.cache_data.clear()
        st.success("快取已清除！")
        st.rerun()

st.caption("📡 數據快取 10 分鐘自動更新；點上方按鈕可立即強制抓取當日最新數據（比賽結束後約數分鐘內 API 會更新）")

st.divider()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  NBA SECTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if sport == "NBA 🏀":
    st.markdown('<div class="section-header">球隊選擇</div>', unsafe_allow_html=True)

    try:
        with st.spinner("載入 NBA 球隊清單…"):
            team_names, team_dict = get_nba_teams()
    except Exception as e:
        st.error(f"無法載入 NBA 球隊清單：{e}")
        st.stop()

    col1, col2, col3 = st.columns([2, 1, 2])

    nba_display_map = build_display_map(team_names, NBA_TEAMS_ZH)
    display_names = list(nba_display_map.keys())

    default_home_disp = zh_label("Boston Celtics", NBA_TEAMS_ZH)
    default_away_disp = zh_label("Golden State Warriors", NBA_TEAMS_ZH)
    default_home_idx = display_names.index(default_home_disp) if default_home_disp in display_names else 0

    with col1:
        home_disp = st.selectbox("🏠 主場球隊", display_names, index=default_home_idx)
    home_team_name = nba_display_map[home_disp]
    home_team_zh = NBA_TEAMS_ZH.get(home_team_name, home_team_name)

    with col2:
        st.markdown("<br><div style='text-align:center;font-size:1.5rem;'>VS</div>", unsafe_allow_html=True)
    with col3:
        remaining = [d for d in display_names if d != home_disp]
        default_away_idx = remaining.index(default_away_disp) if default_away_disp in remaining else 0
        away_disp = st.selectbox("✈️ 客場球隊", remaining, index=default_away_idx)
    away_team_name = nba_display_map[away_disp]
    away_team_zh = NBA_TEAMS_ZH.get(away_team_name, away_team_name)

    n_sims = st.select_slider("模擬次數", options=[1_000, 5_000, 10_000, 50_000], value=10_000)

    run_btn = st.button("🚀 開始模擬", type="primary", use_container_width=True)

    if run_btn:
        if home_team_name == away_team_name:
            st.warning("主客場球隊不可相同")
            st.stop()

        with st.spinner(f"正在從 NBA API 抓取 {home_team_name} & {away_team_name} 的進階數據…"):
            try:
                home_stats = get_nba_team_stats(home_team_name)
                away_stats = get_nba_team_stats(away_team_name)
            except Exception as e:
                st.error(f"數據抓取失敗：{e}")
                st.stop()

        with st.spinner(f"執行 {n_sims:,} 次蒙地卡羅模擬…"):
            result = simulate_nba(home_stats, away_stats, team_a_is_home=True, n=n_sims)

        # ── Stats table ──────────────────────────────────────────────────
        st.markdown('<div class="section-header">球隊進階數據（本季）</div>', unsafe_allow_html=True)

        stats_df = pd.DataFrame(
            {
                "指標": ["Pace（每 48 分鐘回合數）", "進攻效率 OffRtg", "防守效率 DefRtg", "淨效率 NetRtg"],
                home_team_zh: [
                    f"{home_stats['pace']:.1f}",
                    f"{home_stats['off_rtg']:.1f}",
                    f"{home_stats['def_rtg']:.1f}",
                    f"{home_stats['net_rtg']:+.1f}",
                ],
                away_team_zh: [
                    f"{away_stats['pace']:.1f}",
                    f"{away_stats['off_rtg']:.1f}",
                    f"{away_stats['def_rtg']:.1f}",
                    f"{away_stats['net_rtg']:+.1f}",
                ],
                "聯盟平均": [
                    f"{LEAGUE_AVG_PACE:.1f}",
                    f"{LEAGUE_AVG_OFF_RTG:.1f}",
                    f"{LEAGUE_AVG_DEF_RTG:.1f}",
                    "0.0",
                ],
            }
        )
        st.dataframe(stats_df, use_container_width=True, hide_index=True)

        # ── Result cards ──────────────────────────────────────────────────
        st.markdown('<div class="section-header">模擬結果</div>', unsafe_allow_html=True)

        spread_val = result["spread"]
        spread_home = f"讓分 {spread_val:+.1f} 分（主場）" if abs(spread_val) > 0.1 else "預計平手"

        c1, c2 = st.columns(2)
        with c1:
            st.markdown(
                _metric_card(f"🏠 {home_team_zh}", result["win_prob_a"], spread_home),
                unsafe_allow_html=True,
            )
        with c2:
            st.markdown(
                _metric_card(f"✈️ {away_team_zh}", result["win_prob_b"]),
                unsafe_allow_html=True,
            )

        st.metric("預測比分", f"{result['expected_score_a']:.1f}  —  {result['expected_score_b']:.1f}")

        # ── Charts ──────────────────────────────────────────────────────
        fig = make_subplots(
            rows=1,
            cols=2,
            subplot_titles=("勝率分佈（圓餅圖）", "得分分佈直方圖"),
        )

        fig.add_trace(
            go.Pie(
                labels=[home_team_zh, away_team_zh],
                values=[result["win_prob_a"], result["win_prob_b"]],
                hole=0.45,
                marker_colors=["#89b4fa", "#f38ba8"],
                textinfo="label+percent",
                textfont_size=12,
            ),
            row=1,
            col=1,
        )

        # Histogram of score differences
        fig.add_trace(
            go.Histogram(
                x=result["score_diff"],
                xbins={"start": -60, "end": 60, "size": 2},
                name="得分差",
                marker_color="#a6e3a1",
                opacity=0.8,
            ),
            row=1,
            col=2,
        )
        fig.add_vline(x=0, line_dash="dash", line_color="#f38ba8", row=1, col=2)

        fig.update_layout(
            paper_bgcolor="#1e1e2e",
            plot_bgcolor="#1e1e2e",
            font_color="#cdd6f4",
            showlegend=False,
            height=380,
            margin={"t": 50, "b": 30, "l": 20, "r": 20},
        )
        fig.update_xaxes(
            title_text=f"{home_team_zh} 多 ← 分差 → {away_team_zh} 多",
            row=1,
            col=2,
            color="#cdd6f4",
        )
        st.plotly_chart(fig, use_container_width=True)

        # ── Margin distribution ───────────────────────────────────────────
        st.markdown('<div class="section-header">主場得失分分布</div>', unsafe_allow_html=True)
        st.caption(f"正數 = 主場（{home_team_zh}）贏幾分；負數 = 客場勝、主場輸幾分")

        margin_diff = result["score_diff"]
        margin_fig = go.Figure()
        margin_fig.add_trace(go.Histogram(
            x=margin_diff[margin_diff > 0],
            xbins={"start": 0, "end": int(margin_diff.max()) + 2, "size": 2},
            name=f"主場勝（{home_team_zh}）",
            marker_color="#89b4fa",
            opacity=0.85,
        ))
        margin_fig.add_trace(go.Histogram(
            x=margin_diff[margin_diff <= 0],
            xbins={"start": int(margin_diff.min()) - 2, "end": 0, "size": 2},
            name=f"客場勝（{away_team_zh}）",
            marker_color="#f38ba8",
            opacity=0.85,
        ))
        margin_fig.add_vline(x=0, line_dash="dash", line_color="#cdd6f4", line_width=1.5)
        margin_fig.update_layout(
            paper_bgcolor="#1e1e2e", plot_bgcolor="#1e1e2e", font_color="#cdd6f4",
            barmode="overlay", height=320,
            margin={"t": 20, "b": 50, "l": 20, "r": 20},
            legend={"font": {"color": "#cdd6f4"}},
        )
        margin_fig.update_xaxes(title_text=f"分差（+ = {home_team_zh} 贏，− = {away_team_zh} 贏）", color="#cdd6f4")
        margin_fig.update_yaxes(title_text="模擬場次", color="#cdd6f4")
        st.plotly_chart(margin_fig, use_container_width=True)

        # ── EV table ─────────────────────────────────────────────────────
        st.markdown('<div class="section-header">期望值參考（EV）</div>', unsafe_allow_html=True)
        st.caption(
            "將此公平賠率與博彩公司賠率比較：模型賠率 < 博彩賠率 → 存在正期望值（+EV）。"
        )

        with st.spinner("查詢即時博彩賠率…"):
            live = get_live_odds(NBA_SPORT_KEY, home_team_name, away_team_name)

        ev_data = {
            "球隊": [home_team_zh, away_team_zh],
            "勝率": [f"{result['win_prob_a']:.2%}", f"{result['win_prob_b']:.2%}"],
            "模型公平賠率": [fair_odds(result["win_prob_a"]), fair_odds(result["win_prob_b"])],
            "美式賠率": [american_odds(result["win_prob_a"]), american_odds(result["win_prob_b"])],
        }
        if live:
            ev_data["博彩最高賠率"] = [
                f"{live['best_home']:.3f}" if live["best_home"] else "—",
                f"{live['best_away']:.3f}" if live["best_away"] else "—",
            ]
            home_ev = ev_pct(result["win_prob_a"], live["best_home"])
            away_ev = ev_pct(result["win_prob_b"], live["best_away"])
            ev_data["EV%"] = [
                f"{home_ev:+.1%}" if home_ev is not None else "—",
                f"{away_ev:+.1%}" if away_ev is not None else "—",
            ]
        ev_df = pd.DataFrame(ev_data)
        st.dataframe(ev_df, use_container_width=True, hide_index=True)
        if not live:
            st.caption("💡 設定 ODDS_API_KEY 後可顯示即時博彩賠率與 EV% 分析")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  MLB SECTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
else:
    st.markdown('<div class="section-header">球隊選擇</div>', unsafe_allow_html=True)

    try:
        with st.spinner("載入 MLB 球隊清單…"):
            mlb_team_names, mlb_team_dict = get_mlb_teams()
    except Exception as e:
        st.error(f"無法載入 MLB 球隊清單：{e}")
        st.stop()

    col1, col2, col3 = st.columns([2, 1, 2])

    mlb_display_map = build_display_map(mlb_team_names, MLB_TEAMS_ZH)
    mlb_display_names = list(mlb_display_map.keys())

    default_home_disp = zh_label("New York Yankees", MLB_TEAMS_ZH)
    default_away_disp = zh_label("Los Angeles Dodgers", MLB_TEAMS_ZH)
    default_home_idx = mlb_display_names.index(default_home_disp) if default_home_disp in mlb_display_names else 0

    with col1:
        home_disp_mlb = st.selectbox("🏠 主場球隊", mlb_display_names, index=default_home_idx, key="mlb_home")
    home_team_mlb = mlb_display_map[home_disp_mlb]
    home_team_mlb_zh = MLB_TEAMS_ZH.get(home_team_mlb, home_team_mlb)

    with col2:
        st.markdown("<br><div style='text-align:center;font-size:1.5rem;'>VS</div>", unsafe_allow_html=True)
    with col3:
        remaining_mlb = [d for d in mlb_display_names if d != home_disp_mlb]
        default_away_idx = remaining_mlb.index(default_away_disp) if default_away_disp in remaining_mlb else 0
        away_disp_mlb = st.selectbox("✈️ 客場球隊", remaining_mlb, index=default_away_idx, key="mlb_away")
    away_team_mlb = mlb_display_map[away_disp_mlb]
    away_team_mlb_zh = MLB_TEAMS_ZH.get(away_team_mlb, away_team_mlb)

    home_id = mlb_team_dict[home_team_mlb]
    away_id = mlb_team_dict[away_team_mlb]

    # Pitcher selectors
    st.markdown('<div class="section-header">先發投手（選填）</div>', unsafe_allow_html=True)
    st.caption("留空則以球隊整體 ERA 作為投手能力參數。")

    pit_col1, pit_col2 = st.columns(2)

    with st.spinner("載入投手名單…"):
        home_pitchers = get_team_pitchers(home_id)
        away_pitchers = get_team_pitchers(away_id)

    def pitcher_options(pitchers):
        opts = {"（使用球隊 ERA）": None}
        for p in pitchers:
            opts[p["name"]] = p["id"]
        return opts

    home_pit_opts = pitcher_options(home_pitchers)
    away_pit_opts = pitcher_options(away_pitchers)

    with pit_col1:
        home_pit_sel = st.selectbox(f"{home_team_mlb_zh} 先發投手", list(home_pit_opts.keys()), key="hp")
    with pit_col2:
        away_pit_sel = st.selectbox(f"{away_team_mlb_zh} 先發投手", list(away_pit_opts.keys()), key="ap")

    fetch_xfip = st.checkbox("嘗試從 Fangraphs 獲取 xFIP（較慢，需 pybaseball）", value=False)
    n_sims_mlb = st.select_slider("模擬次數 ", options=[1_000, 5_000, 10_000, 50_000], value=10_000)

    run_mlb = st.button("🚀 開始模擬", type="primary", use_container_width=True, key="run_mlb")

    if run_mlb:
        if home_team_mlb == away_team_mlb:
            st.warning("主客場球隊不可相同")
            st.stop()

        with st.spinner("抓取球隊本季數據…"):
            home_s = get_team_season_stats(home_id)
            away_s = get_team_season_stats(away_id)
            home_s["name"] = home_team_mlb
            away_s["name"] = away_team_mlb

        # Pitcher ERA
        home_pit_id = home_pit_opts[home_pit_sel]
        away_pit_id = away_pit_opts[away_pit_sel]

        home_pit_stats = get_pitcher_stats(home_pit_id) if home_pit_id else {"era": home_s["era"]}
        away_pit_stats = get_pitcher_stats(away_pit_id) if away_pit_id else {"era": away_s["era"]}

        home_pit_era = home_pit_stats["era"]
        away_pit_era = away_pit_stats["era"]

        # Optional xFIP override
        if fetch_xfip and home_pit_sel != "（使用球隊 ERA）":
            with st.spinner("從 Fangraphs 抓取 xFIP…"):
                xfip = try_get_xfip(home_pit_sel)
                if xfip:
                    home_pit_era = xfip
                    st.info(f"{home_pit_sel} xFIP = {xfip:.2f}（已取代 ERA 作為輸入）")

        if fetch_xfip and away_pit_sel != "（使用球隊 ERA）":
            with st.spinner("從 Fangraphs 抓取 xFIP…"):
                xfip = try_get_xfip(away_pit_sel)
                if xfip:
                    away_pit_era = xfip
                    st.info(f"{away_pit_sel} xFIP = {xfip:.2f}（已取代 ERA 作為輸入）")

        with st.spinner(f"執行 {n_sims_mlb:,} 場 9 局泊松模擬…"):
            result = simulate_mlb(
                home_s, away_s,
                home_pitcher_era=home_pit_era,
                away_pitcher_era=away_pit_era,
                n=n_sims_mlb,
            )

        # ── Stats table ──────────────────────────────────────────────────
        st.markdown('<div class="section-header">球隊本季數據</div>', unsafe_allow_html=True)

        home_pit_label = home_pit_sel if home_pit_sel != "（使用球隊 ERA）" else "（球隊整體）"
        away_pit_label = away_pit_sel if away_pit_sel != "（使用球隊 ERA）" else "（球隊整體）"

        mlb_stats_df = pd.DataFrame(
            {
                "指標": ["每場得分 RPG", "打擊率 AVG", "長打率+上壘率 OPS", "球隊 ERA", "先發投手 ERA", "WHIP"],
                home_team_mlb_zh: [
                    f"{home_s['runs_per_game']:.2f}",
                    f"{home_s['avg']:.3f}",
                    f"{home_s['ops']:.3f}",
                    f"{home_s['era']:.2f}",
                    f"{home_pit_era:.2f} {home_pit_label}",
                    f"{home_s['whip']:.2f}",
                ],
                away_team_mlb_zh: [
                    f"{away_s['runs_per_game']:.2f}",
                    f"{away_s['avg']:.3f}",
                    f"{away_s['ops']:.3f}",
                    f"{away_s['era']:.2f}",
                    f"{away_pit_era:.2f} {away_pit_label}",
                    f"{away_s['whip']:.2f}",
                ],
                "聯盟平均": [
                    f"{LEAGUE_AVG_RPG:.2f}",
                    "—", "—",
                    f"{LEAGUE_AVG_ERA:.2f}",
                    "—", "—",
                ],
            }
        )
        st.dataframe(mlb_stats_df, use_container_width=True, hide_index=True)

        # ── Result cards ──────────────────────────────────────────────────
        st.markdown('<div class="section-header">模擬結果</div>', unsafe_allow_html=True)

        c1, c2 = st.columns(2)
        with c1:
            st.markdown(
                _metric_card(f"🏠 {home_team_mlb_zh}", result["win_prob_home"]),
                unsafe_allow_html=True,
            )
        with c2:
            st.markdown(
                _metric_card(f"✈️ {away_team_mlb_zh}", result["win_prob_away"]),
                unsafe_allow_html=True,
            )

        st.metric(
            "預期得分",
            f"{result['lambda_home']:.2f}  —  {result['lambda_away']:.2f}",
            help="泊松分佈 λ 值（各隊預期得分）",
        )

        # ── Charts ──────────────────────────────────────────────────────
        home_runs_arr = result["home_runs"]
        away_runs_arr = result["away_runs"]
        max_runs = int(max(home_runs_arr.max(), away_runs_arr.max())) + 1

        fig = make_subplots(
            rows=1,
            cols=2,
            subplot_titles=("勝率圓餅圖", "得分分佈直方圖"),
        )

        fig.add_trace(
            go.Pie(
                labels=[home_team_mlb_zh, away_team_mlb_zh],
                values=[result["win_prob_home"], result["win_prob_away"]],
                hole=0.45,
                marker_colors=["#89b4fa", "#f38ba8"],
                textinfo="label+percent",
            ),
            row=1, col=1,
        )

        fig.add_trace(
            go.Histogram(
                x=home_runs_arr,
                xbins={"start": 0, "end": max_runs, "size": 1},
                name=home_team_mlb_zh,
                marker_color="#89b4fa",
                opacity=0.7,
            ),
            row=1, col=2,
        )
        fig.add_trace(
            go.Histogram(
                x=away_runs_arr,
                xbins={"start": 0, "end": max_runs, "size": 1},
                name=away_team_mlb_zh,
                marker_color="#f38ba8",
                opacity=0.7,
            ),
            row=1, col=2,
        )

        fig.update_layout(
            paper_bgcolor="#1e1e2e",
            plot_bgcolor="#1e1e2e",
            font_color="#cdd6f4",
            barmode="overlay",
            showlegend=True,
            legend={"font": {"color": "#cdd6f4"}},
            height=380,
            margin={"t": 50, "b": 30, "l": 20, "r": 20},
        )
        fig.update_xaxes(title_text="得分（分）", row=1, col=2, color="#cdd6f4")
        st.plotly_chart(fig, use_container_width=True)

        # ── Margin distribution ───────────────────────────────────────────
        st.markdown('<div class="section-header">主場得失分分布</div>', unsafe_allow_html=True)
        st.caption(f"正數 = 主場（{home_team_mlb_zh}）贏幾分；負數 = 客場勝、主場輸幾分")

        mlb_margin = result["home_runs"] - result["away_runs"]
        mlb_margin_fig = go.Figure()
        mlb_margin_fig.add_trace(go.Histogram(
            x=mlb_margin[mlb_margin > 0],
            xbins={"start": 0, "end": int(mlb_margin.max()) + 1, "size": 1},
            name=f"主場勝（{home_team_mlb_zh}）",
            marker_color="#89b4fa",
            opacity=0.85,
        ))
        mlb_margin_fig.add_trace(go.Histogram(
            x=mlb_margin[mlb_margin <= 0],
            xbins={"start": int(mlb_margin.min()) - 1, "end": 0, "size": 1},
            name=f"客場勝（{away_team_mlb_zh}）",
            marker_color="#f38ba8",
            opacity=0.85,
        ))
        mlb_margin_fig.add_vline(x=0, line_dash="dash", line_color="#cdd6f4", line_width=1.5)
        mlb_margin_fig.update_layout(
            paper_bgcolor="#1e1e2e", plot_bgcolor="#1e1e2e", font_color="#cdd6f4",
            barmode="overlay", height=320,
            margin={"t": 20, "b": 50, "l": 20, "r": 20},
            legend={"font": {"color": "#cdd6f4"}},
        )
        mlb_margin_fig.update_xaxes(title_text=f"分差（+ = {home_team_mlb_zh} 贏，− = {away_team_mlb_zh} 贏）", color="#cdd6f4")
        mlb_margin_fig.update_yaxes(title_text="模擬場次", color="#cdd6f4")
        st.plotly_chart(mlb_margin_fig, use_container_width=True)

        # ── EV table ─────────────────────────────────────────────────────
        st.markdown('<div class="section-header">期望值參考（EV）</div>', unsafe_allow_html=True)
        st.caption(
            "將此公平賠率與博彩公司賠率比較：模型賠率 < 博彩賠率 → 存在正期望值（+EV）。"
        )

        with st.spinner("查詢即時博彩賠率…"):
            live_mlb = get_live_odds(MLB_SPORT_KEY, home_team_mlb, away_team_mlb)

        mlb_ev_data = {
            "球隊": [home_team_mlb_zh, away_team_mlb_zh],
            "勝率": [f"{result['win_prob_home']:.2%}", f"{result['win_prob_away']:.2%}"],
            "模型公平賠率": [
                fair_odds(result["win_prob_home"]),
                fair_odds(result["win_prob_away"]),
            ],
            "美式賠率": [
                american_odds(result["win_prob_home"]),
                american_odds(result["win_prob_away"]),
            ],
        }
        if live_mlb:
            mlb_ev_data["博彩最高賠率"] = [
                f"{live_mlb['best_home']:.3f}" if live_mlb["best_home"] else "—",
                f"{live_mlb['best_away']:.3f}" if live_mlb["best_away"] else "—",
            ]
            home_ev = ev_pct(result["win_prob_home"], live_mlb["best_home"])
            away_ev = ev_pct(result["win_prob_away"], live_mlb["best_away"])
            mlb_ev_data["EV%"] = [
                f"{home_ev:+.1%}" if home_ev is not None else "—",
                f"{away_ev:+.1%}" if away_ev is not None else "—",
            ]
        ev_df = pd.DataFrame(mlb_ev_data)
        st.dataframe(ev_df, use_container_width=True, hide_index=True)
        if not live_mlb:
            st.caption("💡 設定 ODDS_API_KEY 後可顯示即時博彩賠率與 EV% 分析")

# ── footer ───────────────────────────────────────────────────────────────────
st.divider()
st.caption(
    "數據來源：NBA Advanced Stats API（nba_api）· MLB Stats API（mlb-statsapi）"
    " · Fangraphs（pybaseball，選填）｜本工具僅供學術研究，不構成投注建議。"
)
