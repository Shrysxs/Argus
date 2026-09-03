import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { MarketDataSnapshot, AgentVote } from "@argus/shared-types";
import { AGENT_ROSTER, runAgentPersona, runSyndicate } from "./index";


const mockSnapshot: MarketDataSnapshot = {
  snapshotId: "snap-123",
  asset: "BTC",
  timestamp: Date.now(),
  hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  data: {
    price: { coinId: "bitcoin", priceUsd: 88000, change24h: 3.5 },
    sentiment: { value: 65, classification: "Greed" },
  },
  sources: ["coingecko", "alternative.me/fng"],
};

describe("@argus/agents Roster & Runner", () => {
  test("AGENT_ROSTER contains 5 versioned agent personas", () => {
    assert.strictEqual(AGENT_ROSTER.length, 5);
    const ids = AGENT_ROSTER.map((a) => a.id);
    assert.deepEqual(ids, [
      "value-hunter",
      "momentum-trader",
      "macro-analyst",
      "onchain-sleuth",
      "risk-guardian",
    ]);
  });

  test("runAgentPersona executes with mock function", async () => {
    const persona = AGENT_ROSTER[0]!;
    const mockVote: AgentVote = {
      agentId: persona.id,
      vote: "BUY",
      confidence: 85,
      reasoning: "Strong margin of safety.",
      dataPointsCited: ["priceUsd: 88000"],
      promptVersion: "value-hunter/v1",
      modelUsed: persona.modelPreference,
    };

    const vote = await runAgentPersona(persona, mockSnapshot, {
      mockFn: async () => mockVote,
    });

    assert.ok(vote);
    assert.strictEqual(vote?.agentId, "value-hunter");
    assert.strictEqual(vote?.vote, "BUY");
    assert.strictEqual(vote?.confidence, 85);
  });

  test("runSyndicate runs all 5 agents in parallel", async () => {
    const votes = await runSyndicate(mockSnapshot, {
      mockFn: async (persona) => ({
        agentId: persona.id,
        vote: persona.id === "risk-guardian" ? "HOLD" : "BUY",
        confidence: 80,
        reasoning: `${persona.name} recommendation.`,
        dataPointsCited: ["Price: $88,000"],
        promptVersion: `${persona.id}/v1`,
        modelUsed: persona.modelPreference,
      }),
    });

    assert.strictEqual(votes.length, 5);
    const riskVote = votes.find((v) => v.agentId === "risk-guardian");
    assert.strictEqual(riskVote?.vote, "HOLD");
  });

  test("runSyndicate handles partial agent failure cleanly", async () => {
    const votes = await runSyndicate(mockSnapshot, {
      mockFn: async (persona) => {
        if (persona.id === "onchain-sleuth" || persona.id === "risk-guardian") {
          return null; // Simulated failure
        }
        return {
          agentId: persona.id,
          vote: "BUY",
          confidence: 75,
          reasoning: "Bullish.",
          dataPointsCited: ["Price: $88,000"],
          promptVersion: `${persona.id}/v1`,
          modelUsed: persona.modelPreference,
        };
      },
    });

    assert.strictEqual(votes.length, 3);
  });
});
