import type {
  AgentRunStatus,
  DecisionPayload,
  AgentVote,
  MarketDataSnapshot,
  VoteDirection,
} from "@argus/shared-types";

/** complete: every agent voted · degraded: quorum met but some failed · no_quorum: cannot be sealed */
export type AnalysisStatus = "complete" | "degraded" | "no_quorum";

/** Client-safe view of one agent's outcome (raw provider attempts stay server-side). */
export interface AgentOutcome {
  agentId: string;
  status: AgentRunStatus;
  vote: AgentVote | null;
  error?: string;
}

export interface AnalysisResponse {
  id: string;
  asset: string;
  status: AnalysisStatus;
  /** "NONE" when no agent produced a valid vote — never a fabricated HOLD. */
  recommendation: VoteDirection | "NONE";
  confidence: number;
  breakdown: Record<VoteDirection, number>;
  disagreement: boolean;
  agentVotes: AgentVote[];
  agentOutcomes: AgentOutcome[];
  responsiveCount: number;
  rosterSize: number;
  degraded: boolean;
  sealable: boolean;
  dataSnapshotHash: string;
  promptVersionHash: string;
  reasoningHash: string;
  snapshot: MarketDataSnapshot;
  createdAt: string;
  /** Exact payload to sign when sealing (null when not sealable). */
  sealPayload: DecisionPayload | null;
}

/** Events emitted while an analysis runs (streamed to the UI over SSE). */
export type AnalysisEvent =
  | { type: "snapshot"; snapshot: MarketDataSnapshot }
  | { type: "agent"; outcome: AgentOutcome }
  | { type: "result"; result: AnalysisResponse }
  | { type: "error"; error: string; status: number };
