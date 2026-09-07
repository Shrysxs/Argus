"use client";

import { useState, useEffect } from "react";
import type { ConsensusResult, AgentVote, VoteDirection, DecisionPayload } from "@argus/shared-types";
import { AGENT_ROSTER } from "@/lib/agents";
import { recordDecisionApi } from "@/lib/api";
import { useWallet } from "@/hooks/use-wallet";

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

const PERSONA_ICONS: Record<string, string> = {
  "value-hunter": "⚖️",
  "momentum-trader": "📈",
  "macro-analyst": "🌐",
  "onchain-sleuth": "⛓️",
  "risk-guardian": "🛡️",
};

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

  const icon = PERSONA_ICONS[agentId] || "🤖";

  return (
    <div className={`group relative rounded-xl border p-4 transition-all duration-300 backdrop-blur-md ${
      isLoading
        ? "border-purple-500/50 bg-slate-950/80 shadow-[0_0_15px_rgba(139,92,246,0.15)] animate-pulse"
        : vote
        ? "border-white/10 bg-slate-950/60 hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]"
        : "border-white/5 bg-slate-950/30 opacity-75"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-sm border border-white/10">
            {icon}
          </span>
          <div>
            <p className="text-xs font-semibold text-foreground tracking-tight">
              {agent.name}
            </p>
            <p className="text-[10px] font-mono text-purple-400/80">
              {agent.framework}
            </p>
          </div>
        </div>

        {vote && (
          <span
            className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold tracking-wide ${voteBadgeColor(
              vote.vote
            )}`}
          >
            {vote.vote}
          </span>
        )}
      </div>

      {/* Skeleton pulse while loading */}
      {isLoading && (
        <div className="mt-4 space-y-2">
          <div className="h-2.5 w-3/4 animate-pulse rounded bg-purple-500/20" />
          <div className="h-2.5 w-1/2 animate-pulse rounded bg-purple-500/20" />
          <div className="h-2.5 w-5/6 animate-pulse rounded bg-purple-500/20" />
          <div className="pt-2 text-[10px] font-mono text-purple-400 animate-pulse">
            Scanning quantitative framework...
          </div>
        </div>
      )}

      {/* Real data */}
      {vote && (
        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>Confidence</span>
              <span className="font-bold text-foreground tabular-nums">
                {vote.confidence}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-900 border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${vote.confidence}%` }}
              />
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground/90 font-sans">
            {vote.reasoning}
          </p>

          {vote.dataPointsCited && vote.dataPointsCited.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {vote.dataPointsCited.map((cite, i) => (
                <span
                  key={i}
                  className="rounded bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[10px] font-mono text-purple-300"
                >
                  {cite}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between pt-2 border-t border-white/5 text-[9px] font-mono text-muted-foreground/60">
            <span>{vote.promptVersion}</span>
            <span>{vote.modelUsed}</span>
          </div>
        </div>
      )}

      {/* Dormant — no data, not loading */}
      {!isLoading && !vote && (
        <div className="mt-4 pt-2">
          <p className="text-[11px] font-mono text-muted-foreground/40 italic">
            Awaiting deliberation signal…
          </p>
        </div>
      )}
    </div>
  );
}

import { TradingViewChart } from "@/components/trading-view-chart";

export function AnalyzePanel({
  state,
  asset = "BTC",
}: {
  state: PanelState;
  asset?: string;
}) {
  const isLoading = state.status === "loading";
  const votes =
    state.status === "success" ? state.result.agentVotes : [];

  // Map votes by agentId for lookup
  const voteMap = new Map(votes.map((v) => [v.agentId, v]));

  const { address, isWrongNetwork, connect, switchNetwork, adapter } = useWallet();

  const [sealMode, setSealMode] = useState<"client" | "backend">("backend");
  const [userExplicitlySelectedMode, setUserExplicitlySelectedMode] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [sealTxHash, setSealTxHash] = useState<string | null>(null);
  const [sealError, setSealError] = useState<string | null>(null);

  // Automatically default to client wallet when wallet is connected (unless user explicitly chose backend)
  useEffect(() => {
    if (address && !userExplicitlySelectedMode) {
      setSealMode("client");
    } else if (!address && !userExplicitlySelectedMode) {
      setSealMode("backend");
    }
  }, [address, userExplicitlySelectedMode]);

  const handleSeal = async () => {
    if (state.status !== "success") return;
    setSealing(true);
    setSealError(null);

    try {
      const rawResult = state.result as ConsensusResult & {
        dataSnapshotHash?: string;
        promptVersionHash?: string;
        reasoningHash?: string;
        snapshot?: { asset?: string; timestamp?: number };
      };

      const defaultHash = "0x1111111111111111111111111111111111111111111111111111111111111111";

      const payload: DecisionPayload = {
        asset: rawResult.snapshot?.asset || asset,
        timestamp: rawResult.snapshot?.timestamp || Date.now(),
        consensus: state.result,
        dataSnapshotHash: rawResult.dataSnapshotHash || defaultHash,
        promptVersionHash: rawResult.promptVersionHash || rawResult.reasoningHash || defaultHash,
        reasoningHash: rawResult.reasoningHash || rawResult.promptVersionHash || defaultHash,
      };

      if (sealMode === "client") {
        if (!address) {
          await connect();
          return;
        }
        if (isWrongNetwork) {
          await switchNetwork();
          return;
        }
        const res = await adapter.recordDecision(payload);
        setSealTxHash(res.txHash);
      } else {
        const res = await recordDecisionApi(payload);
        setSealTxHash(res.txHash);
      }
    } catch (err) {
      setSealError(err instanceof Error ? err.message : "Failed to seal decision on-chain");
    } finally {
      setSealing(false);
    }
  };

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <div className="space-y-8">
      {/* Degraded mode warning banner */}
      {state.status === "success" && state.result.degraded && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-amber-400">
          <p className="text-xs font-medium">
            ⚠️ Degraded Syndicate Round: Only {state.result.responsiveCount ?? votes.length} of 5 agents responded.
            Consensus threshold (3/5) was partially degraded.
          </p>
        </div>
      )}

      {/* Main Single-Screen Workbench Grid */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column (7 Cols): Live TradingView Chart */}
        <div className="lg:col-span-7 h-[480px]">
          <TradingViewChart asset={asset} />
        </div>

        {/* Right Column (5 Cols): Consensus & Sealing Box */}
        <div className="lg:col-span-5 h-[480px] flex flex-col justify-between rounded-xl border border-white/10 bg-slate-950/60 p-6 backdrop-blur-md shadow-2xl">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Consensus Engine
                </span>
                <h2 className="text-lg font-bold text-foreground">
                  Syndicate Deliberation
                </h2>
              </div>
              <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-mono text-purple-400 border border-purple-500/20">
                5 Personas
              </span>
            </div>

            {state.status === "idle" && (
              <div className="my-12 text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  ⚡
                </div>
                <p className="text-sm font-medium text-foreground">
                  Awaiting Deliberation Trigger
                </p>
                <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto">
                  Click &quot;Analyze&quot; above to run the 5 specialized AI agents across quantitative metrics for {asset}.
                </p>
              </div>
            )}

            {state.status === "loading" && (
              <div className="my-12 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center">
                  <svg
                    className="h-8 w-8 animate-spin text-[var(--accent-glow)]"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground">
                  Deliberating across 5 frameworks...
                </p>
                <p className="text-xs text-muted-foreground">
                  Value • Momentum • Macro • On-chain • Risk
                </p>
              </div>
            )}

            {state.status === "error" && (
              <div className="my-8 rounded-lg border border-red-400/20 bg-red-400/5 px-5 py-4 text-center">
                <p className="text-sm font-medium text-red-400">
                  Analysis unavailable
                </p>
                <p className="mt-1 text-xs text-red-400/70">{state.message}</p>
              </div>
            )}

            {state.status === "success" && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Recommendation
                    </p>
                    <p className="mt-1 text-3xl font-extrabold tracking-tight">
                      {state.result.recommendation}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-muted-foreground">Confidence Score</p>
                    <p className="text-3xl font-extrabold tabular-nums text-[var(--accent-glow)]">
                      {state.result.confidence.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Vote breakdown bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Vote Breakdown</span>
                    <span className="font-mono">Weighted Consensus</span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    {(
                      Object.entries(state.result.breakdown) as [
                        VoteDirection,
                        number,
                      ][]
                    ).map(([direction, weight]) => (
                      <span key={direction} className="font-mono">
                        {direction}:{" "}
                        <strong className="text-foreground">{weight.toFixed(0)}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {state.result.disagreement && (
                  <div className="rounded border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-400">
                    ⚠️ High Disagreement: Committee votes are split near threshold.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* On-Chain Sealing Box inside Right Column */}
          {state.status === "success" && (
            <div className="pt-4 border-t border-white/10 space-y-3">
              {!sealTxHash && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Select Sealing Signer Path:
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {/* Option 1: Connected Client Wallet */}
                      <button
                        type="button"
                        onClick={() => {
                          setSealMode("client");
                          setUserExplicitlySelectedMode(true);
                        }}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all ${
                          sealMode === "client"
                            ? "border-[var(--accent-glow)] bg-[var(--accent-glow)]/10 text-foreground font-medium"
                            : "border-border/50 bg-card/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${sealMode === "client" ? "bg-[var(--accent-glow)]" : "bg-muted"}`} />
                        <span>Client Wallet</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({address ? truncatedAddress : "Not Connected"})
                        </span>
                      </button>

                      {/* Option 2: Backend System Signer */}
                      <button
                        type="button"
                        onClick={() => {
                          setSealMode("backend");
                          setUserExplicitlySelectedMode(true);
                        }}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all ${
                          sealMode === "backend"
                            ? "border-[var(--accent-glow)] bg-[var(--accent-glow)]/10 text-foreground font-medium"
                            : "border-border/50 bg-card/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${sealMode === "backend" ? "bg-[var(--accent-glow)]" : "bg-muted"}`} />
                        <span>Backend Signer</span>
                        <span className="text-[10px] text-muted-foreground">
                          (System Keystore)
                        </span>
                      </button>
                    </div>

                    <div className="text-[11px] text-muted-foreground/80 pt-0.5">
                      {sealMode === "client" ? (
                        <span>
                          <strong className="text-foreground font-medium">Signer:</strong> {address ? address : "Connect Wallet"} •{" "}
                          <strong className="text-amber-400 font-medium">Gas:</strong> User Pays (~0.0001 MON)
                        </span>
                      ) : (
                        <span>
                          <strong className="text-foreground font-medium">Signer:</strong> System Keystore •{" "}
                          <strong className="text-emerald-400 font-medium">Gas:</strong> Protocol Pays (0 MON for User)
                        </span>
                      )}
                    </div>
                  </div>

                  {sealMode === "client" && !address ? (
                    <button
                      type="button"
                      onClick={connect}
                      className="w-full rounded-lg bg-[var(--accent-glow)] py-2 text-xs font-medium text-[oklch(0.15_0_0)] transition-opacity hover:opacity-90"
                    >
                      Connect Wallet to Seal
                    </button>
                  ) : sealMode === "client" && isWrongNetwork ? (
                    <button
                      type="button"
                      onClick={switchNetwork}
                      className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 py-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                    >
                      Switch to Monad Testnet
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={sealing}
                      onClick={handleSeal}
                      className="w-full rounded-lg bg-[var(--accent-glow)] py-2 text-xs font-medium text-[oklch(0.15_0_0)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sealing
                        ? "Sealing On-Chain…"
                        : sealMode === "client"
                        ? "Seal On-Chain (Client Signed)"
                        : "Seal On-Chain (Backend Signed)"}
                    </button>
                  )}
                </div>
              )}

              {sealTxHash && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400">
                  <span className="font-medium">✓ Sealed On-Chain ({sealMode === "client" ? "Client Signed" : "Backend Signed"}):</span>
                  <a
                    href={`https://testnet.monadexplorer.com/tx/${sealTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono underline hover:text-emerald-300"
                  >
                    {sealTxHash.slice(0, 10)}...{sealTxHash.slice(-8)}
                  </a>
                </div>
              )}

              {sealError && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-400">
                  <span className="font-medium">Sealing Error:</span> {sealError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Committee Chamber — 5 Agent Deliberation Cards */}
      <div className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              The AI Investment Committee
            </h2>
            <p className="text-sm font-semibold text-foreground">
              Specialized Agent Personas & Deliberation Cards
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground/60">
            5/5 Frameworks Active
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {AGENT_ROSTER.map((agent) => (
            <AgentCard
              key={agent.id}
              agentId={agent.id}
              vote={voteMap.get(agent.id)}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


