"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Play } from "lucide-react";
import type { MarketDataSnapshot } from "@argus/shared-types";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Spinner } from "@workspace/ui/components/spinner";
import { AssetSelector } from "@/components/asset-selector";
import { TradingViewChart } from "@/components/trading-view-chart";
import { PageHeader } from "@/components/page-header";
import { AgentCard, type AgentCardData } from "@/components/agent-card";
import { ConsensusBar } from "@/components/consensus-bar";
import { SnapshotSummary } from "@/components/snapshot-summary";
import { voteTextClass } from "@/components/vote-badge";
import { HashText } from "@/components/hash-text";
import { AGENT_ROSTER } from "@/lib/agents";
import { ApiError, streamAnalysis } from "@/lib/api";
import type { AgentOutcome, AnalysisResponse } from "@/lib/analysis/types";
import { SealPanel } from "@/components/seal-panel";

type RunState =
  | { status: "idle" }
  | { status: "running"; snapshot: MarketDataSnapshot | null; outcomes: Record<string, AgentOutcome> }
  | { status: "done"; result: AnalysisResponse }
  | { status: "error"; message: string; httpStatus: number };

function toCard(agentId: string, outcome: AgentOutcome | undefined): AgentCardData {
  if (!outcome) return { agentId, status: "pending" };
  const v = outcome.vote;
  return {
    agentId,
    status: outcome.status,
    error: outcome.error,
    vote: v?.vote,
    confidence: v?.confidence,
    reasoning: v?.reasoning,
    dataPointsCited: v?.dataPointsCited,
    promptVersion: v?.promptVersion,
    modelUsed: v?.modelUsed,
    provider: v?.params?.provider,
  };
}

