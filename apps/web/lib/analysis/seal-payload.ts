import type { DecisionPayload, VoteDirection } from "@argus/shared-types";

interface SealableRow {
  asset: string;
  recommendation: string;
  confidence: number;
  breakdown: unknown;
  disagreement: boolean;
  dataSnapshotHash: string;
  promptVersionHash: string;
  reasoningHash: string | null;
  createdAt: Date;
}

/**
 * The exact payload sealed on-chain for a stored analysis. Built only from
 * the database row — never from client input — and shared with the browser
 * so a client-signed transaction can be verified field-for-field.
 */
export function buildSealPayload(row: SealableRow): DecisionPayload {
  return {
    asset: row.asset,
    // Second precision: this is what the contract stores.
    timestamp: Math.floor(row.createdAt.getTime() / 1000) * 1000,
    consensus: {
      recommendation: row.recommendation as VoteDirection,
      confidence: row.confidence,
      breakdown: row.breakdown as Record<VoteDirection, number>,
      disagreement: row.disagreement,
      agentVotes: [],
    },
    dataSnapshotHash: row.dataSnapshotHash,
    promptVersionHash: row.promptVersionHash,
    reasoningHash: row.reasoningHash ?? "",
  };
}

export function isSealable(row: { status: string; recommendation: string }): boolean {
  return row.status !== "no_quorum" && row.recommendation !== "NONE";
}
