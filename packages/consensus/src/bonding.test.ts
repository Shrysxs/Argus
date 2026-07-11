import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeBondingPrice } from "./bonding.js";

// ---------------------------------------------------------------------------
// Clear cases
// ---------------------------------------------------------------------------

describe("computeBondingPrice — clear cases", () => {
  it("R = 0 → price equals base price P_0", () => {
    const price = computeBondingPrice(10, 5, 0);
    // P_0 · e^(0) = P_0
    assert.ok(Math.abs(price - 10) < 1e-10);
  });

  it("R = 1 → price equals P_0 · e^k", () => {
    const price = computeBondingPrice(10, 5, 1);
    assert.ok(Math.abs(price - 10 * Math.exp(5)) < 1e-6);
  });

  it("mid reputation → expected exponential value", () => {
    const price = computeBondingPrice(10, 2, 0.5);
    // 10 · e^(1) = 10 · e
    assert.ok(Math.abs(price - 10 * Math.E) < 1e-10);
  });

  it("higher reputation → higher price (monotonically increasing for k > 0)", () => {
    const pLow = computeBondingPrice(10, 3, 0.3);
    const pHigh = computeBondingPrice(10, 3, 0.7);
    assert.ok(pHigh > pLow);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("computeBondingPrice — edge cases", () => {
  it("k = 0 → price is always P_0 regardless of reputation", () => {
    const p1 = computeBondingPrice(10, 0, 0);
    const p2 = computeBondingPrice(10, 0, 0.5);
    const p3 = computeBondingPrice(10, 0, 1);
    assert.ok(Math.abs(p1 - 10) < 1e-10);
    assert.ok(Math.abs(p2 - 10) < 1e-10);
    assert.ok(Math.abs(p3 - 10) < 1e-10);
  });

  it("P_0 = 0 → price is always 0", () => {
    const price = computeBondingPrice(0, 5, 0.5);
    assert.ok(Math.abs(price) < 1e-10);
  });

  it("throws when reputation < 0", () => {
    assert.throws(() => computeBondingPrice(10, 5, -0.1), RangeError);
  });

  it("throws when reputation > 1", () => {
    assert.throws(() => computeBondingPrice(10, 5, 1.1), RangeError);
  });

  it("throws when P_0 < 0", () => {
    assert.throws(() => computeBondingPrice(-1, 5, 0.5), RangeError);
  });
});

// ---------------------------------------------------------------------------
// Boundary cases
// ---------------------------------------------------------------------------

describe("computeBondingPrice — boundary cases", () => {
  it("large k·R → very high price (exponential growth)", () => {
    const price = computeBondingPrice(1, 20, 1);
    // e^20 ≈ 4.85e8
    assert.ok(price > 4e8);
    assert.ok(Math.abs(price - Math.exp(20)) < 1);
  });

  it("negative k → price decreases with reputation (inverse curve)", () => {
    // MATH.md doesn't prohibit negative k — it's an unusual but valid config
    const pLow = computeBondingPrice(10, -3, 0.3);
    const pHigh = computeBondingPrice(10, -3, 0.7);
    assert.ok(pHigh < pLow);
  });
});