export function Workbench({ costCents, balanceCents }: { costCents: number; balanceCents: number }) {
  const router = useRouter();
  const [asset, setAsset] = useState("BTC");
  const [state, setState] = useState<RunState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const running = state.status === "running";

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState({ status: "running", snapshot: null, outcomes: {} });
    try {
      const result = await streamAnalysis(
        asset,
        (event) => {
          setState((prev) => {
            if (prev.status !== "running") return prev;
            if (event.type === "snapshot") return { ...prev, snapshot: event.snapshot };
            if (event.type === "agent") return { ...prev, outcomes: { ...prev.outcomes, [event.outcome.agentId]: event.outcome } };
            return prev;
          });
        },
        ac.signal,
      );
      setState({ status: "done", result });
      router.refresh(); // update credit balance in the header
    } catch (err) {
      if (ac.signal.aborted) return;
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Analysis failed",
        httpStatus: err instanceof ApiError ? err.status : 0,
      });
    }
  }, [asset, router]);

  const outcomes: Record<string, AgentOutcome> =
    state.status === "running"
      ? state.outcomes
      : state.status === "done"
        ? Object.fromEntries(state.result.agentOutcomes.map((o) => [o.agentId, o]))
        : {};
  const snapshot = state.status === "running" ? state.snapshot : state.status === "done" ? state.result.snapshot : null;
  const reported = Object.keys(outcomes).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Syndicate"
        title="Workbench"
        description="Pick an asset and convene the committee. Each analyst sees the same hashed market snapshot and votes independently."
        actions={
          <>
            <AssetSelector value={asset} onChange={setAsset} disabled={running} />
            <button
              type="button"
              disabled={running}
              onClick={run}
              className="inline-flex h-9 items-center gap-2 rounded-sm bg-foreground px-5 text-xs font-bold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? <Spinner className="text-background" /> : <Play className="size-3.5" />}
              {running ? "Deliberating…" : "Run analysis"}
              {!running && costCents > 0 && <span className="font-mono font-normal opacity-70">· ${(costCents / 100).toFixed(2)}</span>}
            </button>
          </>
        }
      />

      <div className="grid items-stretch gap-6 lg:grid-cols-12">
        <div className="h-[360px] sm:h-[440px] lg:col-span-7 lg:h-auto lg:min-h-[480px]">
          <TradingViewChart asset={asset} />
        </div>

        <section className="flex flex-col rounded-md border border-border bg-surface p-5 lg:col-span-5" aria-live="polite">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Consensus engine</p>
              <h2 className="font-serif text-lg font-bold">Committee decision</h2>
            </div>
            {state.status === "running" && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {reported}/{AGENT_ROSTER.length} reported
              </span>
            )}
          </div>

          {state.status === "idle" && balanceCents < costCents && (
            <div className="my-auto py-6">
              <Alert variant="warning">
                <AlertTitle>Out of credits</AlertTitle>
                <AlertDescription>
                  A run costs ${(costCents / 100).toFixed(2)} and your balance is ${(balanceCents / 100).toFixed(2)}.{" "}
                  <Link href="/pricing" className="underline">
                    See pricing
                  </Link>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {state.status === "idle" && balanceCents >= costCents && (
            <div className="my-auto py-10 text-center">
              <p className="font-serif text-base font-semibold">Ready when you are</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                Run an analysis on {asset} to see each analyst&apos;s vote stream in, then seal the result on-chain.
              </p>
            </div>
          )}

          {state.status === "running" && (
            <div className="my-auto space-y-3 py-8 text-center">
              <Spinner className="mx-auto size-6" />
              <p className="font-serif text-sm font-semibold">
                {snapshot ? "Analysts are deliberating…" : "Capturing market snapshot…"}
              </p>
              {snapshot && (
                <p className="text-[11px] text-muted-foreground">
                  Snapshot <HashText value={snapshot.hash} label="snapshot hash" />
                </p>
              )}
            </div>
          )}

          {state.status === "error" && (
            <div className="my-auto py-6">
              <Alert variant={state.httpStatus === 402 ? "warning" : "destructive"}>
                <AlertTitle>{state.httpStatus === 402 ? "Not enough credits" : "Analysis unavailable"}</AlertTitle>
                <AlertDescription>
                  {state.message}
                  {state.httpStatus === 402 && (
                    <>
                      {" "}
                      <Link href="/account" className="underline">
                        Add credits
                      </Link>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {state.status === "done" && <ResultSummary result={state.result} />}
        </section>
      </div>

      {snapshot && (
        <section className="rounded-md border border-border bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-brass">What the committee saw</h2>
            <span className="text-[11px] text-muted-foreground">
              Sources: {snapshot.sources.join(", ")} · hash <HashText value={snapshot.hash} label="snapshot hash" />
            </span>
          </div>
          <SnapshotSummary data={snapshot.data} unavailable={snapshot.unavailable} />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between border-b border-border pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Committee</p>
            <h2 className="font-serif text-lg font-bold">Analyst dossiers</h2>
          </div>
          <Link href="/methodology#agents" className="text-xs text-muted-foreground hover:text-foreground">
            How each analyst works →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {AGENT_ROSTER.map((a) =>
            state.status === "idle" || state.status === "error" ? (
              <IdleAgent key={a.id} id={a.id} />
            ) : (
              <AgentCard key={a.id} data={toCard(a.id, outcomes[a.id])} />
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function IdleAgent({ id }: { id: string }) {
  const a = AGENT_ROSTER.find((x) => x.id === id)!;
  return (
    <article className="rounded-md border border-border/70 bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-sm border border-border bg-surface-2 font-mono text-[10px] font-bold text-brass">
          {a.short}
        </span>
        <div>
          <h3 className="font-serif text-sm font-bold">{a.name}</h3>
          <p className="text-[10px] text-muted-foreground">{a.framework}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{a.inputs}</p>
    </article>
  );
}

function ResultSummary({ result }: { result: AnalysisResponse }) {
  const abstained = result.agentOutcomes.filter((o) => o.status === "abstained").length;
  const failed = result.agentOutcomes.filter((o) => o.status === "failed").length;
  return (
    <div className="mt-4 flex flex-1 flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recommendation</p>
          <p className={`mt-1 font-serif text-4xl font-extrabold tracking-tight ${voteTextClass(result.recommendation)}`}>
            {result.recommendation === "NONE" ? "No consensus" : result.recommendation}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] text-muted-foreground">Weighted confidence</p>
          <p className="tabular font-mono text-3xl font-bold">{result.confidence.toFixed(1)}%</p>
        </div>
      </div>

      <ConsensusBar breakdown={result.breakdown} />

      <p className="font-mono text-[11px] text-muted-foreground">
        {result.responsiveCount} voted
        {abstained > 0 && ` · ${abstained} abstained (missing data)`}
        {failed > 0 && <span className="text-destructive"> · {failed} failed</span>}
      </p>

      {result.status === "no_quorum" && (
        <Alert variant="destructive">
          <AlertTitle>No quorum</AlertTitle>
          <AlertDescription>
            Fewer than 3 analysts produced a valid vote, so this run can&apos;t be sealed. It&apos;s still saved to your history for
            the audit trail.
          </AlertDescription>
        </Alert>
      )}
      {result.status === "degraded" && (
        <Alert variant="warning">
          <AlertTitle>Degraded round</AlertTitle>
          <AlertDescription>Some analysts failed to respond. The consensus reflects only the valid votes.</AlertDescription>
        </Alert>
      )}
      {result.disagreement && result.status !== "no_quorum" && (
        <Alert variant="warning">
          <AlertTitle>Split committee</AlertTitle>
          <AlertDescription>The top two positions are within 10% of total weight — treat this call as low-conviction.</AlertDescription>
        </Alert>
      )}

      <p className="rounded-sm border border-border bg-surface-2 p-2 text-center text-[11px] text-muted-foreground">
        Research tool only — not financial advice.
      </p>

      <div className="mt-auto space-y-3 border-t border-border pt-4">
        {result.sealable && result.sealPayload ? (
          <SealPanel analysisId={result.id} payload={result.sealPayload} />
        ) : null}
        <Link href={`/d/${result.id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          Full decision record <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
