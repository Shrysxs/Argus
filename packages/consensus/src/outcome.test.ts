import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { realizedDirection, isCallCorrect, percentReturn, summarizeTrackRecord } from "./outcome";

describe("outcome scoring", () => {
  it("classifies realized direction with a ±2% flat band (inclusive)", () => {
    assert.equal(realizedDirection(2.01), "BUY");
    assert.equal(realizedDirection(2), "HOLD");
    assert.equal(realizedDirection(-2), "HOLD");
    assert.equal(realizedDirection(-2.01), "SELL");
    assert.equal(realizedDirection(5, 10), "HOLD");
    assert.throws(() => realizedDirection(NaN));
    assert.throws(() => realizedDirection(1, -1));
  });

  it("grades calls", () => {
    assert.equal(isCallCorrect("BUY", 7), true);
    assert.equal(isCallCorrect("SELL", 7), false);
    assert.equal(isCallCorrect("HOLD", 0.5), true);
  });

  it("computes percent return and rejects non-positive prices", () => {
    assert.equal(percentReturn(100, 110), 10);
    assert.throws(() => percentReturn(0, 1));
  });

  it("summarizes a track record with Brier and reputation", () => {
    const r = summarizeTrackRecord([
      { confidence: 80, correct: true, ageInDays: 0 },
      { confidence: 80, correct: false, ageInDays: 0 },
    ])!;
    assert.equal(r.calls, 2);
    assert.equal(r.hitRate, 0.5);
    // ((0.8-1)^2 + (0.8-0)^2) / 2 = (0.04 + 0.64) / 2 = 0.34
    assert.ok(Math.abs(r.brier - 0.34) < 1e-12);
    assert.ok(Math.abs(r.reputation - 0.66) < 1e-12);
    assert.equal(r.avgConfidence, 80);
    assert.equal(summarizeTrackRecord([]), null);
  });

  it("penalizes confident misses more than hedged misses", () => {
    const confident = summarizeTrackRecord([{ confidence: 95, correct: false, ageInDays: 0 }])!;
    const hedged = summarizeTrackRecord([{ confidence: 55, correct: false, ageInDays: 0 }])!;
    assert.ok(confident.brier > hedged.brier);
  });
});
