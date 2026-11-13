"use client";

import { useState, useEffect } from "react";
import type { ConsensusResult, AgentVote, VoteDirection, DecisionPayload } from "@argus/shared-types";
import { AGENT_ROSTER } from "@/lib/agents";
import { recordDecisionApi } from "@/lib/api";
import { useWallet } from "@/hooks/use-wallet";
import { TradingViewChart } from "@/components/trading-view-chart";

type PanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; result: ConsensusResult };

function voteBadgeColor(vote: VoteDirection): string {
  switch (vote) {
    case "BUY":
      return "text-buy bg-buy/10 border-buy/30";
    case "SELL":
      return "text-sell bg-sell/10 border-sell/30";
    case "HOLD":
      return "text-hold bg-hold/10 border-hold/30";
  }
}

const PERSONA_ICONS: Record<string, string> = {
  "value-hunter": "VAL",
  "momentum-trader": "MOM",
  "macro-analyst": "MAC",
  "onchain-sleuth": "ONC",
  "risk-guardian": "RSK",
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

  const icon = PERSONA_ICONS[agentId] || "MDL";

  return (
    <div className={`relative rounded-sm border p-4 transition-colors ${
      isLoading
        ? "border-border bg-surface animate-pulse"
        : vote
        ? "border-border bg-surface hover:border-brass/40"
        : "border-border/50 bg-background opacity-75"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-surface-2 text-[10px] font-mono font-bold border border-border text-brass">
            {icon}
          </span>
          <div>
            <p className="text-xs font-serif font-bold text-foreground tracking-tight">
              {agent.name}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {agent.framework}
            </p>
          </div>
        </div>

        {vote && (
          <span
            className={`inline-flex rounded-sm border px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider ${voteBadgeColor(
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
          <div className="h-2.5 w-3/4 animate-pulse rounded-sm bg-white/10" />
          <div className="h-2.5 w-1/2 animate-pulse rounded-sm bg-white/10" />
          <div className="h-2.5 w-5/6 animate-pulse rounded-sm bg-white/10" />
          <div className="pt-2 text-[10px] font-mono text-muted-foreground/80 animate-pulse">
            Executing quantitative model…
          </div>
        </div>
      )}

      {/* Real data */}
      {vote && (
        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>Confidence Conviction</span>
              <span className="font-bold font-mono text-foreground tabular-nums">
                {vote.confidence}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-none bg-surface-2 border border-border">
              <div
                className={`h-full transition-all duration-300 ${
                  vote.vote === "BUY"
                    ? "bg-buy"
                    : vote.vote === "SELL"
                    ? "bg-sell"
                    : "bg-hold"
                }`}
                style={{ width: `${vote.confidence}%` }}
              />
            </div>
          </div>

          <p className="text-xs leading-relaxed text-foreground/80 font-sans">
            {vote.reasoning}
          </p>

          {vote.dataPointsCited && vote.dataPointsCited.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {vote.dataPointsCited.map((cite, i) => (
                <span
                  key={i}
                  className="rounded-sm bg-surface-2 border border-border px-1.5 py-0.5 text-[10px] font-mono text-foreground/80"
                >
                  {cite}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between pt-2 border-t border-border text-[9px] font-mono text-muted-foreground/80">
            <span className="text-brass font-semibold">{vote.promptVersion}</span>
            <span>{vote.modelUsed}</span>
          </div>
        </div>
      )}

      {/* Dormant: no data, not loading */}
      {!isLoading && !vote && (
        <div className="mt-4 pt-2">
          <p className="text-[11px] font-mono text-muted-foreground/80 italic">
            Awaiting committee deliberation…
          </p>
        </div>
      )}
    </div>
  );
}

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
        // Persist sealing status to backend DB for history tracking
        await recordDecisionApi({ ...payload, txHash: res.txHash, id: (rawResult as any).id }).catch((err) => {
          console.warn("Backend DB sync for client-signed seal warning:", err);
        });
      } else {
        const res = await recordDecisionApi({ ...payload, id: (rawResult as any).id });
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
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-warning">
          <p className="text-xs font-medium">
            Degraded Syndicate Round: Only {state.result.responsiveCount ?? votes.length} of 5 models responded.
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
        <div className="lg:col-span-5 h-[480px] flex flex-col justify-between rounded-sm border border-border bg-surface p-6">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-brass">
                  Consensus Engine
                </span>
                <h2 className="text-lg font-serif font-bold text-foreground">
                  Syndicate Deliberation
                </h2>
              </div>
              <span className="rounded-sm bg-surface-2 px-2.5 py-1 text-[10px] font-mono text-foreground/80 border border-border">
                5 Models
              </span>
            </div>

            {state.status === "idle" && (
              <div className="my-12 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm bg-surface-2 border border-border text-brass font-mono font-bold text-sm">
                  SYS
                </div>
                <p className="text-sm font-serif font-semibold text-foreground">
                  Awaiting Deliberation Trigger
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto font-sans">
                  Click &quot;Run Analysis&quot; above to execute 5 specialized model frameworks for {asset}.
                </p>
              </div>
            )}

            {state.status === "loading" && (
              <div className="my-12 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center">
                  <svg
                    className="h-8 w-8 animate-spin text-brass"
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
                <p className="text-sm font-serif font-semibold text-foreground">
                  Deliberating across 5 frameworks…
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  Value • Momentum • Macro • On-chain • Risk
                </p>
              </div>
            )}

            {state.status === "error" && (
              <div className="my-8 rounded-sm border border-destructive/30 bg-destructive/10 px-5 py-4 text-center">
                <p className="text-sm font-serif font-medium text-destructive">
                  Analysis Unavailable
                </p>
                <p className="mt-1 text-xs font-mono text-destructive/80">{state.message}</p>
              </div>
            )}

            {state.status === "success" && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      Recommendation
                    </p>
                    <p className={`mt-1 text-3xl font-serif font-extrabold tracking-tight ${
                      state.result.recommendation === "BUY"
                        ? "text-buy"
                        : state.result.recommendation === "SELL"
                        ? "text-sell"
                        : "text-hold"
                    }`}>
                      {state.result.recommendation}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono text-muted-foreground">Confidence Score</p>
                    <p className="text-3xl font-mono font-bold tabular-nums text-foreground">
                      {state.result.confidence.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Prominent Research Disclaimer directly next to signal output */}
                <div className="rounded-sm border border-border bg-surface-2 p-2.5 text-center text-xs font-sans text-foreground/80">
                  <span className="font-semibold text-foreground">Research &amp; educational tool only.</span> Not financial advice.
                </div>

                {/* Vote breakdown bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>Vote Breakdown</span>
                    <span>Weighted Consensus</span>
                  </div>
                  <div className="flex gap-4 text-xs font-mono">
                    {(
                      Object.entries(state.result.breakdown) as [
                        VoteDirection,
                        number,
                      ][]
                    ).map(([direction, weight]) => (
                      <span key={direction} className="text-foreground/80">
                        {direction}:{" "}
                        <strong className="text-foreground">{weight.toFixed(0)}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {state.result.disagreement && (
                  <div className="rounded-sm border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-mono text-warning">
                    High Disagreement: Committee votes are split near threshold.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* On-Chain Sealing Box inside Right Column */}
          {state.status === "success" && (
            <div className="pt-4 border-t border-border space-y-3">
              {!sealTxHash && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground font-mono">
                      Select signer path:
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                      {/* Option 1: Connected Client Wallet */}
                      <button
                        type="button"
                        onClick={() => {
                          setSealMode("client");
                          setUserExplicitlySelectedMode(true);
                        }}
                        className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 transition-all ${
                          sealMode === "client"
                            ? "border-brass bg-surface-2 text-foreground font-semibold"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${sealMode === "client" ? "bg-brass" : "bg-muted-foreground"}`} />
                        <span>Client Wallet</span>
                        <span className={`text-[10px] ${sealMode === "client" ? "text-foreground/80" : "text-muted-foreground/80"}`}>
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
                        className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 transition-all ${
                          sealMode === "backend"
                            ? "border-brass bg-surface-2 text-foreground font-semibold"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${sealMode === "backend" ? "bg-brass" : "bg-muted-foreground"}`} />
                        <span>Backend Signer</span>
                        <span className={`text-[10px] ${sealMode === "backend" ? "text-foreground/80" : "text-muted-foreground/80"}`}>
                          (System Keystore)
                        </span>
                      </button>
                    </div>

                    <div className="text-[11px] text-muted-foreground pt-0.5 font-mono">
                      {sealMode === "client" ? (
                        <span>
                          <strong className="text-foreground font-medium">Signer:</strong> {address ? address : "Connect Wallet"} •{" "}
                          <strong className="text-warning font-medium">Gas:</strong> User Pays (~0.0001 MON)
                        </span>
                      ) : (
                        <span>
                          <strong className="text-foreground font-medium">Signer:</strong> System Keystore •{" "}
                          <strong className="text-success font-medium">Gas:</strong> Protocol Pays (0 MON)
                        </span>
                      )}
                    </div>
                  </div>

                  {sealMode === "client" && !address ? (
                    <button
                      type="button"
                      onClick={connect}
                      className="w-full rounded-sm bg-foreground py-2 text-xs font-bold text-background transition-colors hover:bg-foreground/90"
                    >
                      Connect Wallet to Seal
                    </button>
                  ) : sealMode === "client" && isWrongNetwork ? (
                    <button
                      type="button"
                      onClick={switchNetwork}
                      className="w-full rounded-sm border border-warning/40 bg-warning/10 py-2 text-xs font-mono text-warning transition-colors hover:bg-warning/20"
                    >
                      Switch to Monad Testnet
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={sealing}
                      onClick={handleSeal}
                      className="w-full rounded-sm bg-foreground py-2 text-xs font-bold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sealing
                        ? "Sealing On-Chain…"
                        : sealMode === "client"
                        ? "Seal Decision On-Chain (Client Signed)"
                        : "Seal Decision On-Chain (Backend Signed)"}
                    </button>
                  )}
                </div>
              )}

              {sealTxHash && (
                <div className="flex items-center gap-2 rounded-sm border border-success/30 bg-success/10 px-4 py-2 text-xs text-success font-mono">
                  <span className="font-semibold">Sealed On-Chain ({sealMode === "client" ? "Client Signed" : "Backend Signed"}):</span>
                  <a
                    href={`https://testnet.monadexplorer.com/tx/${sealTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono underline hover:text-success"
                  >
                    {sealTxHash.slice(0, 10)}...{sealTxHash.slice(-8)}
                  </a>
                </div>
              )}

              {sealError && (
                <div className="rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive font-mono">
                  <span className="font-semibold">Sealing Error:</span> {sealError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Committee Chamber: 5 agent deliberation cards */}
      <div className="pt-6">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-brass">
              Investment Committee Roster
            </h2>
            <p className="text-sm font-serif font-semibold text-foreground">
              Specialized Model Frameworks &amp; Deliberation Dossiers
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
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
