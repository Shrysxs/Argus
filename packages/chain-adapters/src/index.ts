// @argus/chain-adapters — ChainAdapter interface (AGENTS.md §4.1).
//
// NOTE: All chain SDK imports (viem, web3.js, @solana/web3.js, etc.) must stay
// inside this package — nothing outside chain-adapters may import a chain SDK
// directly (AGENTS.md §11).

import type {
  DecisionPayload,
  DecisionRecord,
  LogFilter,
  WalletSession,
} from "@argus/shared-types";

// Re-export shared types so consumers can import everything chain-related
// from a single package if they prefer.
export type { DecisionPayload, DecisionRecord, LogFilter, WalletSession };

/**
 * Chain-agnostic interface for on-chain operations (AGENTS.md §4.1).
 *
 * The orchestrator, UI, and consensus engine only ever talk to this interface —
 * never to a chain SDK directly. Each supported chain provides its own
 * implementation (AGENTS.md §2 principle 1, §4.1).
 *
 * Implementations must obey these constraints:
 * - The contract must never custody funds (§4.3, §9).
 * - The contract must accept a decision payload, emit an event, and do nothing
 *   else — no gatekeeping (§4.3).
 * - Failed operations must throw, never silently succeed (§2 principle 5).
 */
export interface ChainAdapter {
  /**
   * Unique identifier for the connected chain.
   *
   * Numeric for EVM chains (e.g., 1 for Ethereum mainnet),
   * string for non-EVM chains (e.g., "solana-mainnet").
   * Type is `number | string` to stay chain-agnostic until the chain
   * decision is finalized (§4.2).
   */
  readonly chainId: number | string;

  /**
   * Record a consensus decision on-chain.
   *
   * Must guarantee:
   * - The full DecisionPayload is persisted (emitted as an event) so it can
   *   be reconstructed via getDecisionLogs (§4.3, §6 explainability payload).
   * - The dataSnapshotHash and reasoningHash from the payload are stored
   *   on-chain for third-party verification (§2 principles 2–3, §7).
   * - No funds are moved or held (§4.3, §9).
   * - Returns only after the transaction is confirmed (finality).
   *
   * @throws If the transaction fails, the signer is unavailable, or the
   *         chain is unreachable. Must never silently drop a failure (§2 principle 5).
   */
  recordDecision(input: DecisionPayload): Promise<{ txHash: string }>;

  /**
   * Retrieve historical decision records from on-chain event logs.
   *
   * Must guarantee:
   * - Each returned DecisionRecord is fully reconstructed from chain data —
   *   not from a mutable off-chain cache.
   * - Results match the provided filter criteria.
   * - Returns an empty array (not null/undefined) when no records match.
   *
   * Note: Once log volume grows, this may need an indexing layer behind it
   * rather than live getLogs scanning (§8).
   *
   * @param filter - Optional criteria to narrow results. If omitted, returns
   *                 all available records (subject to chain/RPC limits).
   */
  getDecisionLogs(filter?: LogFilter): Promise<DecisionRecord[]>;

  /**
   * Get the native token balance of the given wallet address.
   *
   * Must guarantee:
   * - Returns the balance in the chain's smallest denomination (e.g., wei
   *   for EVM chains, lamports for Solana).
   * - Returns 0n for valid addresses with no balance, throws for invalid addresses.
   */
  getWalletBalance(address: string): Promise<bigint>;

  /**
   * Initiate a wallet connection for the current chain.
   *
   * Must guarantee:
   * - Returns a valid WalletSession with at minimum an address and chainId.
   * - Throws if the user rejects the connection or no wallet provider is available.
   *
   * Note: Production deployments must NOT use raw private key env vars —
   * use a proper signer service / HSM / relayer pattern (§9).
   */
  connectWallet(): Promise<WalletSession>;

  /**
   * Estimate the transaction fee for recording a decision.
   *
   * Must guarantee:
   * - Returns the estimated fee in the chain's smallest denomination.
   * - The estimate is for the specific payload provided, not a generic average.
   * - Cost estimation matters because this is a high-frequency logging use
   *   case where fees compound (§4.2).
   */
  estimateFee(input: DecisionPayload): Promise<bigint>;
}

// TODO: Implement at least one real ChainAdapter for the chosen chain
// (AGENTS.md §4.2, Phase 2 — chain decision not yet made).
