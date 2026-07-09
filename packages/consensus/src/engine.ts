/**
 * @argus/consensus — Pure, deterministic, confidence-weighted vote aggregation.
 *
 * Implements the consensus formula from AGENTS.md §6:
 *   W_d = Σ(c_i for all agents i whose vote v_i = d)
 *   Recommendation = argmax_d(W_d)
 *   Confidence     = (W_recommendation / Σ_d(W_d)) × 100
 *
 * INVARIANTS:
 *   - No external dependencies, no I/O, no network calls (AGENTS.md §6, §11).
 *   - All functions are pure — same input always produces same output.
 *   - Throws explicitly on invalid input rather than silently producing garbage
 *     (AGENTS.md §2 principle 5: "Fail loud, not silent").
 */

import type { AgentVote, ConsensusResult, VoteDirection } from "@argus/shared-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The minimum winning weight-share (as a fraction 0–1) required to NOT set
 * the disagreement flag.
 *
 * Reasoning: AGENTS.md §5.3 says to flag when the split is "near 50/50".
 * At exactly 50% the winner has no advantage at all; at 55% the winner leads
 * by only 10 percentage points — still a weak signal worth surfacing. At 60%+
 * the winner has a clear mandate. 0.55 is the threshold: winner share ≤ 55%
 * → disagreementFlag = true.
 *
 * This is a named constant so it can be tuned in one place.
 */
export const DISAGREEMENT_THRESHOLD = 0.55;

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

/**
 * Run the confidence-weighted consensus algorithm over a set of agent votes.
 *
 * @param votes - One or more AgentVote objects. Must be non-empty; confidence
 *                scores must be in [0, 100].
 * @returns A ConsensusResult with the winning direction, aggregate confidence,
 *          full per-direction weight breakdown, original votes, and a
 *          disagreement flag.
 *
 * @throws {RangeError}  If `votes` is empty.
 * @throws {RangeError}  If any confidence score is outside [0, 100].
 * @throws {RangeError}  If total weighted sum is 0 (all confidences are 0).
 *
 * @example
 * const result = computeConsensus([
 *   { agentId: "a", vote: "BUY",  confidence: 80, ... },
 *   { agentId: "b", vote: "HOLD", confidence: 60, ... },
 * ]);
 * // result.recommendation === "BUY"
 * // result.confidence ≈ 57.14 (80 / 140 × 100)
 */
export function computeConsensus(votes: AgentVote[]): ConsensusResult {
  // --- Input validation ---
  if (votes.length === 0) {
    throw new RangeError("computeConsensus: votes array must not be empty");
  }

  for (const v of votes) {
    if (v.confidence < 0 || v.confidence > 100) {
      throw new RangeError(
        `computeConsensus: confidence score for agent "${v.agentId}" is ${v.confidence}, ` +
          `must be in [0, 100]`
      );
    }
  }

  // --- Step 1: Compute W_d for each direction d (AGENTS.md §6) ---
  // W_d = Σ(c_i for all i where v_i = d)
  const weightsByDirection: Record<VoteDirection, number> = {};

  for (const v of votes) {
    const current = weightsByDirection[v.vote] ?? 0;
    weightsByDirection[v.vote] = current + v.confidence;
  }

  // --- Step 2: Σ_d(W_d) — total weight across all directions ---
  const totalWeight = Object.values(weightsByDirection).reduce(
    (sum, w) => sum + w,
    0
  );

  if (totalWeight === 0) {
    throw new RangeError(
      "computeConsensus: total weighted sum is 0 — all confidence scores are 0. " +
        "Cannot determine a recommendation."
    );
  }

  // --- Step 3: Recommendation = argmax_d(W_d) (AGENTS.md §6) ---
  // Deterministic tie-break: if two directions share the same W_d, the one
  // that appears first in the votes array wins. This keeps the function
  // pure (no randomness) while being documented and predictable.
  let recommendation: VoteDirection = "";
  let maxWeight = -1;

  // Iterate in insertion order (guaranteed in ES2015+ for string keys)
  // so the first-encountered direction wins ties.
  for (const [direction, weight] of Object.entries(weightsByDirection)) {
    if (weight > maxWeight) {
      maxWeight = weight;
      recommendation = direction;
    }
  }

  // --- Step 4: Consensus confidence = (W_recommendation / Σ W_d) × 100 ---
  const confidence = (maxWeight / totalWeight) * 100;

  // --- Step 5: Disagreement flag (AGENTS.md §5.3) ---
  // Flag if the winner's share of total weight is ≤ DISAGREEMENT_THRESHOLD.
  // At 0.55 the winner leads by at most 10 pp over a perfect 50/50 split.
  const winnerShare = maxWeight / totalWeight;
  const disagreementFlag = winnerShare <= DISAGREEMENT_THRESHOLD;

  return {
    recommendation,
    confidence,
    weightsByDirection,
    agentVotes: votes,
    disagreementFlag,
  };
}
