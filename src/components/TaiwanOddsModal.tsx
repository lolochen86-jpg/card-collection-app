"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { League } from "@/types";

interface OddsEntry {
  gameNo: string;
  league: League;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds: string;
  awayOdds: string;
}

const EMPTY_ENTRY = (): OddsEntry => ({
  gameNo: "",
  league: "NBA",
  gameTime: new Date().toISOString().slice(0, 16),
  homeTeam: "",
  awayTeam: "",
  homeOdds: "",
  awayOdds: "",
});

interface ImportResult {
  matched: boolean;
  gameId?: string;
  reason?: string;
  payload: {
    homeTeam: string;
    awayTeam: string;
    league: string;
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function TaiwanOddsModal({ open, onClose, onImported }: Props) {
  const [entries, setEntries] = useState<OddsEntry[]>([EMPTY_ENTRY()]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [tab, setTab] = useState<"form" | "paste">("form");

  if (!open) return null;

  function addEntry() {
    setEntries((prev) => [...prev, EMPTY_ENTRY()]);
  }

  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateEntry(i: number, field: keyof OddsEntry, value: string) {
    setEntries((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e))
    );
  }

  /** Parse paste text: each line = "隊名A vs 隊名B  賠率A  賠率B  時間" */
  function parsePasteText(): OddsEntry[] {
    const lines = pasteText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.flatMap((line) => {
      // Try to parse: "NBA 塞爾提克 vs 熱火 1.85 2.10 2026-05-24 10:00"
      const m = line.match(
        /^(NBA|MLB)\s+(.+?)\s+vs\s+(.+?)\s+([\d.]+)\s+([\d.]+)(?:\s+(.+))?$/i
      );
      if (!m) return [];
      return [
        {
          gameNo: `tw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          league: m[1].toUpperCase() as League,
          homeTeam: m[2].trim(),
          awayTeam: m[3].trim(),
          homeOdds: m[4],
          awayOdds: m[5],
          gameTime: m[6]
            ? new Date(m[6]).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
        },
      ];
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setResults(null);

    let payload: OddsEntry[];
    if (tab === "paste") {
      payload = parsePasteText();
      if (payload.length === 0) {
        setError(
          '無法解析文字。格式：「NBA 塞爾提克 vs 熱火 1.85 2.10 2026-05-24 10:00」'
        );
        setSubmitting(false);
        return;
      }
    } else {
      payload = entries.filter(
        (e) => e.homeTeam && e.awayTeam && e.homeOdds && e.awayOdds
      );
      if (payload.length === 0) {
        setError("請至少填寫一筆完整的賠率資料");
        setSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/taiwan-odds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          odds: payload.map((e) => ({
            gameNo: e.gameNo || `tw-${Date.now()}`,
            league: e.league,
            gameTime: new Date(e.gameTime).toISOString(),
            homeTeam: e.homeTeam,
            awayTeam: e.awayTeam,
            homeOdds: parseFloat(e.homeOdds),
            awayOdds: parseFloat(e.awayOdds),
            source: "manual",
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);

      setResults(json.results ?? []);
      const anyMatched = json.results?.some((r: ImportResult) => r.matched);
      if (anyMatched) onImported();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setEntries([EMPTY_ENTRY()]);
    setResults(null);
    setError(null);
    setPasteText("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-base font-bold text-white">匯入台灣運彩賠率</h2>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-border">
          {(["form", "paste"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "px-4 py-2.5 text-sm transition-colors",
                tab === t
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-slate-500 hover:text-white"
              )}
            >
              {t === "form" ? "手動輸入" : "貼上文字"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === "form" && (
            <>
              {entries.map((e, i) => (
                <div
                  key={i}
                  className="bg-surface rounded-xl p-4 border border-surface-border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      第 {i + 1} 筆
                    </span>
                    {entries.length > 1 && (
                      <button
                        onClick={() => removeEntry(i)}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        刪除
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-400">聯盟</span>
                      <select
                        value={e.league}
                        onChange={(ev) => updateEntry(i, "league", ev.target.value)}
                        className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="NBA">NBA</option>
                        <option value="MLB">MLB</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-400">場次編號（選填）</span>
                      <input
                        type="text"
                        value={e.gameNo}
                        onChange={(ev) => updateEntry(i, "gameNo", ev.target.value)}
                        placeholder="e.g. TW-NBA-123"
                        className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-400">主場球隊</span>
                      <input
                        type="text"
                        value={e.homeTeam}
                        onChange={(ev) => updateEntry(i, "homeTeam", ev.target.value)}
                        placeholder="塞爾提克 / Boston Celtics"
                        className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-400">客場球隊</span>
                      <input
                        type="text"
                        value={e.awayTeam}
                        onChange={(ev) => updateEntry(i, "awayTeam", ev.target.value)}
                        placeholder="熱火 / Miami Heat"
                        className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-400">主場賠率</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={e.homeOdds}
                        onChange={(ev) => updateEntry(i, "homeOdds", ev.target.value)}
                        placeholder="1.85"
                        className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-400">客場賠率</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={e.awayOdds}
                        onChange={(ev) => updateEntry(i, "awayOdds", ev.target.value)}
                        placeholder="2.10"
                        className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="col-span-2 flex flex-col gap-1">
                      <span className="text-xs text-slate-400">比賽時間</span>
                      <input
                        type="datetime-local"
                        value={e.gameTime}
                        onChange={(ev) => updateEntry(i, "gameTime", ev.target.value)}
                        className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </label>
                  </div>
                </div>
              ))}

              <button
                onClick={addEntry}
                className="w-full border border-dashed border-slate-600 hover:border-blue-500 rounded-xl py-2.5 text-sm text-slate-400 hover:text-blue-400 transition-colors"
              >
                + 新增一筆
              </button>
            </>
          )}

          {tab === "paste" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                每行一場比賽，格式：
                <code className="ml-1 px-1.5 py-0.5 bg-slate-800 rounded text-green-400 text-xs">
                  NBA 塞爾提克 vs 熱火 1.85 2.10 2026-05-24 10:00
                </code>
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`NBA 塞爾提克 vs 熱火 1.85 2.10 2026-05-24 10:00\nMLB 洋基 vs 紅襪 1.90 2.05 2026-05-24 12:00`}
                rows={8}
                className="w-full bg-surface rounded-xl border border-surface-border px-4 py-3 text-sm text-white placeholder:text-slate-600 font-mono resize-none focus:outline-none focus:border-blue-500"
              />
              {pasteText && (
                <p className="text-xs text-slate-500">
                  解析結果：{parsePasteText().length} 筆
                </p>
              )}
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="rounded-xl border border-surface-border overflow-hidden">
              <p className="px-4 py-2 text-xs font-medium text-slate-400 bg-surface-card border-b border-surface-border">
                匯入結果
              </p>
              <ul className="divide-y divide-surface-border">
                {results.map((r, i) => (
                  <li key={i} className="px-4 py-2.5 flex items-center gap-2 text-sm">
                    <span
                      className={clsx(
                        "w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0",
                        r.matched
                          ? "bg-green-900/60 text-green-400"
                          : "bg-red-900/40 text-red-400"
                      )}
                    >
                      {r.matched ? "✓" : "✗"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">
                        {r.payload.homeTeam} vs {r.payload.awayTeam}
                      </p>
                      {r.reason && (
                        <p className="text-xs text-slate-500 truncate">{r.reason}</p>
                      )}
                      {r.gameId && (
                        <p className="text-xs text-green-600 truncate">
                          已配對 → {r.gameId}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-border flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            ⚠ 系統不儲存帳號密碼，僅儲存賠率數值
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm rounded-lg border border-surface-border text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              關閉
            </button>
            {!results && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors"
              >
                {submitting ? "匯入中…" : "確認匯入"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
