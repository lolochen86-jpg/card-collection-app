"use client";

interface HeaderProps {
  onRefresh: () => void;
  refreshing: boolean;
  lastUpdated: string | null;
}

export function Header({ onRefresh, refreshing, lastUpdated }: HeaderProps) {
  const fmtTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  return (
    <header className="border-b border-surface-border bg-surface px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-white leading-tight">
            NBA / MLB 賠率 Edge 分析
          </h1>
          <p className="text-xs text-slate-500">
            台灣運彩 vs 國際盤口正期望值分析
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-xs text-slate-500">
          更新：{fmtTime}
        </span>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg
                     bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                     text-white transition-colors"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {refreshing ? "更新中…" : "刷新"}
        </button>
      </div>
    </header>
  );
}
