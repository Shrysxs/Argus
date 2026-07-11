import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeReputation, DEFAULT_LAMBDA } from "./reputation.js";
import type { HistoricalCall } from "@argus/shared-types";

// ---------------------------------------------------------------------------
// Clear case
// ---------------------------------------------------------------------------

describe("computeReputation — clear case", () => {
  it("returns 1.0 for a perfectly calibrated agent (all correct, confidence = 1)", () => {
    const calls: HistoricalCall[] = [
      { confidence: 1, correct: 1, ageInDays: 0 },
      { confidence: 1, correct: 1, ageInDays: 30 },
      { confidence: 1, correct: 1, ageInDays: 60 },
    ];
    const r = computeReputation(calls);
    assert.ok(Math.abs(r - 1.0) < 1e-10);
  });

  it("penalizes wrong calls proportional to stated confidence", () => {
    // High confidence + wrong = big Brier penalty
    const highConfWrong: HistoricalCall[] = [
      { confidence: 0.9, correct: 0, ageInDays: 0 },
    ];
    const lowConfWrong: HistoricalCall[] = [
      { confidence: 0.3, correct: 0, ageInDays: 0 },
    ];

    const rHigh = computeReputation(highConfWrong);
    const rLow = computeReputation(lowConfWrong);

    // 1 - (0.9)^2 = 0.19 vs 1 - (0.3)^2 = 0.91
    assert.ok(rLow > rHigh);
    assert.ok(Math.abs(rHigh - (1 - 0.81)) < 1e-10);
    assert.ok(Math.abs(rLow - (1 - 0.09)) < 1e-10);
  });

  it("recent calls weigh more than old calls", () => {
    // Same call, but one recent and one old
    const recentCorrect: HistoricalCall[] = [
      { confidence: 0.8, correct: 1, ageInDays: 0 },
      { confidence: 0.8, correct: 0, ageInDays: 180 },
    ];
    const recentWrong: HistoricalCall[] = [
      { confidence: 0.8, correct: 0, ageInDays: 0 },
      { confidence: 0.8, correct: 1, ageInDays: 180 },
    ];

    const rRecentCorrect = computeReputation(recentCorrect);
    const rRecentWrong = computeReputation(recentWrong);

    // Agent with recent correct call should have higher reputation
    assert.ok(rRecentCorrect > rRecentWrong);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("computeReputation — edge cases", () => {
  it("throws on empty calls array", () => {
    assert.throws(() => computeReputation([]), RangeError);
  });

  it("all wrong calls with max confidence → near 0", () => {
    const calls: HistoricalCall[] = [
      { confidence: 1, correct: 0, ageInDays: 0 },
      { confidence: 1, correct: 0, ageInDays: 10 },
    ];
    const r = computeReputation(calls);
    // 1 - Σ(w * 1) / Σ(w) = 1 - 1 = 0
    assert.ok(Math.abs(r) < 1e-10);
  });

  it("confidence = 0 and correct = 0 → score is 1.0 (no error)", () => {
    const calls: HistoricalCall[] = [{ confidence: 0, correct: 0, ageInDays: 0 }];
    const r = computeReputation(calls);
    // (0 - 0)^2 = 0 → R = 1
    assert.ok(Math.abs(r - 1.0) < 1e-10);
  });

  it("confidence = 0 and correct = 1 → penalized (should have been confident)", () => {
    const calls: HistoricalCall[] = [{ confidence: 0, correct: 1, ageInDays: 0 }];
    const r = computeReputation(calls);
    // (0 - 1)^2 = 1 → R = 0
    assert.ok(Math.abs(r) < 1e-10);
  });

  it("throws when confidence is outside [0, 1]", () => {
    assert.throws(
      () => computeReputation([{ confidence: 1.5, correct: 1, ageInDays: 0 }]),
      RangeError,
    );
    assert.throws(
      () => computeReputation([{ confidence: -0.1, correct: 1, ageInDays: 0 }]),
      RangeError,
    );
  });

  it("throws when ageInDays is negative", () => {
    assert.throws(
      () => computeReputation([{ confidence: 0.5, correct: 1, ageInDays: -1 }]),
      RangeError,
    );
  });

  it("throws when lambda is negative", () => {
    assert.throws(
      () => computeReputation([{ confidence: 0.5, correct: 1, ageInDays: 0 }], -1),
      RangeError,
    );
  });
});

// ---------------------------------------------------------------------------
// Boundary cases
// ---------------------------------------------------------------------------

describe("computeReputation — boundary cases", () => {
  it("lambda = 0 → no decay, all calls weighted equally", () => {
    const calls: HistoricalCall[] = [
      { confidence: 0.8, correct: 1, ageInDays: 0 },
      { confidence: 0.8, correct: 0, ageInDays: 1000 },
    ];
    const r = computeReputation(calls, 0);
    // w = e^0 = 1 for both. errors: (0.8-1)^2=0.04, (0.8-0)^2=0.64
    // R = 1 - (0.04 + 0.64) / 2 = 1 - 0.34 = 0.66
    assert.ok(Math.abs(r - 0.66) < 1e-10);
  });

  it("very large lambda → only the most recent call matters", () => {
    const calls: HistoricalCall[] = [
      { confidence: 0.9, correct: 1, ageInDays: 0 },
      { confidence: 0.1, correct: 0, ageInDays: 30 },
    ];
    const r = computeReputation(calls, 100); // extreme decay
    // w_0 = e^0 = 1, w_1 ≈ 0 (e^(-3000))
    // R ≈ 1 - (0.01 * 1 + 0.01 * ~0) / (1 + ~0) ≈ 1 - 0.01 = 0.99
    assert.ok(Math.abs(r - (1 - 0.01)) < 1e-6);
  });

  it("DEFAULT_LAMBDA gives ~90-day half-life", () => {
    // e^(-λ * 90) should equal 0.5
    const decay90 = Math.exp(-DEFAULT_LAMBDA * 90);
    assert.ok(Math.abs(decay90 - 0.5) < 1e-10);
  });
});
