import { createHash } from "node:crypto";
import {
  canonicalJson,
  promptCommitmentPayload,
  reasoningCommitmentPayload,
  type PromptCommitment,
  type ReasoningCommitment,
} from "./canonical";

// Canonical JSON (keys sorted recursively) so a third party re-hashing the same
// data gets the same result regardless of property order (ONCHAIN.md §2).
export function sha256(obj: unknown): string {
  return createHash("sha256").update(canonicalJson(obj)).digest("hex");
}

export function computePromptVersionHash(votes: PromptCommitment[]): string {
  return sha256(promptCommitmentPayload(votes));
}

export function computeReasoningHash(snapshotHash: string, votes: ReasoningCommitment[]): string {
  return sha256(reasoningCommitmentPayload(snapshotHash, votes));
}
