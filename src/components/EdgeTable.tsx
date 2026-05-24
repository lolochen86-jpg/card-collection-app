"use client";

import { clsx } from "clsx";
import type { DashboardRow, OddsSnapshot, EdgeSignal, Side } from "@/types";
import { EdgeBadge, ConfidenceDot } from "./EdgeBadge";

// ── helpers ──────────────────────────────────────────────────────────────

function fmtOdds(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toFixed(2);
}

function fmtPct(v: number | null | undefined, dp = 1): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(dp)}%`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function bookmakerOdds(
  snapshots: OddsSnapshot[],
  bk: string,
  side: Side
): number | null {
  const snap = snapshots.find((s) => s.bookmaker === bk);
  if (!snap) return null;
  return side === "home" ? snap.home_odds : snap.away_odds;
}

function avgIntlOdds(snapshots: OddsSnapshot[], side: Side): number | null {
  const intl = snapshots.filter((s) => s.bookmaker !== "taiwan_sports");
  if (intl.length === 0) return null;
  const sum = intl.reduce((acc, s) => {
    const v = side === "home" ? s.home_odds : s.away_odds;
    return acc + (v ?? 0);
  }, 0);
  return sum / intl.length;
}

// ── sub-row (one side of a game) ──────────────────────────────────────────

interface SideRowProps {
  row: DashboardRow;
  side: Side;
  isFirst: boolean; // first row of a game pair
}

function SideRow({ row, side, isFirst }: SideRowProps) {
  const { game, snapshots, homeSignal, awaySignal, fairProb, lastUpdated } = row;
  const signal: EdgeSignal | null = side === "home" ? homeSignal : awaySignal;

  const teamName =
    side === "home"
      ? (game.home_team_zh ?? game.home_team)
      : (game.away_team_zh ?? game.away_team);
  const teamEn = side === "home" ? game.home_team : game.away_team;

  const twOdds =
    snapshots.find((s) => s.bookmaker === "taiwan_sports")?.[
      side === "home" ? "home_odds" : "away_odds"
    ] ?? null;

  const avgOdds = avgIntlOdds(snapshots, side);
  const pinnacle = bookmakerOdds(snapshots, "pinnacle", side);
  const bet365 = bookmakerOdds(snapshots, "bet365", side);
  const sbobet = bookmakerOdds(snapshots, "sbobet", side);

  const noVigProb =
    side === "home" ? fairProb?.home_no_vig_prob : fairProb?.away_no_vig_prob;
  const fairOddsVal =
    side === "home" ? fairProb?.home_fair_odds : fairProb?.away_fair_odds;

  const hasEdge = (signal?.ev_pct ?? 0) > 0;
  const needsReview = signal?.needs_review ?? false;

  return (
    <tr
      className={clsx(
        "transition-colors hover:bg-surface-hover/50",
        needsReview
          ? "bg-yellow-950/20"
          : hasEdge
          ? "bg-green-950/10"
          : "bg-transparent",
        !isFirst && "border-t border-slate-800/50"
      )}
    >
      {/* League + Time (only on first row) */}
      {isFirst && (
        <td
          rowSpan={2}
          className="px-3 py-2 align-middle text-center border-r border-slate-800"
        >
          <span
            className={clsx(
              "block text-xs font-bold px-1.5 py-0.5 rounded mb-1",
              game.league === "NBA"
                ? "bg-blue-900/60 text-blue-300"
                : "bg-orange-900/60 text-orange-300"
            )}
          >
            {game.league}
          </span>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {fmtTime(game.game_time)}
          </span>
          {game.status === "live" && (
            <span className="block mt-1 text-xs text-red-400 animate-pulse font-medium">
              LIVE
            </span>
          )}
        </td>
      )}

      {/* Side label */}
      <td className="px-3 py-2 text-xs text-slate-500 font-medium w-6">
        {side === "home" ? "主" : "客"}
      </td>

      {/* Team name */}
      <td className="px-3 py-2 min-w-[7rem]">
        <p className="text-sm text-white font-medium truncate max-w-[7.5rem]">
          {teamName}
        </p>
        {game.home_team_zh && (
          <p className="text-xs text-slate-600 truncate max-w-[7.5rem]">
            {teamEn}
          </p>
        )}
      </td>

      {/* Taiwan odds */}
      <td className="px-3 py-2 text-center font-mono text-sm text-blue-300">
        {fmtOdds(twOdds)}
      </td>

      {/* Average intl odds */}
      <td className="px-3 py-2 text-center font-mono text-sm text-slate-300">
        {fmtOdds(avgOdds)}
      </td>

      {/* Pinnacle */}
      <td className="px-3 py-2 text-center font-mono text-xs text-slate-400">
        {fmtOdds(pinnacle)}
      </td>

      {/* Bet365 */}
      <td className="px-3 py-2 text-center font-mono text-xs text-slate-400">
        {fmtOdds(bet365)}
      </td>

      {/* SBOBET */}
      <td className="px-3 py-2 text-center font-mono text-xs text-slate-400">
        {fmtOdds(sbobet)}
      </td>

      {/* No-vig prob */}
      <td className="px-3 py-2 text-center font-mono text-sm text-slate-300">
        {fmtPct(noVigProb)}
      </td>

      {/* Fair odds */}
      <td className="px-3 py-2 text-center font-mono text-sm text-slate-300">
        {fmtOdds(fairOddsVal)}
      </td>

      {/* EV% / Edge% */}
      <td className="px-3 py-2 text-center">
        {signal ? (
          <EdgeBadge
            evPct={signal.ev_pct}
            confidence={signal.confidence_level}
            needsReview={signal.needs_review}
            size="sm"
          />
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>

      {/* Kelly */}
      <td className="px-3 py-2 text-center font-mono text-xs">
        {signal ? (
          <span
            className={clsx(
              signal.kelly_fraction > 0 ? "text-green-400" : "text-slate-600"
            )}
          >
            {(signal.kelly_fraction * 100).toFixed(1)}%
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* Confidence */}
      <td className="px-3 py-2 text-center">
        {signal ? (
          <ConfidenceDot level={signal.confidence_level} />
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>

      {/* Updated */}
      {isFirst && (
        <td
          rowSpan={2}
          className="px-3 py-2 align-middle text-xs text-slate-600 text-center whitespace-nowrap"
        >
          {lastUpdated ? fmtTime(lastUpdated) : "—"}
        </td>
      )}
    </tr>
  );
}

// ── game pair ──────────────────────────────────────────────────────────────

function GamePair({ row }: { row: DashboardRow }) {
  return (
    <>
      <SideRow row={row} side="home" isFirst={true} />
      <SideRow row={row} side="away" isFirst={false} />
      {/* Spacer row */}
      <tr>
        <td colSpan={15} className="h-1 bg-surface border-b border-slate-800/80" />
      </tr>
    </>
  );
}

// ── main table ────────────────────────────────────────────────────────────

interface EdgeTableProps {
  rows: DashboardRow[];
}

export function EdgeTable({ rows }: EdgeTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-slate-500 py-16">沒有符合條件的比賽</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border">
      <table className="w-full border-collapse text-sm min-w-[900px]">
        <thead>
          <tr className="bg-surface-card border-b border-slate-700">
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-center whitespace-nowrap">
              聯盟 / 時間
            </th>
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-left" />
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-left">
              球隊
            </th>
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-center whitespace-nowrap">
              台彩賠率
            </th>
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-center whitespace-nowrap">
              國際均值
            </th>
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-center">
              Pinnacle
            </th>
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-center">
              Bet365
            </th>
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-center">
              SBOBET
            </th>
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-center whitespace-nowrap">
              去水機率
            </th>
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-center whitespace-nowrap">
              公平賠率
            </th>
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-center">
              EV%
            </th>
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-center">
              Kelly
            </th>
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-center">
              信心
            </th>
            <th className="px-3 py-2.5 text-xs text-slate-400 font-medium text-center whitespace-nowrap">
              更新時間
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <GamePair key={row.game.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
