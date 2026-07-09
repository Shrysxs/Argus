/**
 * @argus/consensus
 *
 * Pure, deterministic, confidence-weighted vote aggregation (AGENTS.md §6).
 * Zero external dependencies — no network calls, no I/O.
 */

// Core engine
export { computeConsensus, DISAGREEMENT_THRESHOLD } from "./engine.js";

// Re-export shared types that consumers of this package need,
// so they don't have to add @argus/shared-types as a separate dependency.
export type { AgentVote, ConsensusResult, VoteDirection } from "@argus/shared-types";

// TODO: Add reputation-weighted voting (v2) per AGENTS.md §6, Phase 3.
