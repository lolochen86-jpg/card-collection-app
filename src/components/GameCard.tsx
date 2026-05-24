"use client";

import { clsx } from "clsx";
import type { DashboardRow } from "@/types";
import { EdgeBadge, ConfidenceDot } from "./EdgeBadge";
import { OddsTable } from "./OddsTable";

interface GameCardProps {
  row: DashboardRow;
  expanded: boolean;
  onToggle: () => void;
}

function formatGameTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    scheduled: { label: "未開賽", cls: "bg-slate-700 text-slate-300" },
    live: { label: "進行中", cls: "bg-red-900/60 text-red-300 animate-pulse" },
    finished: { label: "已結束", cls: "bg-slate-800 text-slate-500" },
    cancelled: { label: "取消", cls: "bg-slate-800 text-slate-500" },
  };
  const { label, cls } = map[status] ?? map.scheduled;
  return (
    <span className={clsx("text-xs px-1.5 py-0.5 rounded font-medium", cls)}>
      {label}
    </span>
  );
}

function SideRow({
  label,
  teamName,
  teamZh,
  signal,
  fairProb,
  isHome,
}: {
  label: string;
  teamName: string;
  teamZh?: string | null;
  signal: DashboardRow["homeSignal"];
  fairProb: DashboardRow["fairProb"];
  isHome: boolean;
}) {
  const noVigProb = isHome
    ? fairProb?.home_no_vig_prob
    : fairProb?.away_no_vig_prob;
  const fairOddsVal = isHome
    ? fairProb?.home_fair_odds
    : fairProb?.away_fair_odds;

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-700/50 last:border-0">
      <span className="w-5 text-xs text-slate-500 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {teamZh ?? teamName}
        </p>
        {teamZh && (
          <p className="text-xs text-slate-500 truncate">{teamName}</p>
        )}
      </div>

      {signal ? (
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400">
              台彩{" "}
              <span className="font-mono text-white">
                {signal.taiwan_odds.toFixed(2)}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              公平{" "}
              <span className="font-mono">
                {fairOddsVal?.toFixed(2) ?? "—"}
              </span>
            </p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-xs text-slate-400">
              去水{" "}
              <span className="font-mono">
                {noVigProb != null
                  ? (noVigProb * 100).toFixed(1) + "%"
                  : "—"}
              </span>
            </p>
            <p className="text-xs text-slate-400">
              Kelly{" "}
              <span className="font-mono">
                {(signal.kelly_fraction * 100).toFixed(1)}%
              </span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <EdgeBadge
              evPct={signal.ev_pct}
              confidence={signal.confidence_level}
              needsReview={signal.needs_review}
              size="sm"
            />
            <ConfidenceDot level={signal.confidence_level} />
          </div>
        </div>
      ) : (
        <span className="text-xs text-slate-600 shrink-0">無 Edge 資料</span>
      )}
    </div>
  );
}

export function GameCard({ row, expanded, onToggle }: GameCardProps) {
  const { game, homeSignal, awaySignal, fairProb, snapshots } = row;

  const hasPositiveEdge =
    (homeSignal?.ev_pct ?? 0) > 0 || (awaySignal?.ev_pct ?? 0) > 0;
  const hasReview =
    homeSignal?.needs_review || awaySignal?.needs_review;

  return (
    <div
      className={clsx(
        "rounded-xl border transition-colors",
        hasReview
          ? "border-yellow-600/50 bg-yellow-950/20"
          : hasPositiveEdge
          ? "border-green-700/40 bg-surface-card"
          : "border-surface-border bg-surface-card"
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        <span
          className={clsx(
            "shrink-0 text-xs font-bold px-2 py-0.5 rounded",
            game.league === "NBA"
              ? "bg-blue-900/60 text-blue-300"
              : "bg-orange-900/60 text-orange-300"
          )}
        >
          {game.league}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {game.home_team_zh ?? game.home_team} vs{" "}
            {game.away_team_zh ?? game.away_team}
          </p>
          <p className="text-xs text-slate-500">{formatGameTime(game.game_time)}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={game.status} />
          {hasReview && (
            <span className="text-xs text-yellow-400 font-medium">⚠ 確認</span>
          )}
          {hasPositiveEdge && !hasReview && (
            <span className="text-xs text-green-400 font-medium">+EV</span>
          )}
          <svg
            className={clsx(
              "w-4 h-4 text-slate-500 transition-transform",
              expanded && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Rows — always visible */}
      <div className="px-4 pb-2">
        <SideRow
          label="主"
          teamName={game.home_team}
          teamZh={game.home_team_zh}
          signal={homeSignal}
          fairProb={fairProb}
          isHome={true}
        />
        <SideRow
          label="客"
          teamName={game.away_team}
          teamZh={game.away_team_zh}
          signal={awaySignal}
          fairProb={fairProb}
          isHome={false}
        />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-surface-border px-4 py-3 space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
              賠率詳情
            </p>
            <OddsTable snapshots={snapshots} />
          </div>

          {fairProb && (
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
                去水分析
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <dt className="text-slate-500">水錢</dt>
                <dd className="font-mono text-white">
                  {fairProb.vig_pct.toFixed(2)}%
                </dd>
                <dt className="text-slate-500">參考莊家數</dt>
                <dd className="font-mono text-white">
                  {fairProb.bookmakers_count}
                </dd>
                <dt className="text-slate-500">來源莊家</dt>
                <dd className="text-slate-300">
                  {fairProb.bookmakers_used.join(", ")}
                </dd>
                <dt className="text-slate-500">計算時間</dt>
                <dd className="text-slate-300">
                  {new Date(fairProb.calculated_at).toLocaleTimeString("zh-TW")}
                </dd>
              </dl>
            </div>
          )}

          {homeSignal && (
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
                Kelly 建議
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <dt className="text-slate-500">主場 Kelly</dt>
                <dd className="font-mono text-white">
                  {(homeSignal.kelly_fraction * 100).toFixed(2)}%
                </dd>
                {awaySignal && (
                  <>
                    <dt className="text-slate-500">客場 Kelly</dt>
                    <dd className="font-mono text-white">
                      {(awaySignal.kelly_fraction * 100).toFixed(2)}%
                    </dd>
                  </>
                )}
              </dl>
              <p className="mt-2 text-xs text-slate-600">
                * Kelly 僅供參考，本系統不提供自動下注。資料來源：
                {homeSignal.data_sources?.bookmakers.join(", ") ?? "—"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
