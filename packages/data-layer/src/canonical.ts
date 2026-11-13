// Browser-safe canonical serialization and audit payload builders.
//
// This module has NO Node imports on purpose: the public decision page
// re-computes the same hashes in the browser with WebCrypto, so the exact
// bytes being hashed must come from one shared implementation.

/** Keys sorted recursively so property insertion order never changes the hash. */
export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export interface PromptCommitment {
  agentId: string;
  promptVersion: string;
  promptHash: string | null;
}

export interface ReasoningCommitment {
  agentId: string;
  vote: string;
  confidence: number;
  reasoning: string;
  dataPointsCited: string[];
}

const byAgent = <T extends { agentId: string }>(a: T, b: T) => a.agentId.localeCompare(b.agentId);

/**
 * What `promptVersionHash` commits to: every responding agent's prompt version
 * AND the sha256 of the prompt text, so an in-place prompt edit changes the hash.
 */
export function promptCommitmentPayload(votes: PromptCommitment[]): unknown {
  return {
    v: 1,
    prompts: votes
      .map((v) => ({ agentId: v.agentId, promptVersion: v.promptVersion, promptHash: v.promptHash ?? null }))
      .sort(byAgent),
  };
}

/**
 * What `reasoningHash` commits to: the full text of every vote, bound to the
 * data snapshot it was produced from.
 */
export function reasoningCommitmentPayload(snapshotHash: string, votes: ReasoningCommitment[]): unknown {
  return {
    v: 1,
    snapshotHash,
    votes: votes
      .map((v) => ({
        agentId: v.agentId,
        vote: v.vote,
        confidence: v.confidence,
        reasoning: v.reasoning,
        dataPointsCited: v.dataPointsCited,
      }))
      .sort(byAgent),
  };
}
