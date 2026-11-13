import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { encodeAbiParameters, encodeEventTopics, type PublicClient } from "viem";
import type { DecisionPayload } from "@argus/shared-types";
import { MonadChainAdapter } from "./monad";
import { REGISTRY_ABI, encodeDecision } from "./registry";

const REGISTRY = "0x1001b9a1c69e513f7d463e3578bdee7b94295919";
const SENDER = "0x00000000000000000000000000000000000000aa";
const TX = `0x${"ab".repeat(32)}`;

const payload: DecisionPayload = {
  asset: "BTC",
  timestamp: 1_700_000_000_000,
  consensus: { recommendation: "BUY", confidence: 72.35, breakdown: { BUY: 1, SELL: 0, HOLD: 0 }, disagreement: false, agentVotes: [] },
  dataSnapshotHash: "11".repeat(32),
  promptVersionHash: "22".repeat(32),
  reasoningHash: "33".repeat(32),
};

function logFor(p: DecisionPayload, address = REGISTRY) {
  const e = encodeDecision(p);
  const topics = encodeEventTopics({ abi: REGISTRY_ABI, eventName: "DecisionRecorded", args: { sender: SENDER } });
  const data = encodeAbiParameters(
    [{ type: "string" }, { type: "string" }, { type: "uint256" }, { type: "bytes32" }, { type: "bytes32" }, { type: "uint256" }],
    [e.asset, e.decision, e.confidenceBps, e.dataSnapshotHash, e.promptVersionHash, e.timestampSec],
  );
  return { address, topics, data, blockNumber: 1n, logIndex: 0, transactionHash: TX, transactionIndex: 0, blockHash: TX, removed: false };
}

function adapterWith(receipt: unknown) {
  const client = { getTransactionReceipt: async () => receipt } as unknown as PublicClient;
  return new MonadChainAdapter({ registryAddress: REGISTRY, publicClient: client });
}

describe("MonadChainAdapter.verifyDecision", () => {
  test("accepts a tx whose event matches field-for-field", async () => {
    const r = await adapterWith({ status: "success", blockNumber: 42n, logs: [logFor(payload)] }).verifyDecision(TX, payload);
    assert.equal(r.sender.toLowerCase(), SENDER);
    assert.equal(r.blockNumber, "42");
  });

  test("rejects a tx recording a different decision", async () => {
    const other = { ...payload, consensus: { ...payload.consensus, recommendation: "SELL" as const } };
    await assert.rejects(
      adapterWith({ status: "success", blockNumber: 1n, logs: [logFor(other)] }).verifyDecision(TX, payload),
      /does not contain a DecisionRecorded event matching/,
    );
  });

  test("rejects an event emitted by a different contract", async () => {
    await assert.rejects(
      adapterWith({ status: "success", blockNumber: 1n, logs: [logFor(payload, "0x00000000000000000000000000000000000000bb")] }).verifyDecision(TX, payload),
      /matching/,
    );
  });

  test("rejects reverted and unknown transactions", async () => {
    await assert.rejects(adapterWith({ status: "reverted", blockNumber: 1n, logs: [] }).verifyDecision(TX, payload), /reverted/);
    await assert.rejects(adapterWith(null).verifyDecision(TX, payload), /not found/);
    await assert.rejects(adapterWith(null).verifyDecision("0x1234", payload), /Invalid transaction hash/);
  });

  test("recordDecision fails loudly without a configured signer", async () => {
    const a = new MonadChainAdapter({ signerPrivateKey: "" });
    await assert.rejects(a.recordDecision(payload), /signer is not configured/);
  });
});

describe("encodeDecision", () => {
  test("converts confidence to basis points and ms to seconds", () => {
    const e = encodeDecision(payload);
    assert.equal(e.confidenceBps, 7235n);
    assert.equal(e.timestampSec, 1_700_000_000n);
  });

  test("rejects NONE / missing timestamp", () => {
    assert.throws(() => encodeDecision({ ...payload, consensus: { ...payload.consensus, recommendation: "NONE" as any } }));
    assert.throws(() => encodeDecision({ ...payload, timestamp: undefined as any }));
  });
});
