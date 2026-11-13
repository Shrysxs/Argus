import type { Metadata } from "next";
import Link from "next/link";
import { getLeaderboard } from "@/lib/leaderboard";
import { OUTCOME_HORIZON_DAYS } from "@/lib/outcomes";
import { agentById, AGENT_ROSTER } from "@/lib/agents";
import { PageContainer, PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Agent leaderboard",
  description: "Public, outcome-scored track records for every Argus analyst: hit rate, Brier score and reputation index.",
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function Streak({ recent }: { recent: boolean[] }) {
  if (recent.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex gap-0.5" aria-label={`Last ${recent.length} calls`}>
      {recent.map((ok, i) => (
        <span key={i} className={`h-3 w-1.5 rounded-[1px] ${ok ? "bg-success" : "bg-destructive/70"}`} title={ok ? "correct" : "wrong"} />
      ))}
    </span>
  );
}

export default async function LeaderboardPage() {
  const lb = await getLeaderboard();
  const known = new Set(lb.agents.map((a) => a.agentId));
  const rows = [...lb.agents, ...AGENT_ROSTER.filter((a) => !known.has(a.id)).map((a) => ({ agentId: a.id, record: null, abstentions: 0, recent: [] }))];

  return (
    <PageContainer className="space-y-8">
      <PageHeader
        eyebrow="Track record"
        title="Agent leaderboard"
        description={`Every sealed decision is scored ${OUTCOME_HORIZON_DAYS} days later against the realized price move. Rankings use the reputation index (1 − time-decayed Brier score), which punishes confident mistakes.`}
      />

      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Scored decisions", lb.scoredDecisions.toLocaleString()],
          ["Awaiting horizon", lb.pendingDecisions.toLocaleString()],
          ["Committee hit rate", lb.committee ? pct(lb.committee.hitRate) : "—"],
          ["Committee reputation", lb.committee ? lb.committee.reputation.toFixed(3) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-border bg-surface p-4">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
            <dd className="tabular mt-1 font-serif text-2xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      {lb.scoredDecisions === 0 && (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <p className="font-serif text-lg font-semibold">No outcomes scored yet</p>
          <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
            Decisions are scored automatically {OUTCOME_HORIZON_DAYS} days after they are sealed. Track records will appear here
            as soon as the first horizon passes — nothing on this page is simulated.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Analyst</th>
              <th className="px-4 py-3 text-right">Calls</th>
              <th className="px-4 py-3 text-right">Hit rate</th>
              <th className="px-4 py-3 text-right" title="Mean squared error of confidence vs outcome. Lower is better.">Brier ↓</th>
              <th className="px-4 py-3 text-right" title="1 − time-decayed Brier (MATH.md §2). Higher is better.">Reputation ↑</th>
              <th className="px-4 py-3 text-right">Avg conf.</th>
              <th className="px-4 py-3">Last 10</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {rows.map((row, i) => {
              const a = agentById(row.agentId);
              const r = row.record;
              return (
                <tr key={row.agentId}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r ? i + 1 : "—"}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a?.name ?? row.agentId}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a?.framework}
                      {row.abstentions > 0 && ` · abstained ${row.abstentions}×`}
                    </p>
                  </td>
                  <td className="tabular px-4 py-3 text-right font-mono">{r?.calls ?? 0}</td>
                  <td className="tabular px-4 py-3 text-right font-mono">{r ? pct(r.hitRate) : "—"}</td>
                  <td className="tabular px-4 py-3 text-right font-mono">{r ? r.brier.toFixed(3) : "—"}</td>
                  <td className="tabular px-4 py-3 text-right font-mono font-semibold">{r ? r.reputation.toFixed(3) : "—"}</td>
                  <td className="tabular px-4 py-3 text-right font-mono">{r ? `${r.avgConfidence.toFixed(0)}%` : "—"}</td>
                  <td className="px-4 py-3">
                    <Streak recent={row.recent} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        A call is correct when BUY precedes a move above +2%, SELL a move below −2%, and HOLD a move within ±2%. See the{" "}
        <Link href="/methodology#scoring" className="text-brass hover:underline">
          scoring methodology
        </Link>
        . Past accuracy does not predict future results.
      </p>
    </PageContainer>
  );
}
