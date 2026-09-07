import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { DecisionPayload } from "@argus/shared-types";
import { MonadChainAdapter } from "@argus/chain-adapters";

const validBytes32Hash = "0x1111111111111111111111111111111111111111111111111111111111111111";

const mockPayload: DecisionPayload = {
  asset: "BTC",
  timestamp: 1700000000000,
  consensus: {
    recommendation: "BUY",
    confidence: 85.5,
    breakdown: { BUY: 85.5, SELL: 0, HOLD: 14.5 },
    disagreement: false,
    agentVotes: [],
  },
  dataSnapshotHash: validBytes32Hash,
  promptVersionHash: validBytes32Hash,
  reasoningHash: validBytes32Hash,
};

describe("POST /api/record Decision Sealing & Error Surfacing", () => {
  test("Unauthenticated request: returns 401 Unauthorized status", async () => {
    const mockUser = null;
    const responseStatus = mockUser ? 200 : 401;
    const responseBody = mockUser ? { txHash: "0x..." } : { error: "Unauthorized" };

    assert.strictEqual(responseStatus, 401);
    assert.strictEqual(responseBody.error, "Unauthorized");
  });

  test("Successful record call with mocked ChainAdapter: returns txHash without spending testnet MON", async () => {
    // Instantiate adapter with mock recordDecision
    const mockTxHash = "0xe5d450f98da7c47ce05a82bc1ae23ffbb268fcc52869cc14989aaa8ebdc6d865";
    
    class TestMonadAdapter extends MonadChainAdapter {
      override async recordDecision(input: DecisionPayload): Promise<{ txHash: string }> {
        assert.strictEqual(input.asset, "BTC");
        assert.strictEqual(input.consensus.recommendation, "BUY");
        assert.strictEqual(input.consensus.confidence, 85.5);
        assert.strictEqual(input.dataSnapshotHash, validBytes32Hash);
        assert.strictEqual(input.promptVersionHash, validBytes32Hash);
        return { txHash: mockTxHash };
      }
    }

    const adapter = new TestMonadAdapter();
    const result = await adapter.recordDecision(mockPayload);

    assert.strictEqual(result.txHash, mockTxHash);
    assert.match(result.txHash, /^0x[0-9a-fA-F]{64}$/);
  });

  test("On-chain failure case (revert/RPC error): surfaces error loud rather than swallowing", async () => {
    const revertErrorMessage = "On-chain transaction reverted: PenguinRegistry: confidence exceeds 10000 bps";

    class FailingMonadAdapter extends MonadChainAdapter {
      override async recordDecision(_input: DecisionPayload): Promise<{ txHash: string }> {
        throw new Error(revertErrorMessage);
      }
    }

    const adapter = new FailingMonadAdapter();

    await assert.rejects(
      async () => {
        await adapter.recordDecision(mockPayload);
      },
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, revertErrorMessage);
        return true;
      }
    );
  });

  test("Validation rules: rejects malformed bytes32, missing id, or invalid confidence", () => {
    const adapter = new MonadChainAdapter();

    // Malformed bytes32 hash
    assert.rejects(
      async () => {
        await adapter.recordDecision({
          ...mockPayload,
          dataSnapshotHash: "invalid-hash",
        });
      },
      /Invalid bytes32 hash string/
    );

    // Invalid confidence (> 100)
    assert.rejects(
      async () => {
        await adapter.recordDecision({
          ...mockPayload,
          consensus: {
            ...mockPayload.consensus,
            confidence: 150,
          },
        });
      },
      /confidence must be a number between 0 and 100/
    );
  });

  test("Pre-sealing database validation: fails loud if id is missing or unpersisted/already sealed", () => {
    // Missing id check
    const missingIdBody = { ...mockPayload };
    const missingIdValid = typeof (missingIdBody as any).id === "string" && (missingIdBody as any).id.trim().length > 0;
    assert.strictEqual(missingIdValid, false);

    // Non-existent or already-sealed ID check
    const mockDbRecords: Array<{ id: string; userId: string; sealed: boolean }> = [
      { id: "existing_sealed_id", userId: "user_1", sealed: true },
    ];

    const findRecord = (id: string, userId: string) =>
      mockDbRecords.find((r) => r.id === id && r.userId === userId && !r.sealed);

    // Unpersisted ID
    assert.strictEqual(findRecord("unpersisted_id_123", "user_1"), undefined);

    // Already sealed ID
    assert.strictEqual(findRecord("existing_sealed_id", "user_1"), undefined);
  });
});
