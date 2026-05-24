"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { DashboardRow, League } from "@/types";
import { Header } from "./Header";
import { GameCard } from "./GameCard";
import { EdgeTable } from "./EdgeTable";
import { TaiwanOddsModal } from "./TaiwanOddsModal";
import { StatsCard } from "./StatsCard";
import { LoadingSpinner } from "./LoadingSpinner";
import { clsx } from "clsx";

type ViewMode = "cards" | "table";

type SortKey = "gameTime" | "evPct" | "league";
type FilterLeague = League | "ALL";

function buildStats(rows: DashboardRow[]) {
  const total = rows.length;
  const positiveEdge = rows.filter(
    (r) => (r.homeSignal?.ev_pct ?? 0) > 0 || (r.awaySignal?.ev_pct ?? 0) > 0
  ).length;
  const needsReview = rows.filter(
    (r) => r.homeSignal?.needs_review || r.awaySignal?.needs_review
  ).length;

  // Best EV across all signals
  let bestEV = -Infinity;
  let bestLabel = "—";
  for (const r of rows) {
    for (const sig of [r.homeSignal, r.awaySignal]) {
      if (!sig) continue;
      if (sig.ev_pct > bestEV) {
        bestEV = sig.ev_pct;
        const side = sig.side === "home" ? r.game.home_team_zh ?? r.game.home_team : r.game.away_team_zh ?? r.game.away_team;
        bestLabel = side;
      }
    }
  }

  return { total, positiveEdge, needsReview, bestEV, bestLabel };
}

function sortRows(rows: DashboardRow[], key: SortKey): DashboardRow[] {
  return [...rows].sort((a, b) => {
    if (key === "gameTime") {
      return (
        new Date(a.game.game_time).getTime() -
        new Date(b.game.game_time).getTime()
      );
    }
    if (key === "evPct") {
      const aEV = Math.max(a.homeSignal?.ev_pct ?? -Infinity, a.awaySignal?.ev_pct ?? -Infinity);
      const bEV = Math.max(b.homeSignal?.ev_pct ?? -Infinity, b.awaySignal?.ev_pct ?? -Infinity);
      return bEV - aEV; // desc
    }
    if (key === "league") {
      return a.game.league.localeCompare(b.game.league);
    }
    return 0;
  });
}

export function Dashboard() {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [league, setLeague] = useState<FilterLeague>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("gameTime");
  const [showPositiveOnly, setShowPositiveOnly] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dataSource, setDataSource] = useState<"mock" | "supabase" | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showImport, setShowImport] = useState(false);

  const fetchData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (league !== "ALL") params.set("league", league);

        const res = await fetch(`/api/games?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        setRows(json.data ?? []);
        setDataSource(json.source);
        setLastUpdated(new Date().toISOString());
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [league]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  let filtered = rows;
  if (showPositiveOnly) {
    filtered = filtered.filter(
      (r) => (r.homeSignal?.ev_pct ?? 0) > 0 || (r.awaySignal?.ev_pct ?? 0) > 0
    );
  }
  const sorted = sortRows(filtered, sortKey);
  const stats = buildStats(rows);

  return (
    <div className="min-h-screen bg-surface text-white flex flex-col">
      <Header
        onRefresh={() => fetchData(true)}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
      />

      <main className="flex-1 p-4 max-w-7xl mx-auto w-full space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatsCard
            label="比賽場次"
            value={stats.total}
            sub="今日"
          />
          <StatsCard
            label="正 EV 機會"
            value={stats.positiveEdge}
            sub={`共 ${stats.total} 場`}
            highlight={stats.positiveEdge > 0 ? "green" : "none"}
          />
          <StatsCard
            label="需人工確認"
            value={stats.needsReview}
            sub="Edge > 10%"
            highlight={stats.needsReview > 0 ? "yellow" : "none"}
          />
          <StatsCard
            label="最佳 EV"
            value={
              stats.bestEV !== -Infinity
                ? `${stats.bestEV > 0 ? "+" : ""}${stats.bestEV.toFixed(1)}%`
                : "—"
            }
            sub={stats.bestLabel}
            highlight={
              stats.bestEV > 5
                ? "green"
                : stats.bestEV > 0
                ? "blue"
                : "none"
            }
          />
        </div>

        {/* Data source notice */}
        {dataSource === "mock" && (
          <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              目前顯示模擬資料（Mock）。設定 Supabase 和 The Odds API Key 後可連接真實資料。
            </span>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* League filter */}
          <div className="flex rounded-lg border border-surface-border overflow-hidden">
            {(["ALL", "NBA", "MLB"] as FilterLeague[]).map((l) => (
              <button
                key={l}
                onClick={() => setLeague(l)}
                className={clsx(
                  "px-3 py-1.5 text-sm transition-colors",
                  league === l
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-surface-hover"
                )}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex rounded-lg border border-surface-border overflow-hidden">
            {(
              [
                { key: "gameTime", label: "時間" },
                { key: "evPct", label: "EV↓" },
                { key: "league", label: "聯盟" },
              ] as { key: SortKey; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={clsx(
                  "px-3 py-1.5 text-sm transition-colors",
                  sortKey === key
                    ? "bg-slate-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-surface-hover"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Positive EV filter */}
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showPositiveOnly}
              onChange={(e) => setShowPositiveOnly(e.target.checked)}
              className="w-4 h-4 rounded accent-green-500"
            />
            僅顯示正 EV
          </label>

          {/* Spacer */}
          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex rounded-lg border border-surface-border overflow-hidden">
            {(
              [
                { v: "table", icon: "☰" },
                { v: "cards", icon: "⊞" },
              ] as { v: ViewMode; icon: string }[]
            ).map(({ v, icon }) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                title={v === "table" ? "表格模式" : "卡片模式"}
                className={clsx(
                  "px-2.5 py-1.5 text-sm transition-colors",
                  viewMode === v
                    ? "bg-slate-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-surface-hover"
                )}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Taiwan odds import */}
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-blue-700/60 text-blue-400 hover:bg-blue-900/30 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            匯入台彩
          </button>

          {/* Admin link */}
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-surface-border text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            後台
          </Link>
        </div>

        {/* Game list / table */}
        {loading && <LoadingSpinner />}
        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-700/40 rounded-lg p-3">
            載入失敗：{error}
          </div>
        )}

        {!loading && !error && viewMode === "table" && (
          <EdgeTable rows={sorted} />
        )}

        {!loading && !error && viewMode === "cards" && (
          <>
            {sorted.length === 0 && (
              <p className="text-center text-slate-500 py-12">沒有符合條件的比賽</p>
            )}
            <div className="space-y-3">
              {sorted.map((row) => (
                <GameCard
                  key={row.game.id}
                  row={row}
                  expanded={expandedIds.has(row.game.id)}
                  onToggle={() => toggleExpand(row.game.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* Taiwan odds import modal */}
        <TaiwanOddsModal
          open={showImport}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            fetchData(true);
          }}
        />

        {/* Footer disclaimer */}
        <p className="text-xs text-slate-600 text-center pb-4">
          本工具僅供學術研究與數據分析，不構成投注建議。
          所有 Edge 訊號均需自行判斷，本系統不提供任何形式的自動下注。
        </p>
      </main>
    </div>
  );
}
