import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Lock, ShieldCheck } from "lucide-react";
import { explorerTxUrl } from "@argus/chain-adapters/browser";
import { getSessionUser } from "@/lib/auth/session";
import { getDecision } from "@/lib/decisions";
import { buildSealPayload, isSealable } from "@/lib/analysis/seal-payload";
import { publicChainConfig } from "@/lib/chain-public";
import { formatDateTime, formatPct, formatUsd, shortAddress } from "@/lib/format";
import { OUTCOME_HORIZON_DAYS } from "@/lib/outcomes";
import { PageContainer } from "@/components/page-header";
import { AgentCard } from "@/components/agent-card";
import { ConsensusBar } from "@/components/consensus-bar";
import { SnapshotSummary } from "@/components/snapshot-summary";
import { VoteBadge, voteTextClass } from "@/components/vote-badge";
import { HashText } from "@/components/hash-text";
import { SealPanel } from "@/components/seal-panel";
import { CopyLinkButton } from "@/components/copy-link-button";
import { VerifyPanel } from "./verify-panel";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = await getDecision(id, null).catch(() => null);
  if (!d) return { title: "Decision", robots: { index: false } };
  const title = `${d.asset}: ${d.recommendation} at ${d.confidence.toFixed(1)}% confidence`;
  return {
    title,
    description: `Argus committee decision on ${d.asset}, sealed on Monad testnet. Votes, reasoning, source data and hashes are publicly verifiable.`,
    openGraph: { title: `${title} · Argus` },
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default async function DecisionPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getSessionUser().catch(() => null);
  const d = await getDecision(id, viewer?.id ?? null);
  if (!d) notFound();

  const sealPayload = buildSealPayload(d);
  const okVotes = d.agentVotes.filter((v) => v.status === "ok");
  const abstained = d.agentVotes.filter((v) => v.status === "abstained").length;
  const failed = d.agentVotes.filter((v) => v.status === "failed").length;
  const chain = publicChainConfig();

  return (
    <PageContainer className="space-y-6">
      <nav className="text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/decisions" className="hover:text-foreground">
          Decisions
        </Link>{" "}
        / <span className="text-foreground">{d.asset}</span>
      </nav>

      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-3xl font-bold tracking-tight">{d.asset}</h1>
            <VoteBadge vote={d.recommendation} />
            {d.sealed ? (
              <span className="inline-flex items-center gap-1 rounded-sm border border-success/30 bg-success/10 px-2 py-0.5 font-mono text-[10px] text-success">
                <ShieldCheck className="size-3" /> SEALED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                <Lock className="size-3" /> PRIVATE · NOT SEALED
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Committee convened {formatDateTime(d.createdAt)} · decision id <span className="font-mono">{d.id}</span>
          </p>
        </div>
        <div className="flex items-end gap-6">
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recommendation</p>
            <p className={`font-serif text-4xl font-extrabold ${voteTextClass(d.recommendation)}`}>
              {d.recommendation === "NONE" ? "None" : d.recommendation}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Confidence</p>
            <p className="tabular font-mono text-4xl font-bold">{d.confidence.toFixed(1)}%</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <section>
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-brass">Analyst votes & reasoning</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {d.agentVotes.map((v) => (
                <AgentCard
                  key={v.agentId}
                  data={{
                    agentId: v.agentId,
                    status: v.status as "ok" | "failed" | "abstained",
                    vote: v.vote,
                    confidence: v.confidence,
                    reasoning: v.reasoning,
                    dataPointsCited: v.dataPointsCited,
                    promptVersion: v.promptVersion,
                    modelUsed: v.modelUsed,
                    provider: v.provider,
                    error: v.error,
                  }}
                />
              ))}
              {d.agentVotes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  This decision predates per-agent vote storage; only the aggregate consensus was recorded.
                </p>
              )}
            </div>
          </section>

          {d.snapshot && (
            <section className="rounded-md border border-border bg-surface p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-mono text-[10px] uppercase tracking-widest text-brass">Market snapshot</h2>
                <span className="text-[11px] text-muted-foreground">
                  Captured {formatDateTime(d.snapshot.capturedAt)} · {d.snapshot.sources.join(", ")}
                </span>
              </div>
              <SnapshotSummary data={d.snapshot.data as Record<string, unknown>} />
              <details className="mt-4 group">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Raw snapshot JSON (the exact bytes that were hashed)
                </summary>
                <pre className="mt-2 max-h-96 overflow-auto rounded-sm border border-border bg-background p-3 font-mono text-[11px] leading-relaxed">
                  {d.snapshot.canonical
                    ? JSON.stringify(JSON.parse(d.snapshot.canonical), null, 2)
                    : JSON.stringify(d.snapshot.data, null, 2)}
                </pre>
              </details>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <section className="rounded-md border border-border bg-surface p-5">
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-brass">Consensus</h2>
            <ConsensusBar breakdown={d.breakdown as Record<string, number>} />
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              {okVotes.length} voted{abstained ? ` · ${abstained} abstained` : ""}
              {failed ? ` · ${failed} failed` : ""}
              {d.disagreement && d.recommendation !== "NONE" ? " · split committee" : ""}
            </p>
          </section>

          {d.sealed && (
            <section className="rounded-md border border-border bg-surface p-5">
              <h2 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-brass">Outcome</h2>
              {d.outcome ? (
                <dl className="divide-y divide-border">
                  <Field label="Result">
                    <span className={`font-mono text-xs font-semibold ${d.outcome.correct ? "text-success" : "text-destructive"}`}>
                      {d.outcome.correct ? "✓ Correct" : "✗ Wrong"}
                    </span>
                  </Field>
                  <Field label={`${d.outcome.horizonDays}-day return`}>
                    <span className="tabular font-mono text-xs">{formatPct(d.outcome.returnPct, 2, true)}</span>
                  </Field>
                  <Field label="Entry → exit">
                    <span className="tabular font-mono text-xs">
                      {formatUsd(d.outcome.entryPrice)} → {formatUsd(d.outcome.exitPrice)}
                    </span>
                  </Field>
                  <Field label="Market moved">
                    <span className="font-mono text-xs">
                      {d.outcome.realizedDirection === "BUY" ? "Up" : d.outcome.realizedDirection === "SELL" ? "Down" : "Flat"} (±
                      {d.outcome.flatBandPct}% band)
                    </span>
                  </Field>
                </dl>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Scored automatically {OUTCOME_HORIZON_DAYS} days after the decision against the realized price move.
                </p>
              )}
            </section>
          )}

          <section className="rounded-md border border-border bg-surface p-5">
            <h2 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-brass">On-chain record</h2>
            {d.sealed && d.txHash ? (
              <dl className="divide-y divide-border">
                <Field label="Network">
                  <span className="text-xs">Monad testnet</span>
                </Field>
                <Field label="Transaction">
                  <HashText value={d.txHash} label="transaction hash" href={explorerTxUrl(d.txHash)} />
                </Field>
                <Field label="Signed by">
                  <span className="font-mono text-xs">
                    {d.sealedBy === "client" && d.signerAddress ? shortAddress(d.signerAddress) : "Argus relayer"}
                  </span>
                </Field>
                {d.sealedAt && (
                  <Field label="Sealed">
                    <span className="text-xs">{formatDateTime(d.sealedAt)}</span>
                  </Field>
                )}
                <Field label="Explorer">
                  <a href={explorerTxUrl(d.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs hover:text-brass">
                    View <ExternalLink className="size-3" />
                  </a>
                </Field>
              </dl>
            ) : d.isOwner && isSealable(d) ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Not sealed yet. Sealing publishes this decision&apos;s hashes on-chain and makes this page public.
                </p>
                <SealPanel analysisId={d.id} payload={sealPayload} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {d.recommendation === "NONE" || d.status === "no_quorum"
                  ? "This run did not reach quorum and cannot be sealed."
                  : "Not sealed."}
              </p>
            )}
          </section>

          <section className="rounded-md border border-border bg-surface p-5">
            <h2 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-brass">Integrity</h2>
            <dl className="divide-y divide-border">
              <Field label="Data snapshot">
                <HashText value={d.dataSnapshotHash} label="snapshot hash" />
              </Field>
              <Field label="Prompt versions">
                <HashText value={d.promptVersionHash} label="prompt version hash" />
              </Field>
              <Field label="Reasoning">
                <HashText value={d.reasoningHash} label="reasoning hash" />
              </Field>
            </dl>
            <VerifyPanel
              snapshotData={d.snapshot?.data ?? null}
              snapshotCanonical={d.snapshot?.canonical ?? null}
              dataSnapshotHash={d.dataSnapshotHash}
              promptVersionHash={d.promptVersionHash}
              reasoningHash={d.reasoningHash}
              votes={okVotes.map((v) => ({
                agentId: v.agentId,
                vote: v.vote!,
                confidence: v.confidence!,
                reasoning: v.reasoning!,
                dataPointsCited: v.dataPointsCited,
                promptVersion: v.promptVersion!,
                promptHash: v.promptHash,
              }))}
              txHash={d.sealed ? d.txHash : null}
              sealPayload={sealPayload}
              registryAddress={chain.registryAddress}
              rpcUrl={chain.rpcUrl}
            />
          </section>

          <div className="flex items-center justify-between">
            <CopyLinkButton />
            <Link href="/methodology#verify" className="text-xs text-muted-foreground hover:text-foreground">
              How verification works →
            </Link>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
