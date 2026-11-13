// Browser-safe on-chain verification shared by the server adapter and the
// public decision page (which re-verifies directly against a public RPC).
import { createPublicClient, http, parseEventLogs, type Hex, type PublicClient } from "viem";
import { monadTestnet } from "viem/chains";
import type { DecisionPayload, VerifiedDecision } from "@argus/shared-types";
import { MONAD_TESTNET_RPC_URL, REGISTRY_ABI, encodeDecision } from "./registry";

export function createMonadPublicClient(rpcUrl: string = MONAD_TESTNET_RPC_URL): PublicClient {
  return createPublicClient({ chain: monadTestnet, transport: http(rpcUrl) }) as PublicClient;
}

/**
 * Confirm `txHash` is a successful transaction whose DecisionRecorded event,
 * emitted by `registryAddress`, matches `expected` field-for-field.
 */
export async function verifyDecisionTx(
  client: PublicClient,
  registryAddress: string,
  txHash: string,
  expected: DecisionPayload,
): Promise<VerifiedDecision> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("Invalid transaction hash");
  const want = encodeDecision(expected);

  const receipt = await client.getTransactionReceipt({ hash: txHash as Hex }).catch(() => null);
  if (!receipt) throw new Error("Transaction not found or not yet mined");
  if (receipt.status !== "success") throw new Error("Transaction reverted");

  const events = parseEventLogs({ abi: REGISTRY_ABI, logs: receipt.logs, eventName: "DecisionRecorded" }).filter(
    (l) => l.address.toLowerCase() === registryAddress.toLowerCase(),
  );
  const match = events.find(
    (e) =>
      e.args.asset === want.asset &&
      e.args.decision === want.decision &&
      e.args.confidence === want.confidenceBps &&
      e.args.dataSnapshotHash.toLowerCase() === want.dataSnapshotHash &&
      e.args.promptVersionHash.toLowerCase() === want.promptVersionHash &&
      e.args.timestamp === want.timestampSec,
  );
  if (!match) throw new Error("Transaction does not contain a DecisionRecorded event matching this analysis");
  return { txHash, sender: match.args.sender, blockNumber: receipt.blockNumber.toString() };
}
