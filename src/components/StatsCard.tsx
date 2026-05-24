"use client";

import { clsx } from "clsx";

interface StatsCardProps {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: "green" | "yellow" | "red" | "blue" | "none";
}

export function StatsCard({
  label,
  value,
  sub,
  highlight = "none",
}: StatsCardProps) {
  const highlightClass = {
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    blue: "text-blue-400",
    none: "text-white",
  }[highlight];

  return (
    <div className="bg-surface-card rounded-xl p-4 flex flex-col gap-1 border border-surface-border">
      <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      <span className={clsx("text-2xl font-bold font-mono", highlightClass)}>
        {value}
      </span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}
