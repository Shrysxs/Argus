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
      return "text-[#16A34A] bg-[#16A34A]/10 border-[#16A34A]/30";
    case "SELL":
      return "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/30";
    case "HOLD":
      return "text-[#D97706] bg-[#D97706]/10 border-[#D97706]/30";
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
        ? "border-[#1E222A] bg-[#12141A] animate-pulse"
        : vote
        ? "border-[#1E222A] bg-[#12141A] hover:border-[#B08D57]/40"
        : "border-[#1E222A]/50 bg-[#0A0B0D] opacity-75"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#181A24] text-[10px] font-mono font-bold border border-[#1E222A] text-[#B08D57]">
            {icon}
          </span>
          <div>
            <p className="text-xs font-serif font-bold text-[#F3F4F6] tracking-tight">
              {agent.name}
            </p>
            <p className="text-[10px] font-mono text-neutral-400">
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
          <div className="pt-2 text-[10px] font-mono text-neutral-500 animate-pulse">
            Executing quantitative model…
          </div>
        </div>
      )}

      {/* Real data */}
      {vote && (
        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span>Confidence Conviction</span>
              <span className="font-bold font-mono text-[#F3F4F6] tabular-nums">
                {vote.confidence}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-none bg-[#181A24] border border-[#1E222A]">
              <div
                className={`h-full transition-all duration-300 ${
                  vote.vote === "BUY"
                    ? "bg-[#16A34A]"
                    : vote.vote === "SELL"
                    ? "bg-[#DC2626]"
                    : "bg-[#D97706]"
                }`}
                style={{ width: `${vote.confidence}%` }}
              />
            </div>
          </div>

          <p className="text-xs leading-relaxed text-neutral-300 font-sans">
            {vote.reasoning}
          </p>

          {vote.dataPointsCited && vote.dataPointsCited.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {vote.dataPointsCited.map((cite, i) => (
                <span
                  key={i}
                  className="rounded-sm bg-[#181A24] border border-[#1E222A] px-1.5 py-0.5 text-[10px] font-mono text-neutral-300"
                >
                  {cite}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between pt-2 border-t border-[#1E222A] text-[9px] font-mono text-neutral-500">
            <span className="text-[#B08D57] font-semibold">{vote.promptVersion}</span>
            <span>{vote.modelUsed}</span>
          </div>
        </div>
      )}

      {/* Dormant: no data, not loading */}
      {!isLoading && !vote && (
        <div className="mt-4 pt-2">
          <p className="text-[11px] font-mono text-neutral-500 italic">
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
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-400">
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
        <div className="lg:col-span-5 h-[480px] flex flex-col justify-between rounded-sm border border-[#1E222A] bg-[#12141A] p-6">
          <div>
            <div className="flex items-center justify-between border-b border-[#1E222A] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B08D57]">
                  Consensus Engine
                </span>
                <h2 className="text-lg font-serif font-bold text-[#F3F4F6]">
                  Syndicate Deliberation
                </h2>
              </div>
              <span className="rounded-sm bg-[#181A24] px-2.5 py-1 text-[10px] font-mono text-neutral-300 border border-[#1E222A]">
                5 Models
              </span>
            </div>

            {state.status === "idle" && (
              <div className="my-12 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm bg-[#181A24] border border-[#1E222A] text-[#B08D57] font-mono font-bold text-sm">
                  SYS
                </div>
                <p className="text-sm font-serif font-semibold text-[#F3F4F6]">
                  Awaiting Deliberation Trigger
                </p>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto font-sans">
                  Click &quot;Run Analysis&quot; above to execute 5 specialized model frameworks for {asset}.
                </p>
              </div>
            )}

            {state.status === "loading" && (
              <div className="my-12 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center">
                  <svg
                    className="h-8 w-8 animate-spin text-[#B08D57]"
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
                <p className="text-sm font-serif font-semibold text-[#F3F4F6]">
                  Deliberating across 5 frameworks…
                </p>
                <p className="text-xs font-mono text-neutral-400">
                  Value • Momentum • Macro • On-chain • Risk
                </p>
              </div>
            )}

            {state.status === "error" && (
              <div className="my-8 rounded-sm border border-red-500/30 bg-red-500/10 px-5 py-4 text-center">
                <p className="text-sm font-serif font-medium text-red-400">
                  Analysis Unavailable
                </p>
                <p className="mt-1 text-xs font-mono text-red-400/80">{state.message}</p>
              </div>
            )}

            {state.status === "success" && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                      Recommendation
                    </p>
                    <p className={`mt-1 text-3xl font-serif font-extrabold tracking-tight ${
                      state.result.recommendation === "BUY"
                        ? "text-[#16A34A]"
                        : state.result.recommendation === "SELL"
                        ? "text-[#DC2626]"
                        : "text-[#D97706]"
                    }`}>
                      {state.result.recommendation}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono text-neutral-400">Confidence Score</p>
                    <p className="text-3xl font-mono font-bold tabular-nums text-[#F3F4F6]">
                      {state.result.confidence.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Prominent Research Disclaimer directly next to signal output */}
                <div className="rounded-sm border border-[#1E222A] bg-[#181A24] p-2.5 text-center text-xs font-sans text-neutral-300">
                  <span className="font-semibold text-[#F3F4F6]">Research &amp; educational tool only.</span> Not financial advice.
                </div>

                {/* Vote breakdown bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-neutral-400 font-mono">
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
                      <span key={direction} className="text-neutral-300">
                        {direction}:{" "}
                        <strong className="text-[#F3F4F6]">{weight.toFixed(0)}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {state.result.disagreement && (
                  <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-mono text-amber-400">
                    High Disagreement: Committee votes are split near threshold.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* On-Chain Sealing Box inside Right Column */}
          {state.status === "success" && (
            <div className="pt-4 border-t border-[#1E222A] space-y-3">
              {!sealTxHash && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-neutral-400 font-mono">
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
                            ? "border-[#B08D57] bg-[#181A24] text-[#F3F4F6] font-semibold"
                            : "border-[#1E222A] bg-[#0A0B0D] text-neutral-400 hover:text-[#F3F4F6]"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${sealMode === "client" ? "bg-[#B08D57]" : "bg-neutral-500"}`} />
                        <span>Client Wallet</span>
                        <span className={`text-[10px] ${sealMode === "client" ? "text-neutral-300" : "text-neutral-500"}`}>
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
                            ? "border-[#B08D57] bg-[#181A24] text-[#F3F4F6] font-semibold"
                            : "border-[#1E222A] bg-[#0A0B0D] text-neutral-400 hover:text-[#F3F4F6]"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${sealMode === "backend" ? "bg-[#B08D57]" : "bg-neutral-500"}`} />
                        <span>Backend Signer</span>
                        <span className={`text-[10px] ${sealMode === "backend" ? "text-neutral-300" : "text-neutral-500"}`}>
                          (System Keystore)
                        </span>
                      </button>
                    </div>

                    <div className="text-[11px] text-neutral-400 pt-0.5 font-mono">
                      {sealMode === "client" ? (
                        <span>
                          <strong className="text-[#F3F4F6] font-medium">Signer:</strong> {address ? address : "Connect Wallet"} •{" "}
                          <strong className="text-amber-400 font-medium">Gas:</strong> User Pays (~0.0001 MON)
                        </span>
                      ) : (
                        <span>
                          <strong className="text-[#F3F4F6] font-medium">Signer:</strong> System Keystore •{" "}
                          <strong className="text-emerald-400 font-medium">Gas:</strong> Protocol Pays (0 MON)
                        </span>
                      )}
                    </div>
                  </div>

                  {sealMode === "client" && !address ? (
                    <button
                      type="button"
                      onClick={connect}
                      className="w-full rounded-sm bg-[#F3F4F6] py-2 text-xs font-bold text-[#0A0B0D] transition-colors hover:bg-neutral-200"
                    >
                      Connect Wallet to Seal
                    </button>
                  ) : sealMode === "client" && isWrongNetwork ? (
                    <button
                      type="button"
                      onClick={switchNetwork}
                      className="w-full rounded-sm border border-amber-500/40 bg-amber-500/10 py-2 text-xs font-mono text-amber-400 transition-colors hover:bg-amber-500/20"
                    >
                      Switch to Monad Testnet
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={sealing}
                      onClick={handleSeal}
                      className="w-full rounded-sm bg-[#F3F4F6] py-2 text-xs font-bold text-[#0A0B0D] transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
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
                <div className="flex items-center gap-2 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400 font-mono">
                  <span className="font-semibold">Sealed On-Chain ({sealMode === "client" ? "Client Signed" : "Backend Signed"}):</span>
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
                <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-400 font-mono">
                  <span className="font-semibold">Sealing Error:</span> {sealError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Committee Chamber: 5 agent deliberation cards */}
      <div className="pt-6">
        <div className="flex items-center justify-between mb-4 border-b border-[#1E222A] pb-3">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#B08D57]">
              Investment Committee Roster
            </h2>
            <p className="text-sm font-serif font-semibold text-[#F3F4F6]">
              Specialized Model Frameworks &amp; Deliberation Dossiers
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
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
