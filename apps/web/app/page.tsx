import Link from "next/link";
import { ArrowRight, Database, Fingerprint, Scale, ShieldCheck } from "lucide-react";
import { AGENT_ROSTER } from "@/lib/agents";
import { getPublicStats, listSealedDecisions } from "@/lib/decisions";
import { DecisionRow } from "@/components/decision-row";
import { VoteBadge } from "@/components/vote-badge";
import { ConsensusBar } from "@/components/consensus-bar";
import { timeAgo } from "@/lib/format";


const STEPS = [
  {
    icon: Database,
    title: "Snapshot",
    body: "Live price, ~210 days of history, technical indicators and sentiment are captured once and SHA-256 hashed.",
  },
  {
    icon: Scale,
    title: "Deliberate",
    body: "Five analysts with distinct, versioned frameworks vote independently on the same snapshot — no shared context, no groupthink.",
  },
  {
    icon: Fingerprint,
    title: "Consensus",
    body: "Votes are combined by a deterministic, published formula. Splits and missing analysts are flagged, never hidden.",
  },
  {
    icon: ShieldCheck,
    title: "Seal",
    body: "The decision, data hash and prompt hash are written to Monad. The full reasoning lives off-chain, bound by hash.",
  },
];

async function loadHome() {
  try {
    const [stats, recent] = await Promise.all([getPublicStats(), listSealedDecisions({ pageSize: 6 })]);
    return { stats, recent: recent.items };
  } catch {
    return { stats: null, recent: [] };
  }
}

export default async function LandingPage() {
  const { stats, recent } = await loadHome();
  const featured = recent[0];

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-1 font-mono text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" /> Live on Monad testnet
            </p>
            <h1 className="mt-6 font-serif text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              An AI investment committee you can audit.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Five independent analysts debate every asset. Their votes, reasoning and the exact data they saw are hashed and
              sealed on-chain — and every analyst&apos;s track record is scored in public.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex h-11 items-center gap-2 rounded-sm bg-foreground px-6 text-sm font-semibold text-background hover:bg-foreground/90">
                Start analyzing <ArrowRight className="size-4" />
              </Link>
              <Link href="/decisions" className="inline-flex h-11 items-center rounded-sm border border-border px-6 text-sm hover:bg-surface">
                Browse sealed decisions
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Free starter credits · No card required · Not financial advice</p>
          </div>

          <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
            {featured ? (
              <Link href={`/d/${featured.id}`} className="block space-y-5">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Latest sealed decision</p>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(featured.sealedAt ?? featured.createdAt)}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-mono text-2xl font-bold">{featured.asset}</p>
                    <VoteBadge vote={featured.recommendation} className="mt-2" />
                  </div>
                  <p className="tabular font-mono text-4xl font-bold">{featured.confidence.toFixed(1)}%</p>
                </div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  View votes, reasoning & on-chain proof <ArrowRight className="size-3" />
                </p>
              </Link>
            ) : (
              <div className="space-y-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-brass">How a decision reads</p>
                <div className="space-y-3">
                  {AGENT_ROSTER.map((a) => (
                    <div key={a.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                      <span className="text-sm">{a.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{a.framework.split(" · ")[0]}</span>
                    </div>
                  ))}
                </div>
                <ConsensusBar breakdown={{ BUY: 0, HOLD: 0, SELL: 0 }} />
                <p className="text-xs text-muted-foreground">Each vote is weighted by its confidence and sealed with the data behind it.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-surface/40">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
          {[
            stats && stats.sealedDecisions > 0
              ? ["Decisions sealed", stats.sealedDecisions.toLocaleString()]
              : ["Decisions sealed", "Open ledger"],
            stats && stats.assetsCovered > 0 ? ["Assets covered", String(stats.assetsCovered)] : ["Assets supported", "100+"],
            ["Independent analysts", String(AGENT_ROSTER.length)],
            ["Inputs hashed", "100%"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-serif text-2xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-brass">How it works</p>
        <h2 className="mt-2 max-w-2xl font-serif text-3xl font-bold tracking-tight">From raw market data to a decision anyone can re-check</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-md border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <s.icon className="size-5 text-brass" />
                <span className="font-mono text-[11px] text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Committee */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-brass">The committee</p>
              <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight">Five frameworks that rarely agree</h2>
            </div>
            <Link href="/leaderboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              See their track records <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AGENT_ROSTER.map((a) => (
              <div key={a.id} className="flex flex-col rounded-md border border-border bg-surface p-5">
                <span className="flex size-8 items-center justify-center rounded-sm border border-border bg-surface-2 font-mono text-[10px] font-bold text-brass">
                  {a.short}
                </span>
                <h3 className="mt-4 font-serif text-base font-bold">{a.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{a.framework}</p>
                <p className="mt-4 border-t border-border pt-3 text-[11px] italic text-muted-foreground">“{a.bias}”</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Don&apos;t trust — verify</p>
          <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight">Every claim on this site can be checked without us</h2>
          <p className="mt-4 text-muted-foreground">
            Each decision page has a “Verify independently” button that recomputes every hash in your browser and reads the
            on-chain event straight from a public Monad RPC. If anything was edited after sealing, it fails.
          </p>
          <Link href="/methodology#verify" className="mt-6 inline-flex items-center gap-1 text-sm text-brass hover:underline">
            Read the methodology <ArrowRight className="size-4" />
          </Link>
        </div>
        <ul className="space-y-4">
          {[
            ["Data hash", "The exact market snapshot every analyst saw."],
            ["Prompt hash", "The exact versioned instructions each analyst followed."],
            ["Reasoning hash", "Every vote, confidence score and sentence of reasoning."],
            ["On-chain event", "Asset, decision, confidence and hashes, emitted by a contract that holds no funds."],
          ].map(([t, b]) => (
            <li key={t} className="flex gap-3 rounded-md border border-border bg-surface p-4">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
              <div>
                <p className="text-sm font-medium">{t}</p>
                <p className="text-sm text-muted-foreground">{b}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent */}
      {recent.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-serif text-2xl font-bold">Recently sealed</h2>
            <Link href="/decisions" className="text-sm text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
            {recent.map((d) => (
              <DecisionRow key={d.id} d={d} />
            ))}
          </ul>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-2xl font-bold">Convene your first committee</h2>
            <p className="mt-1 text-sm text-muted-foreground">Starter credits included. Results in under a minute.</p>
          </div>
          <Link href="/signup" className="inline-flex h-11 items-center gap-2 rounded-sm bg-foreground px-6 text-sm font-semibold text-background hover:bg-foreground/90">
            Create a free account <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
