"use client";

import { useState } from "react";
import Link from "next/link";

interface ActionResult {
  label: string;
  success: boolean;
  message: string;
  detail?: unknown;
}

interface QuickCalcResult {
  homeNoVigProb: number;
  awayNoVigProb: number;
  homeFairOdds: number;
  awayFairOdds: number;
  vigPct: number;
  homeEdgePct: number;
  awayEdgePct: number;
  homeKelly: number;
  awayKelly: number;
  homeConfidence: string;
  awayConfidence: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-card rounded-xl border border-surface-border p-5 space-y-4">
      <h2 className="text-sm font-semibold text-white uppercase tracking-wide border-b border-surface-border pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function ActionButton({
  label,
  description,
  onClick,
  loading,
  variant = "default",
}: {
  label: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  variant?: "default" | "primary" | "danger";
}) {
  const cls = {
    default: "border border-surface-border hover:border-slate-500 text-slate-300 hover:text-white",
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    danger: "border border-red-800/60 hover:border-red-600 text-red-400 hover:text-red-300",
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-start gap-3 p-3.5 rounded-lg transition-colors disabled:opacity-50 text-left ${cls}`}
    >
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mt-0.5 shrink-0" />
      )}
    </button>
  );
}

export default function AdminPage() {
  const [results, setResults] = useState<ActionResult[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  // Quick calculator state
  const [calc, setCalc] = useState({
    twHome: "1.85",
    twAway: "2.10",
    intHome: "1.72",
    intAway: "2.21",
  });
  const [calcResult, setCalcResult] = useState<QuickCalcResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  async function runAction(key: string, label: string, fn: () => Promise<Response>) {
    setLoading(key);
    try {
      const res = await fn();
      const json = await res.json();
      setResults((prev) => [
        {
          label,
          success: res.ok,
          message: res.ok
            ? JSON.stringify(json, null, 2).slice(0, 300)
            : json.error ?? `HTTP ${res.status}`,
          detail: json,
        },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      setResults((prev) => [
        { label, success: false, message: String(err) },
        ...prev.slice(0, 9),
      ]);
    } finally {
      setLoading(null);
    }
  }

  async function quickCalc() {
    setCalcLoading(true);
    setCalcResult(null);
    try {
      const params = new URLSearchParams({
        twHome: calc.twHome,
        twAway: calc.twAway,
        intHome: calc.intHome,
        intAway: calc.intAway,
      });
      const res = await fetch(`/api/edge/calculate?${params}`);
      const json = await res.json();
      if (res.ok) setCalcResult(json);
      else alert(json.error);
    } finally {
      setCalcLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface text-white">
      {/* Header */}
      <header className="border-b border-surface-border bg-surface px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-base font-bold text-white">管理後台</h1>
          <p className="text-xs text-slate-500">手動觸發資料抓取與 Edge 計算</p>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-5">

        {/* Environment status */}
        <Section title="環境狀態">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: "Supabase",
                ok: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")),
                note: "NEXT_PUBLIC_SUPABASE_URL",
              },
              { label: "The Odds API", ok: false, note: "THE_ODDS_API_KEY (server-only)" },
              { label: "OpticOdds", ok: false, note: "OPTIC_ODDS_API_KEY (server-only)" },
            ].map(({ label, note }) => (
              <div key={label} className="flex items-center gap-2.5 bg-surface rounded-lg p-3 border border-surface-border">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">{label}</p>
                  <p className="text-xs text-slate-600">{note}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            伺服器端 API Key 狀態需透過下方測試按鈕確認（Next.js 不會將 server-only env 暴露給客戶端）。
          </p>
        </Section>

        {/* Data fetching */}
        <Section title="資料抓取（需要 API Key）">
          <div className="space-y-2">
            <ActionButton
              label="抓取 NBA 國際賠率（The Odds API）"
              description="呼叫 The Odds API 抓取今日 NBA moneyline 賠率，寫入 games + odds_snapshots"
              loading={loading === "fetch-nba"}
              variant="primary"
              onClick={() =>
                runAction("fetch-nba", "Fetch NBA", () =>
                  fetch("/api/odds/fetch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ league: "NBA" }),
                  })
                )
              }
            />
            <ActionButton
              label="抓取 MLB 國際賠率（The Odds API）"
              description="呼叫 The Odds API 抓取今日 MLB moneyline 賠率"
              loading={loading === "fetch-mlb"}
              variant="primary"
              onClick={() =>
                runAction("fetch-mlb", "Fetch MLB", () =>
                  fetch("/api/odds/fetch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ league: "MLB" }),
                  })
                )
              }
            />
            <ActionButton
              label="Dry Run NBA（僅預覽，不寫入）"
              description="測試 API 連線是否正常，不寫入任何資料"
              loading={loading === "dry-nba"}
              onClick={() =>
                runAction("dry-nba", "Dry Run NBA", () =>
                  fetch("/api/odds/fetch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ league: "NBA", dryRun: true }),
                  })
                )
              }
            />
          </div>
        </Section>

        {/* Edge calculation */}
        <Section title="Edge 計算">
          <div className="space-y-2">
            <ActionButton
              label="重新計算所有 Edge 訊號"
              description="掃描所有同時有國際盤和台彩賠率的比賽，重新計算 EV、Kelly、信心等級"
              loading={loading === "calc-all"}
              variant="primary"
              onClick={() =>
                runAction("calc-all", "Calculate All Edges", () =>
                  fetch("/api/edge/calculate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                  })
                )
              }
            />
          </div>
        </Section>

        {/* Quick calculator */}
        <Section title="快速計算器（無需 DB）">
          <p className="text-xs text-slate-500">
            輸入任意兩組賠率，即時計算去水機率、EV%、Kelly。
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { key: "twHome", label: "台彩 主場" },
                { key: "twAway", label: "台彩 客場" },
                { key: "intHome", label: "國際盤 主場" },
                { key: "intAway", label: "國際盤 客場" },
              ] as { key: keyof typeof calc; label: string }[]
            ).map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">{label}</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={calc[key]}
                  onChange={(e) => setCalc((p) => ({ ...p, [key]: e.target.value }))}
                  className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </label>
            ))}
          </div>
          <button
            onClick={quickCalc}
            disabled={calcLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {calcLoading ? "計算中…" : "計算"}
          </button>

          {calcResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              {[
                { label: "主場去水機率", value: `${(calcResult.homeNoVigProb * 100).toFixed(2)}%` },
                { label: "客場去水機率", value: `${(calcResult.awayNoVigProb * 100).toFixed(2)}%` },
                { label: "主場公平賠率", value: calcResult.homeFairOdds.toFixed(4) },
                { label: "客場公平賠率", value: calcResult.awayFairOdds.toFixed(4) },
                { label: "水錢", value: `${calcResult.vigPct.toFixed(2)}%` },
                {
                  label: "主場 EV%",
                  value: `${calcResult.homeEdgePct > 0 ? "+" : ""}${calcResult.homeEdgePct.toFixed(2)}%`,
                  highlight: calcResult.homeEdgePct > 0 ? "text-green-400" : "text-red-400",
                },
                {
                  label: "客場 EV%",
                  value: `${calcResult.awayEdgePct > 0 ? "+" : ""}${calcResult.awayEdgePct.toFixed(2)}%`,
                  highlight: calcResult.awayEdgePct > 0 ? "text-green-400" : "text-red-400",
                },
                { label: "主場 Kelly", value: `${(calcResult.homeKelly * 100).toFixed(2)}%` },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="bg-surface rounded-lg p-3 border border-surface-border">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-sm font-mono font-bold mt-1 ${highlight ?? "text-white"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Activity log */}
        {results.length > 0 && (
          <Section title="操作記錄">
            <ul className="space-y-2">
              {results.map((r, i) => (
                <li
                  key={i}
                  className={`rounded-lg border p-3 text-xs font-mono ${
                    r.success
                      ? "border-green-800/40 bg-green-950/20 text-green-300"
                      : "border-red-800/40 bg-red-950/20 text-red-400"
                  }`}
                >
                  <span className="font-bold">[{r.success ? "OK" : "ERR"}]</span>{" "}
                  {r.label}: {r.message}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <p className="text-xs text-slate-600 text-center pb-4">
          本後台僅供資料管理使用。所有操作都有記錄，不會觸發任何形式的自動下注。
        </p>
      </main>
    </div>
  );
}
