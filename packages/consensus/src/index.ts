// @argus/consensus — Pure, deterministic math for Argus.
// Implements MATH.md §1–§6. Zero external dependencies.

// §1 — Consensus Engine
export { computeConsensus, DEFAULT_DISAGREEMENT_MARGIN } from "./engine";
export type { ConsensusConfig } from "./engine";

// §2 — Reputation Index
export { computeReputation, DEFAULT_LAMBDA } from "./reputation";

// Outcome scoring & track records (MATH.md §2 applied to realized outcomes)
export {
  realizedDirection,
  isCallCorrect,
  percentReturn,
  summarizeTrackRecord,
  DEFAULT_FLAT_BAND_PCT,
} from "./outcome";
export type { ScoredCall, TrackRecord } from "./outcome";

// §3 — Signal Information Value (entropy pricing)
export { computeEntropy, computeInformationValue, computeSignalPrice, H_MAX } from "./entropy";

// §4 — Auction Reserve (Kelly-derived)
export { computeKellyFraction, computeAuctionReserve } from "./kelly";

// §5 — Bonding Curve
export { computeBondingPrice } from "./bonding";

// §6 — Vault Fee
export { computeVaultFee } from "./vault";

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
