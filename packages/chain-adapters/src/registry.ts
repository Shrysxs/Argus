// Shared registry definitions for server and browser Monad adapters.
// Browser-safe: only pure viem utilities, no transports or Node APIs.
import { parseAbi, type Hex } from "viem";
import type { DecisionPayload } from "@argus/shared-types";

export const MONAD_TESTNET_CHAIN_ID = 10143;
export const MONAD_TESTNET_HEX_CHAIN_ID = "0x279f";
export const MONAD_TESTNET_RPC_URL = "https://testnet-rpc.monad.xyz";
export const MONAD_TESTNET_EXPLORER_URL = "https://testnet.monadexplorer.com";
export const DEFAULT_MONAD_REGISTRY_ADDRESS = "0x1001b9A1c69E513F7D463e3578bDeE7B94295919";

export const REGISTRY_ABI = parseAbi([
  "function recordDecision(string asset, string decision, uint256 confidence, bytes32 dataSnapshotHash, bytes32 promptVersionHash, uint256 timestamp) external",
  "event DecisionRecorded(string asset, string decision, uint256 confidence, bytes32 dataSnapshotHash, bytes32 promptVersionHash, uint256 timestamp, address indexed sender)",
]);

export function explorerTxUrl(txHash: string): string {
  return `${MONAD_TESTNET_EXPLORER_URL}/tx/${txHash}`;
}

export function toBytes32(hash: string | undefined, name: string): Hex {
  if (!hash) throw new Error(`Invalid payload: ${name} is required`);
  const clean = hash.trim().startsWith("0x") ? hash.trim() : `0x${hash.trim()}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error(`Invalid bytes32 hash for ${name}: ${hash}`);
  }
  return clean.toLowerCase() as Hex;
}

export interface EncodedDecision {
  asset: string;
  decision: "BUY" | "SELL" | "HOLD";
  confidenceBps: bigint;
  dataSnapshotHash: Hex;
  promptVersionHash: Hex;
  timestampSec: bigint;
}

/** Validate a payload and convert it to the exact contract arguments. */
export function encodeDecision(input: DecisionPayload): EncodedDecision {
  const asset = input.asset?.trim()?.toUpperCase();
  if (!asset) throw new Error("Invalid payload: asset must not be empty");

  const decision = input.consensus?.recommendation;
  if (decision !== "BUY" && decision !== "SELL" && decision !== "HOLD") {
    throw new Error("Invalid payload: recommendation must be BUY, SELL, or HOLD");
  }

  const conf = input.consensus?.confidence;
  if (typeof conf !== "number" || !Number.isFinite(conf) || conf < 0 || conf > 100) {
    throw new Error("Invalid payload: confidence must be a number between 0 and 100");
  }

  if (typeof input.timestamp !== "number" || !Number.isFinite(input.timestamp)) {
    throw new Error("Invalid payload: timestamp is required");
  }

  return {
    asset,
    decision,
    confidenceBps: BigInt(Math.round(conf * 100)),
    dataSnapshotHash: toBytes32(input.dataSnapshotHash, "dataSnapshotHash"),
    promptVersionHash: toBytes32(input.promptVersionHash, "promptVersionHash"),
    timestampSec: BigInt(Math.floor(input.timestamp > 1e11 ? input.timestamp / 1000 : input.timestamp)),
  };
}

export function decisionArgs(e: EncodedDecision) {
  return [e.asset, e.decision, e.confidenceBps, e.dataSnapshotHash, e.promptVersionHash, e.timestampSec] as const;
}
