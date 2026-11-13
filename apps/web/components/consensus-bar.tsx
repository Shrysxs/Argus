import { voteBgClass } from "./vote-badge";

/** Stacked bar of confidence-weighted votes (MATH.md §1). */
export function ConsensusBar({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = (["BUY", "HOLD", "SELL"] as const).map((d) => [d, Number(breakdown?.[d] ?? 0)] as const);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-sm bg-muted" role="img" aria-label="Weighted vote breakdown">
        {total > 0 &&
          entries.map(([d, w]) =>
            w > 0 ? <div key={d} className={voteBgClass(d)} style={{ width: `${(w / total) * 100}%` }} title={`${d}: ${w.toFixed(0)}`} /> : null,
          )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
        {entries.map(([d, w]) => (
          <span key={d} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-[1px] ${voteBgClass(d)}`} />
            {d} <span className="tabular text-foreground">{w.toFixed(0)}</span>
            {total > 0 && <span>({((w / total) * 100).toFixed(0)}%)</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
