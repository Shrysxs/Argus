import type { AgentVote, ConsensusResult, VoteDirection } from "@argus/shared-types";

// MATH.md §1: default disagreement margin = 10% of total weight
export const DEFAULT_DISAGREEMENT_MARGIN = 0.10;

export interface ConsensusConfig {
  disagreementMargin?: number; // fraction of total weight; default 0.10
}

export function computeConsensus(
  votes: AgentVote[],
  config: ConsensusConfig = {},
): ConsensusResult {
  if (votes.length === 0) {
    throw new RangeError("computeConsensus: votes array must not be empty");
  }

  for (const v of votes) {
    if (v.confidence < 0 || v.confidence > 100) {
      throw new RangeError(
        `computeConsensus: confidence for agent "${v.agentId}" is ${v.confidence}, must be in [0, 100]`,
      );
    }
  }

  // MATH.md §1: W_d = Σ(c_i for all i where v_i = d)
  const breakdown: Record<VoteDirection, number> = {} as Record<VoteDirection, number>;

  for (const v of votes) {
    const dir = v.vote as VoteDirection;
    breakdown[dir] = (breakdown[dir] ?? 0) + v.confidence;
  }

  const totalWeight = Object.values(breakdown).reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) {
    throw new RangeError(
      "computeConsensus: total weighted sum is 0 — all confidence scores are 0. " +
        "Cannot determine a recommendation.",
    );
  }

  // MATH.md §1: Recommendation = argmax_d(W_d)
  // Deterministic tie-break: first direction encountered wins.
  let recommendation = "" as VoteDirection;
  let maxWeight = -1;

  for (const [direction, weight] of Object.entries(breakdown)) {
    if (weight > maxWeight) {
      maxWeight = weight;
      recommendation = direction as VoteDirection;
    }
  }

  // MATH.md §1: Confidence = W_recommendation / Σ(W_d) × 100
  const confidence = (maxWeight / totalWeight) * 100;

  // MATH.md §1: disagreement = true if top two W_d are within margin of total weight
  const margin = config.disagreementMargin ?? DEFAULT_DISAGREEMENT_MARGIN;
  const sorted = Object.values(breakdown).sort((a, b) => b - a);
  const secondHighest = sorted.length >= 2 ? sorted[1]! : 0;
  const gap = maxWeight - secondHighest;
  const disagreement = gap < margin * totalWeight;

  return {
    recommendation,
    confidence,
    breakdown,
    disagreement,
    agentVotes: votes,
  };
}
