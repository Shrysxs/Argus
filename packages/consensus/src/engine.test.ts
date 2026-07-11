import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeConsensus, DEFAULT_DISAGREEMENT_MARGIN } from "./engine.js";
import type { AgentVote } from "@argus/shared-types";

function makeVote(agentId: string, vote: 'BUY' | 'SELL' | 'HOLD', confidence: number): AgentVote {
  return {
    agentId,
    vote,
    confidence,
    reasoning: `Test reasoning from ${agentId}`,
    dataPointsCited: [],
    promptVersion: "test/v0",
    modelUsed: "test-model",
  };
}

// ---------------------------------------------------------------------------
// Clear single-winner
// ---------------------------------------------------------------------------

describe("computeConsensus — clear single winner", () => {
  it("picks the direction with the highest total confidence weight", () => {
    const votes: AgentVote[] = [
      makeVote("value-hunter", "BUY", 80),
      makeVote("momentum-trader", "BUY", 70),
      makeVote("macro-analyst", "HOLD", 50),
      makeVote("onchain-sleuth", "BUY", 60),
      makeVote("risk-guardian", "SELL", 40),
    ];

    const result = computeConsensus(votes);

    // W_BUY = 210, W_HOLD = 50, W_SELL = 40, total = 300
    assert.equal(result.recommendation, "BUY");
    assert.ok(Math.abs(result.confidence - 70) < 0.001);
    assert.equal(result.breakdown["BUY"], 210);
    assert.equal(result.breakdown["HOLD"], 50);
    assert.equal(result.breakdown["SELL"], 40);
    // gap = 210 - 50 = 160, margin = 0.10 * 300 = 30, 160 > 30 → no disagreement
    assert.equal(result.disagreement, false);
  });

  it("preserves the original votes array in the result", () => {
    const votes = [makeVote("a", "BUY", 90), makeVote("b", "SELL", 10)];
    const result = computeConsensus(votes);
    assert.equal(result.agentVotes, votes);
  });
});

// ---------------------------------------------------------------------------
// Unanimous agreement
// ---------------------------------------------------------------------------

describe("computeConsensus — unanimous agreement", () => {
  it("returns 100% confidence and no disagreement when all agents vote the same", () => {
    const votes: AgentVote[] = [
      makeVote("value-hunter", "BUY", 85),
      makeVote("momentum-trader", "BUY", 90),
      makeVote("macro-analyst", "BUY", 70),
      makeVote("onchain-sleuth", "BUY", 75),
      makeVote("risk-guardian", "BUY", 60),
    ];

    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "BUY");
    assert.ok(Math.abs(result.confidence - 100) < 0.001);
    // Only one direction → second-highest = 0, gap = total, always > margin → no disagreement
    assert.equal(result.disagreement, false);
    assert.deepEqual(Object.keys(result.breakdown), ["BUY"]);
  });
});

// ---------------------------------------------------------------------------
// Disagreement flag — MATH.md: top two W_d within 10% of total weight
// ---------------------------------------------------------------------------

describe("computeConsensus — disagreement flag (MATH.md §1)", () => {
  it("flags when gap between top two is less than margin * total", () => {
    // W_BUY = 50, W_SELL = 45, total = 95
    // gap = 5, margin = 0.10 * 95 = 9.5, 5 < 9.5 → flag
    const votes = [makeVote("a", "BUY", 50), makeVote("b", "SELL", 45)];
    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "BUY");
    assert.equal(result.disagreement, true);
  });

  it("does NOT flag when gap exceeds margin * total", () => {
    // W_BUY = 70, W_SELL = 30, total = 100
    // gap = 40, margin = 10, 40 > 10 → no flag
    const votes = [makeVote("a", "BUY", 70), makeVote("b", "SELL", 30)];
    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "BUY");
    assert.equal(result.disagreement, false);
  });

  it("flags on 3-way split when top two are close", () => {
    // W_BUY = 40, W_SELL = 35, W_HOLD = 25, total = 100
    // gap = 40 - 35 = 5, margin = 10, 5 < 10 → flag
    const votes = [
      makeVote("a", "BUY", 40),
      makeVote("b", "SELL", 35),
      makeVote("c", "HOLD", 25),
    ];
    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "BUY");
    assert.equal(result.disagreement, true);
  });

  it("does NOT flag on 3-way split when winner is dominant", () => {
    // W_BUY = 60, W_SELL = 25, W_HOLD = 15, total = 100
    // gap = 60 - 25 = 35, margin = 10, 35 > 10 → no flag
    const votes = [
      makeVote("a", "BUY", 60),
      makeVote("b", "SELL", 25),
      makeVote("c", "HOLD", 15),
    ];
    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "BUY");
    assert.equal(result.disagreement, false);
  });

  it("accepts a custom disagreement margin via config", () => {
    // W_BUY = 60, W_SELL = 40, total = 100, gap = 20
    // default margin 10% → no flag. Custom margin 25% → 20 < 25 → flag
    const votes = [makeVote("a", "BUY", 60), makeVote("b", "SELL", 40)];

    const defaultResult = computeConsensus(votes);
    assert.equal(defaultResult.disagreement, false);

    const customResult = computeConsensus(votes, { disagreementMargin: 0.25 });
    assert.equal(customResult.disagreement, true);
  });

  it("DEFAULT_DISAGREEMENT_MARGIN is 0.10", () => {
    assert.equal(DEFAULT_DISAGREEMENT_MARGIN, 0.10);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("computeConsensus — edge cases", () => {
  it("single agent — confidence is 100%, no disagreement", () => {
    const votes = [makeVote("solo", "HOLD", 65)];
    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "HOLD");
    assert.ok(Math.abs(result.confidence - 100) < 0.001);
    assert.equal(result.disagreement, false);
    assert.equal(result.breakdown["HOLD"], 65);
  });

  it("exact tie — first direction encountered wins, disagreement flagged", () => {
    const votes = [makeVote("a", "BUY", 50), makeVote("b", "SELL", 50)];
    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "BUY");
    assert.ok(Math.abs(result.confidence - 50) < 0.001);
    // gap = 0, margin = 10, 0 < 10 → flag
    assert.equal(result.disagreement, true);
  });

  it("accumulates multiple agents voting the same direction", () => {
    const votes = [
      makeVote("a", "BUY", 30),
      makeVote("b", "SELL", 20),
      makeVote("c", "BUY", 40),
    ];
    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "BUY");
    assert.equal(result.breakdown["BUY"], 70);
    assert.equal(result.breakdown["SELL"], 20);
    assert.ok(Math.abs(result.confidence - (70 / 90) * 100) < 0.001);
  });

  it("throws RangeError on empty votes array", () => {
    assert.throws(
      () => computeConsensus([]),
      (err: unknown) => {
        assert.ok(err instanceof RangeError);
        assert.ok((err as RangeError).message.includes("must not be empty"));
        return true;
      },
    );
  });

  it("throws RangeError when confidence is below 0", () => {
    assert.throws(() => computeConsensus([makeVote("a", "BUY", -1)]), RangeError);
  });

  it("throws RangeError when confidence is above 100", () => {
    assert.throws(() => computeConsensus([makeVote("a", "BUY", 101)]), RangeError);
  });

  it("throws RangeError when all confidence scores are 0", () => {
    assert.throws(
      () => computeConsensus([makeVote("a", "BUY", 0), makeVote("b", "SELL", 0)]),
      (err: unknown) => {
        assert.ok(err instanceof RangeError);
        assert.ok((err as RangeError).message.includes("total weighted sum is 0"));
        return true;
      },
    );
  });
});
