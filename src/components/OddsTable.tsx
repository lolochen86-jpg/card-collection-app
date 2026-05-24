"use client";

import type { OddsSnapshot } from "@/types";

interface OddsTableProps {
  snapshots: OddsSnapshot[];
}

const BOOKMAKER_LABELS: Record<string, string> = {
  pinnacle: "Pinnacle",
  bet365: "Bet365",
  sbobet: "SBOBET",
  betfair_ex_eu: "Betfair",
  betfair: "Betfair",
  draftkings: "DraftKings",
  fanduel: "FanDuel",
  williamhill_us: "William Hill",
  taiwan_sports: "台灣運彩",
};

export function OddsTable({ snapshots }: OddsTableProps) {
  const intl = snapshots.filter((s) => s.bookmaker !== "taiwan_sports");
  const taiwan = snapshots.find((s) => s.bookmaker === "taiwan_sports");

  if (intl.length === 0 && !taiwan) {
    return <p className="text-xs text-slate-500">尚無賠率資料</p>;
  }

  return (
    <div className="text-xs">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-slate-500 border-b border-slate-700">
            <th className="text-left py-1 pr-3 font-medium">莊家</th>
            <th className="text-right py-1 pr-2 font-medium">主場</th>
            <th className="text-right py-1 font-medium">客場</th>
          </tr>
        </thead>
        <tbody>
          {[...intl, ...(taiwan ? [taiwan] : [])].map((s) => (
            <tr
              key={s.id}
              className={
                s.bookmaker === "taiwan_sports"
                  ? "text-blue-300 border-t border-blue-900/50"
                  : "text-slate-300"
              }
            >
              <td className="py-1 pr-3">
                {BOOKMAKER_LABELS[s.bookmaker] ?? s.bookmaker}
              </td>
              <td className="py-1 pr-2 text-right font-mono">
                {s.home_odds?.toFixed(2) ?? "—"}
              </td>
              <td className="py-1 text-right font-mono">
                {s.away_odds?.toFixed(2) ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
