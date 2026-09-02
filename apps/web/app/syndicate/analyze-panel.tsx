"use client";

import type { ConsensusResult, AgentVote, VoteDirection } from "@argus/shared-types";
import { AGENT_ROSTER } from "@/lib/agents";

type PanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; result: ConsensusResult };

function voteBadgeColor(vote: VoteDirection): string {
  switch (vote) {
    case "BUY":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "SELL":
      return "text-red-400 bg-red-400/10 border-red-400/20";
    case "HOLD":
      return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  }
}

function AgentCard({
  agentId,
  vote,
  isLoading,
}: {
  agentId: string;
  vote: AgentVote | undefined;
  isLoading: boolean;
}) {
  const agent = AGENT_ROSTER.find((a) => a.id === agentId);
  if (!agent) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{agent.name}</p>
        {vote && (
          <span
            className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${voteBadgeColor(vote.vote)}`}
          >
            {vote.vote}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{agent.framework}</p>

      {/* Skeleton pulse while loading */}
      {isLoading && (
        <div className="mt-3 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        </div>
      )}

      {/* Real data */}
      {vote && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence</span>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--accent-glow)] transition-all duration-500"
                  style={{ width: `${vote.confidence}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-medium tabular-nums">
              {vote.confidence}%
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {vote.reasoning}
          </p>

          {vote.dataPointsCited && vote.dataPointsCited.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {vote.dataPointsCited.map((cite, i) => (
                <span
                  key={i}
                  className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {cite}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/60">
            <span>{vote.promptVersion}</span>
            <span>{vote.modelUsed}</span>
          </div>
        </div>
      )}

      {/* Dormant — no data, not loading */}
      {!isLoading && !vote && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground/40">
            Awaiting analysis…
          </p>
        </div>
      )}
    </div>
  );
}

export function AnalyzePanel({ state }: { state: PanelState }) {
  const isLoading = state.status === "loading";
  const votes =
    state.status === "success" ? state.result.agentVotes : [];

  // Map votes by agentId for lookup
  const voteMap = new Map(votes.map((v) => [v.agentId, v]));

  return (
    <div className="space-y-6">
      {/* Degraded mode warning banner */}
      {state.status === "success" && state.result.degraded && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-amber-400">
          <p className="text-xs font-medium">
            ⚠️ Degraded Syndicate Round: Only {state.result.responsiveCount ?? votes.length} of 5 agents responded.
            Consensus threshold (3/5) was partially degraded.
          </p>
        </div>
      )}

      {/* Agent grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {AGENT_ROSTER.map((agent) => (
          <AgentCard
            key={agent.id}
            agentId={agent.id}
            vote={voteMap.get(agent.id)}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Error state */}
      {state.status === "error" && (
        <div className="rounded-lg border border-red-400/20 bg-red-400/5 px-5 py-4 text-center">
          <p className="text-sm font-medium text-red-400">
            Analysis unavailable
          </p>
          <p className="mt-1 text-xs text-red-400/70">{state.message}</p>
        </div>
      )}

      {/* Consensus summary — only when real data exists */}
      {state.status === "success" && (
        <div className="rounded-lg border border-[var(--accent-glow)]/20 bg-[var(--accent-glow)]/5 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Consensus
              </p>
              <p className="mt-1 text-2xl font-bold">
                {state.result.recommendation}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className="text-2xl font-bold tabular-nums">
                {state.result.confidence.toFixed(1)}%
              </p>
            </div>

            <div className="flex gap-4 text-xs text-muted-foreground">
              {(
                Object.entries(state.result.breakdown) as [
                  VoteDirection,
                  number,
                ][]
              ).map(([direction, weight]) => (
                <span key={direction}>
                  {direction}{" "}
                  <span className="font-medium text-foreground">
                    {weight.toFixed(0)}
                  </span>
                </span>
              ))}
            </div>

            {state.result.disagreement && (
              <span className="rounded border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                High disagreement
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

