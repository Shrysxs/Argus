import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  computeEntropy,
  computeInformationValue,
  computeSignalPrice,
  H_MAX,
} from "./entropy.js";

// ---------------------------------------------------------------------------
// computeEntropy — clear cases
// ---------------------------------------------------------------------------

describe("computeEntropy — clear cases", () => {
  it("unanimous vote → zero entropy", () => {
    const h = computeEntropy({ BUY: 100 });
    assert.ok(Math.abs(h) < 1e-10);
  });

  it("even 2-way split → log₂(2) = 1 bit", () => {
    const h = computeEntropy({ BUY: 50, SELL: 50 });
    assert.ok(Math.abs(h - 1) < 1e-10);
  });

  it("even 3-way split → log₂(3) = H_MAX", () => {
    const h = computeEntropy({ BUY: 100, SELL: 100, HOLD: 100 });
    assert.ok(Math.abs(h - H_MAX) < 1e-10);
  });

  it("unequal split gives entropy between 0 and H_MAX", () => {
    const h = computeEntropy({ BUY: 70, SELL: 20, HOLD: 10 });
    assert.ok(h > 0);
    assert.ok(h < H_MAX);
  });
});

// ---------------------------------------------------------------------------
// computeEntropy — edge cases
// ---------------------------------------------------------------------------

describe("computeEntropy — edge cases", () => {
  it("throws on zero total weight", () => {
    assert.throws(() => computeEntropy({ BUY: 0, SELL: 0 }), RangeError);
  });

  it("throws on negative weight", () => {
    assert.throws(() => computeEntropy({ BUY: 10, SELL: -5 }), RangeError);
  });

  it("zero-weight direction is skipped (not NaN)", () => {
    // BUY=100, SELL=0 → only BUY contributes, entropy = 0
    const h = computeEntropy({ BUY: 100, SELL: 0 });
    assert.ok(Math.abs(h) < 1e-10);
  });
});

// ---------------------------------------------------------------------------
// computeInformationValue
// ---------------------------------------------------------------------------

describe("computeInformationValue", () => {
  it("unanimous vote → max information value = H_MAX", () => {
    const iv = computeInformationValue({ BUY: 100 });
    assert.ok(Math.abs(iv - H_MAX) < 1e-10);
  });

  it("even 3-way split → zero information value", () => {
    const iv = computeInformationValue({ BUY: 100, SELL: 100, HOLD: 100 });
    assert.ok(Math.abs(iv) < 1e-10);
  });

  it("I is always in [0, H_MAX]", () => {
    const iv = computeInformationValue({ BUY: 60, SELL: 30, HOLD: 10 });
    assert.ok(iv >= -1e-10);
    assert.ok(iv <= H_MAX + 1e-10);
  });
});

// ---------------------------------------------------------------------------
// computeSignalPrice
// ---------------------------------------------------------------------------

describe("computeSignalPrice — clear cases", () => {
  it("unanimous vote → maximum price", () => {
    const price = computeSignalPrice({
      breakdown: { BUY: 100 },
      basePriceUsd: 10,
      gamma: 2,
      volatilityMultiplier: 1.0,
    });
    // I = H_MAX, normalized = 1, price = 10 * 1^2 * 1 = 10
    assert.ok(Math.abs(price - 10) < 1e-10);
  });

  it("even 3-way split → zero price (no information)", () => {
    const price = computeSignalPrice({
      breakdown: { BUY: 100, SELL: 100, HOLD: 100 },
      basePriceUsd: 10,
      gamma: 2,
      volatilityMultiplier: 1.0,
    });
    assert.ok(Math.abs(price) < 1e-10);
  });

  it("volatility multiplier scales linearly", () => {
    const params = {
      breakdown: { BUY: 80, SELL: 20 } as Record<'BUY' | 'SELL' | 'HOLD', number>,
      basePriceUsd: 10,
      gamma: 2 as number,
      volatilityMultiplier: 1.0,
    };
    const p1 = computeSignalPrice(params);
    const p2 = computeSignalPrice({ ...params, volatilityMultiplier: 2.0 });
    assert.ok(Math.abs(p2 - p1 * 2) < 1e-10);
  });

  it("higher gamma suppresses mid-range information value", () => {
    const params = {
      breakdown: { BUY: 60, SELL: 30, HOLD: 10 } as Record<'BUY' | 'SELL' | 'HOLD', number>,
      basePriceUsd: 100,
      gamma: 2 as number,
      volatilityMultiplier: 1.0,
    };
    const priceGamma2 = computeSignalPrice(params);
    const priceGamma3 = computeSignalPrice({ ...params, gamma: 3 });
    // Higher gamma → lower price for non-unanimous consensus
    assert.ok(priceGamma3 < priceGamma2);
  });
});

describe("computeSignalPrice — boundary / validation", () => {
  it("gamma = 2 (lower bound) is accepted", () => {
    assert.doesNotThrow(() =>
      computeSignalPrice({
        breakdown: { BUY: 100 },
        basePriceUsd: 10,
        gamma: 2,
        volatilityMultiplier: 1,
      }),
    );
  });

  it("gamma = 3 (upper bound) is accepted", () => {
    assert.doesNotThrow(() =>
      computeSignalPrice({
        breakdown: { BUY: 100 },
        basePriceUsd: 10,
        gamma: 3,
        volatilityMultiplier: 1,
      }),
    );
  });

  it("gamma outside [2, 3] throws", () => {
    assert.throws(
      () =>
        computeSignalPrice({
          breakdown: { BUY: 100 },
          basePriceUsd: 10,
          gamma: 1.5,
          volatilityMultiplier: 1,
        }),
      RangeError,
    );
    assert.throws(
      () =>
        computeSignalPrice({
          breakdown: { BUY: 100 },
          basePriceUsd: 10,
          gamma: 3.5,
          volatilityMultiplier: 1,
        }),
      RangeError,
    );
  });

  it("H_MAX is log₂(3)", () => {
    assert.ok(Math.abs(H_MAX - Math.log2(3)) < 1e-15);
  });
});
