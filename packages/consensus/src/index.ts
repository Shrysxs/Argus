// @argus/consensus — Pure, deterministic math for Argus.
// Implements MATH.md §1–§6. Zero external dependencies.

// §1 — Consensus Engine
export { computeConsensus, DEFAULT_DISAGREEMENT_MARGIN } from "./engine.js";
export type { ConsensusConfig } from "./engine.js";

// §2 — Reputation Index
export { computeReputation, DEFAULT_LAMBDA } from "./reputation.js";

// §3 — Signal Information Value (entropy pricing)
export { computeEntropy, computeInformationValue, computeSignalPrice, H_MAX } from "./entropy.js";

// §4 — Auction Reserve (Kelly-derived)
export { computeKellyFraction, computeAuctionReserve } from "./kelly.js";

// §5 — Bonding Curve
export { computeBondingPrice } from "./bonding.js";

// §6 — Vault Fee
export { computeVaultFee } from "./vault.js";

// Re-export shared types consumers need
export type {
  AgentVote,
  ConsensusResult,
  VoteDirection,
  HistoricalCall,
  SignalPriceParams,
  AuctionReserveParams,
  BondingCurveParams,
  VaultFeeParams,
} from "@argus/shared-types";
