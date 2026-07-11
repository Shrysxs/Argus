// @argus/shared-types — Cross-package TypeScript types for Argus.

// ---------------------------------------------------------------------------
// Vote Direction — canonical set per SYNDICATE.md §3, MATH.md §1
// ---------------------------------------------------------------------------

export type VoteDirection = 'BUY' | 'SELL' | 'HOLD';

// ---------------------------------------------------------------------------
// Agent Types (§5.1, §5.2)
// ---------------------------------------------------------------------------

/**
 * A single agent's structured output for one analysis run.
 *
 * §5.2: "Force JSON-schema-constrained output (vote, confidence, reasoning,
 * key data points cited) from every provider."
 */
export interface AgentVote {
  /** Identifier of the agent that cast this vote. */
  agentId: string;

  /** The direction this agent voted (e.g., bullish/bearish/neutral). */
  vote: VoteDirection;

  /**
   * Confidence score, 0–100.
   * Used as the weight c_i in the consensus formula (§6):
   * W_d = Σ(c_i for agents voting d).
   */
  confidence: number;

  /**
   * Full reasoning text — a first-class artifact (§2 principle 2).
   * Gets hashed for on-chain integrity verification.
   */
  reasoning: string;

  /**
   * Key data points the agent cited to justify its vote (§5.2).
   * Each entry is a human-readable reference (e.g., "RSI(14) = 72.3").
   */
  dataPointsCited: string[];

  /**
   * Which versioned prompt file produced this vote (§5.2).
   * Format: "<agent-name>/v<N>" (e.g., "value-hunter/v1").
   */
  promptVersion: string;

  /**
   * Which LLM model was used for this specific agent run (§5.2).
   * Logged for reproducibility debugging and non-determinism control (§5.2).
   */
  modelUsed: string;

  // TODO: Log temperature / seed params used per decision for reproducibility (AGENTS.md §5.2).
}

/**
 * Configuration for an agent persona — loaded dynamically, not hardcoded (§5.2).
 *
 * §5.2: "define an agent as { id, name, framework prompt, data dependencies,
 * model preference } and load the roster dynamically."
 */
export interface AgentPersona {
  /** Unique identifier (e.g., "value-hunter"). */
  id: string;

  /** Human-readable display name (e.g., "Value Hunter"). */
  name: string;

  /**
   * Reference to the versioned prompt file (§5.2).
   * Path relative to packages/agents, e.g., "value-hunter/v1.md".
   */
  frameworkPromptRef: string;

  /**
   * Which data sources / metric classes this agent needs (§5.2, §7).
   * E.g., ["price", "technical-indicators"] for Momentum Trader,
   *        ["on-chain-metrics"] for On-chain Sleuth.
   */
  dataDependencies: string[];

  /**
   * Preferred LLM model identifier (§5.2).
   * Some agents may benefit from models better at quantitative reasoning.
   */
  modelPreference: string;

  // TODO: Should bias constraint (§5.1 table) be a runtime field or just
  // part of the prompt file content? Needs product decision.
}

// ---------------------------------------------------------------------------
// Consensus Types (§6)
// ---------------------------------------------------------------------------

/**
 * The result of running the consensus engine over a set of agent votes.
 * Output type per MATH.md §1.
 */
export interface ConsensusResult {
  recommendation: VoteDirection;
  confidence: number;
  breakdown: Record<VoteDirection, number>;
  disagreement: boolean;
  agentVotes: AgentVote[];
  // TODO: Add reputation-weighted voting fields in v2 (AGENT.md §6, Phase 3).
}

// ---------------------------------------------------------------------------
// Data Layer Types (§7)
// ---------------------------------------------------------------------------

/**
 * A snapshot of all market data that fed a particular decision (§7).
 *
 * §2 principle 3: "every consensus record should reference which data snapshot
 * it was computed from, with a hash, so a decision can be independently re-verified."
 */
export interface MarketDataSnapshot {
  /** Unique identifier for this snapshot. */
  snapshotId: string;

  /** The asset this data pertains to (e.g., "BTC", "ETH"). */
  asset: string;

  /** Unix timestamp (ms) when this snapshot was captured. */
  timestamp: number;

  /**
   * Deterministic hash of the snapshot contents (§7).
   * Stored on-chain alongside the decision for third-party verification.
   */
  hash: string;

  /**
   * The actual market data, keyed by metric class.
   * Structure will vary by data source and agent needs.
   */
  // TODO: Replace with strongly-typed fields per metric class (price, on-chain,
  // macro, fear-and-greed) once data sources are finalized (AGENTS.md §7).
  data: Record<string, unknown>;

  /**
   * Which data sources contributed to this snapshot (§7 — provenance).
   * E.g., ["coingecko", "alternative.me/fear-and-greed"].
   */
  sources: string[];
}

// ---------------------------------------------------------------------------
// Decision Types (§4.1, §4.3)
// ---------------------------------------------------------------------------

/**
 * What gets sent to the chain to record a decision (§4.1).
 *
 * The registry contract accepts this payload, emits an event, and does
 * nothing else — no fund custody, no gatekeeping (§4.3).
 */
export interface DecisionPayload {
  /** The asset that was analyzed (e.g., "BTC", "ETH"). */
  asset: string;

  /** Unix timestamp (ms) when the syndicate run was initiated. */
  timestamp: number;

  /** The full consensus result including all agent votes (§6). */
  consensus: ConsensusResult;

  /**
   * Hash of the MarketDataSnapshot that fed this decision (§2, §7).
   * Enables third-party verification: "these agents saw this exact data."
   */
  dataSnapshotHash: string;

  /**
   * Hash of the combined agent reasoning texts (§2 principle 2).
   * On-chain hash + off-chain full text ensures reasoning can't be
   * silently rewritten after the fact.
   */
  reasoningHash: string;
}

/**
 * A decision record as read back from on-chain logs (§4.1).
 *
 * Contains everything from the original payload plus chain-specific
 * metadata added at recording time.
 */
export interface DecisionRecord extends DecisionPayload {
  /** Transaction hash from the chain where this was recorded (§4.1). */
  txHash: string;

  // TODO: Add chain-specific metadata fields (block number, log index, etc.)
  // once the chain is chosen (AGENTS.md §4.2, Phase 2).
}

// ---------------------------------------------------------------------------
// Chain / Wallet Types (§4.1)
// ---------------------------------------------------------------------------

/**
 * Returned by ChainAdapter.connectWallet() (§4.1).
 */
export interface WalletSession {
  /** The connected wallet's address. */
  address: string;

  /** Chain identifier — matches ChainAdapter.chainId (§4.1). */
  chainId: number | string;

  // TODO: Add session metadata (connected-at timestamp, expiry, permissions,
  // provider name) once wallet integration pattern is decided.
}

/**
 * Optional filter for ChainAdapter.getDecisionLogs() (§4.1).
 *
 * Needs reliable getLogs-equivalent querying (§4.2).
 */
export interface LogFilter {
  /** Filter by asset symbol. */
  asset?: string;

  /** Return only decisions on or after this Unix timestamp (ms). */
  fromTimestamp?: number;

  /** Return only decisions on or before this Unix timestamp (ms). */
  toTimestamp?: number;

  // TODO: Add agent-specific filters once reputation marketplace
  // needs are clearer (AGENTS.md §8, Phase 3).
  // TODO: Add pagination (limit/offset or cursor) once log volume
  // makes unbounded queries impractical (AGENTS.md §8).
}
