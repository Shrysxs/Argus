import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { MarketDataSnapshot, AgentVote } from "@argus/shared-types";
import { runSyndicate } from "@argus/agents";
import { computeConsensus } from "@argus/consensus";
import { POST as analyzeHandler, MIN_RESPONSIVE_AGENTS } from "../app/api/analyze/route";

const mockSnapshot: MarketDataSnapshot = {
  snapshotId: "test-snapshot-1",
  asset: "BTC",
  timestamp: Date.now(),
  hash: "a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890",
  data: {
    price: { coinId: "bitcoin", priceUsd: 88500, change24h: 2.5 },
    sentiment: { value: 70, classification: "Greed" },
  },
  sources: ["coingecko", "alternative.me/fng"],
};

describe("POST /api/analyze Orchestration & Auth Flow", () => {
  test("Unauthenticated request: rejects with 401 status", async () => {
    const req = new Request("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset: "BTC" }),
    });

    const res = await analyzeHandler(req);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error, "Unauthorized");
  });

  test("Successful full-syndicate call: 5 of 5 agents respond", async () => {
    const votes = await runSyndicate(mockSnapshot, {
      mockFn: async (persona) => ({
        agentId: persona.id,
        vote: persona.id === "risk-guardian" ? "HOLD" : "BUY",
        confidence: 80,
        reasoning: `${persona.name} bullish thesis.`,
        dataPointsCited: ["Price: $88,500", "Fear & Greed: 70"],
        promptVersion: `${persona.id}/v1`,
        modelUsed: persona.modelPreference,
      }),
    });

    const responsiveCount = votes.length;
    const isDegraded = responsiveCount < MIN_RESPONSIVE_AGENTS;
    const consensus = computeConsensus(votes);

    assert.strictEqual(responsiveCount, 5);
    assert.strictEqual(isDegraded, false);
    assert.strictEqual(consensus.recommendation, "BUY");
    assert.ok(consensus.confidence > 70);
    assert.strictEqual(consensus.agentVotes.length, 5);
  });

  test("Degraded-response case: 2 of 5 agents fail (only 3 respond)", async () => {
    const votes = await runSyndicate(mockSnapshot, {
      mockFn: async (persona) => {
        // Simulate 2 agents failing (onchain-sleuth and macro-analyst)
        if (persona.id === "onchain-sleuth" || persona.id === "macro-analyst") {
          return null;
        }
        return {
          agentId: persona.id,
          vote: "BUY",
          confidence: 75,
          reasoning: `${persona.name} responsive vote.`,
          dataPointsCited: ["Price: $88,500"],
          promptVersion: `${persona.id}/v1`,
          modelUsed: persona.modelPreference,
        };
      },
    });

    const responsiveCount = votes.length; // 3 agents
    const isDegraded = responsiveCount < MIN_RESPONSIVE_AGENTS; // 3 < 3 is false

    assert.strictEqual(responsiveCount, 3);
    assert.strictEqual(isDegraded, false); // 3 is threshold quorum
  });

  test("Severely degraded case: 3 of 5 agents fail (only 2 respond < threshold 3)", async () => {
    const votes = await runSyndicate(mockSnapshot, {
      mockFn: async (persona) => {
        // Simulate 3 agents failing (only 2 respond)
        if (
          persona.id === "onchain-sleuth" ||
          persona.id === "macro-analyst" ||
          persona.id === "risk-guardian"
        ) {
          return null;
        }
        return {
          agentId: persona.id,
          vote: "BUY",
          confidence: 75,
          reasoning: `${persona.name} responsive vote.`,
          dataPointsCited: ["Price: $88,500"],
          promptVersion: `${persona.id}/v1`,
          modelUsed: persona.modelPreference,
        };
      },
    });

    const responsiveCount = votes.length; // 2 agents
    const isDegraded = responsiveCount < MIN_RESPONSIVE_AGENTS; // 2 < 3 is true

    assert.strictEqual(responsiveCount, 2);
    assert.strictEqual(isDegraded, true);
  });
});
