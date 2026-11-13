import { formatPct, formatUsd } from "@/lib/format";

type Data = Record<string, any>;

function Metric({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-sm border border-border bg-background/40 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`tabular mt-0.5 font-mono text-sm font-semibold ${tone === "up" ? "text-buy" : tone === "down" ? "text-sell" : ""}`}>
        {value}
      </p>
    </div>
  );
}

const tone = (v: number | null | undefined) => (v == null ? undefined : v >= 0 ? "up" : "down");

/** "What the committee saw": headline values from a market snapshot. */
export function SnapshotSummary({ data, unavailable }: { data: Data; unavailable?: Record<string, string> | null }) {
  const p = data?.price ?? {};
  const t = data?.technicals;
  const s = data?.sentiment;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Price" value={formatUsd(p.priceUsd)} />
        <Metric label="24h" value={formatPct(p.priceChangePercent24h, 2, true)} tone={tone(p.priceChangePercent24h)} />
        <Metric label="Market cap" value={p.marketCapUsd ? formatUsd(p.marketCapUsd, { compact: true }) : "—"} />
        {s && <Metric label="Fear & Greed" value={`${s.value} · ${s.classification}`} />}
        {t && (
          <>
            <Metric label="RSI (14)" value={t.rsi14 != null ? t.rsi14.toFixed(1) : "—"} />
            <Metric label="30d" value={formatPct(t.change30dPct, 1, true)} tone={tone(t.change30dPct)} />
            <Metric label="vs EMA-200" value={formatPct(t.priceVsEma200Pct, 1, true)} tone={tone(t.priceVsEma200Pct)} />
            <Metric label="Realized vol (30d)" value={formatPct(t.realizedVol30dPct, 0)} />
          </>
        )}
      </div>
      {unavailable && Object.keys(unavailable).length > 0 && (
        <ul className="space-y-0.5 text-[11px] text-muted-foreground">
          {Object.entries(unavailable).map(([k, why]) => (
            <li key={k}>
              <span className="font-mono text-warning">{k}</span> unavailable — {why}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
