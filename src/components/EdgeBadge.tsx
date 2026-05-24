"use client";

import { clsx } from "clsx";
import type { ConfidenceLevel } from "@/types";

interface EdgeBadgeProps {
  evPct: number;
  confidence: ConfidenceLevel;
  needsReview: boolean;
  size?: "sm" | "md";
}

export function EdgeBadge({
  evPct,
  confidence,
  needsReview,
  size = "md",
}: EdgeBadgeProps) {
  const isPositive = evPct > 0;
  const isNeutral = Math.abs(evPct) < 0.5;

  const baseClass = clsx(
    "inline-flex items-center gap-1 font-mono font-semibold rounded",
    size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm"
  );

  const colorClass = needsReview
    ? "bg-yellow-900/60 text-yellow-300 ring-1 ring-yellow-500/50"
    : isNeutral
    ? "bg-slate-700 text-slate-300"
    : isPositive
    ? "bg-green-900/60 text-green-300 ring-1 ring-green-500/40"
    : "bg-red-900/40 text-red-400";

  const label = needsReview ? "⚠ 需確認" : isPositive ? "+" : "";

  return (
    <span className={clsx(baseClass, colorClass)}>
      {label}
      {evPct.toFixed(2)}%
    </span>
  );
}

interface ConfidenceDotProps {
  level: ConfidenceLevel;
}

export function ConfidenceDot({ level }: ConfidenceDotProps) {
  const map: Record<ConfidenceLevel, { color: string; label: string }> = {
    high: { color: "bg-green-500", label: "高" },
    medium: { color: "bg-yellow-500", label: "中" },
    low: { color: "bg-slate-500", label: "低" },
    manual_review: { color: "bg-yellow-400 animate-pulse", label: "確認" },
  };
  const { color, label } = map[level];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
      <span className={clsx("w-2 h-2 rounded-full", color)} />
      {label}
    </span>
  );
}
