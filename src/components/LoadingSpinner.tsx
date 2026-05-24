export function LoadingSpinner({ text = "載入中…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
