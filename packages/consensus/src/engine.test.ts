/**
 * Unit tests for the Argus consensus engine.
 *
 * Uses node:test (built into Node ≥18) — zero external test dependencies,
 * consistent with the "zero external dependencies" constraint (AGENTS.md §6).
 *
 * Run with: npm test (from packages/consensus)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeConsensus, DISAGREEMENT_THRESHOLD } from "./engine.js";
import type { AgentVote } from "@argus/shared-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid AgentVote for test use. */
function makeVote(
  agentId: string,
  vote: string,
  confidence: number
): AgentVote {
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
// Test: Clear single-winner case
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

    // W_BUY = 80 + 70 + 60 = 210
    // W_HOLD = 50
    // W_SELL = 40
    // total = 300
    // confidence = 210/300 × 100 = 70
    assert.equal(result.recommendation, "BUY");
    assert.ok(
      Math.abs(result.confidence - 70) < 0.001,
      `Expected confidence ~70, got ${result.confidence}`
    );
    assert.equal(result.weightsByDirection["BUY"], 210);
    assert.equal(result.weightsByDirection["HOLD"], 50);
    assert.equal(result.weightsByDirection["SELL"], 40);

    // 70% > 55% — no disagreement
    assert.equal(result.disagreementFlag, false);
  });

  it("preserves the original votes array in the result", () => {
    const votes = [makeVote("a", "BUY", 90), makeVote("b", "SELL", 10)];
    const result = computeConsensus(votes);
    assert.equal(result.agentVotes, votes); // same reference
  });
});

// ---------------------------------------------------------------------------
// Test: All 5 agents agree
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
    assert.ok(
      Math.abs(result.confidence - 100) < 0.001,
      `Expected 100% confidence, got ${result.confidence}`
    );
    assert.equal(result.disagreementFlag, false);
    // Only one direction present in breakdown
    assert.deepEqual(Object.keys(result.weightsByDirection), ["BUY"]);
  });
});

// ---------------------------------------------------------------------------
// Test: Near-tie — should trigger disagreement flag
// ---------------------------------------------------------------------------

describe("computeConsensus — near-tie (disagreement flag)", () => {
  it("sets disagreementFlag when winner share is at the threshold boundary (exactly 55%)", () => {
    // W_BUY = 55, W_SELL = 45 → winner share = 55/100 = 0.55 → flag
    const votes = [
      makeVote("a", "BUY", 55),
      makeVote("b", "SELL", 45),
    ];
    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "BUY");
    // confidence = 55/100 × 100 = 55
    assert.ok(Math.abs(result.confidence - 55) < 0.001);
    // Exactly at threshold → disagreementFlag = true (≤ threshold)
    assert.equal(result.disagreementFlag, true);
  });

  it("sets disagreementFlag on a close 3-way split where winner share ≤ 55%", () => {
    // W_BUY = 50, W_HOLD = 30, W_SELL = 25 → total = 105
    // winner share = 50/105 ≈ 0.476 → flag
    const votes = [
      makeVote("a", "BUY", 50),
      makeVote("b", "HOLD", 30),
      makeVote("c", "SELL", 25),
    ];
    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "BUY");
    assert.equal(result.disagreementFlag, true);
  });

  it("does NOT set disagreementFlag when winner share is above 55%", () => {
    // W_BUY = 56, W_SELL = 44 → winner share = 0.56 → no flag
    const votes = [
      makeVote("a", "BUY", 56),
      makeVote("b", "SELL", 44),
    ];
    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "BUY");
    assert.equal(result.disagreementFlag, false);
  });

  it("DISAGREEMENT_THRESHOLD constant is 0.55", () => {
    assert.equal(DISAGREEMENT_THRESHOLD, 0.55);
  });
});

// ---------------------------------------------------------------------------
// Test: Edge cases
// ---------------------------------------------------------------------------

describe("computeConsensus — edge cases", () => {
  it("single agent voting alone — confidence is 100%, no disagreement", () => {
    const votes = [makeVote("solo", "HOLD", 65)];
    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "HOLD");
    assert.ok(Math.abs(result.confidence - 100) < 0.001);
    assert.equal(result.disagreementFlag, false);
    assert.equal(result.weightsByDirection["HOLD"], 65);
  });

  it("all equal confidence scores — first direction in iteration order wins ties", () => {
    // All same confidence: W_BUY = 50, W_SELL = 50
    // Tie-break: first direction encountered in iteration wins.
    // BUY is inserted first (votes[0]), so BUY wins.
    const votes = [
      makeVote("a", "BUY", 50),
      makeVote("b", "SELL", 50),
    ];
    const result = computeConsensus(votes);

    assert.equal(result.recommendation, "BUY");
    // Confidence = 50/100 × 100 = 50 — maximum disagreement
    assert.ok(Math.abs(result.confidence - 50) < 0.001);
    assert.equal(result.disagreementFlag, true);
  });

  it("accumulates multiple agents voting the same direction", () => {
    const votes = [
      makeVote("a", "BUY", 30),
      makeVote("b", "SELL", 20),
      makeVote("c", "BUY", 40), // second BUY vote
    ];
    const result = computeConsensus(votes);

    // W_BUY = 70, W_SELL = 20, total = 90
    assert.equal(result.recommendation, "BUY");
    assert.equal(result.weightsByDirection["BUY"], 70);
    assert.equal(result.weightsByDirection["SELL"], 20);
    assert.ok(Math.abs(result.confidence - (70 / 90) * 100) < 0.001);
  });

  it("throws RangeError on empty votes array", () => {
    assert.throws(
      () => computeConsensus([]),
      (err: unknown) => {
        assert.ok(err instanceof RangeError);
        assert.ok((err as RangeError).message.includes("must not be empty"));
        return true;
      }
    );
  });

  it("throws RangeError when a confidence score is below 0", () => {
    assert.throws(
      () => computeConsensus([makeVote("a", "BUY", -1)]),
      RangeError
    );
  });

  it("throws RangeError when a confidence score is above 100", () => {
    assert.throws(
      () => computeConsensus([makeVote("a", "BUY", 101)]),
      RangeError
    );
  });

  it("throws RangeError when all confidence scores are 0", () => {
    assert.throws(
      () =>
        computeConsensus([
          makeVote("a", "BUY", 0),
          makeVote("b", "SELL", 0),
        ]),
      (err: unknown) => {
        assert.ok(err instanceof RangeError);
        assert.ok(
          (err as RangeError).message.includes("total weighted sum is 0")
        );
        return true;
      }
    );
  });

  it("confidence of exactly 0 per agent is valid input (caught by zero-total guard)", () => {
    // Single agent with confidence 0 → total = 0 → throws
    assert.throws(
      () => computeConsensus([makeVote("a", "BUY", 0)]),
      RangeError
    );
  });
});
