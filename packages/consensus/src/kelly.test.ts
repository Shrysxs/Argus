import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeKellyFraction, computeAuctionReserve } from "./kelly.js";

// ---------------------------------------------------------------------------
// computeKellyFraction
// ---------------------------------------------------------------------------

describe("computeKellyFraction — clear cases", () => {
  it("favorable edge: p=0.6, b=2 → f* = (1.2 - 0.4) / 2 = 0.4", () => {
    const f = computeKellyFraction(0.6, 2);
    assert.ok(Math.abs(f - 0.4) < 1e-10);
  });

  it("even odds: p=0.5, b=1 → f* = (0.5 - 0.5) / 1 = 0", () => {
    const f = computeKellyFraction(0.5, 1);
    assert.ok(Math.abs(f) < 1e-10);
  });

  it("unfavorable: p=0.3, b=1 → f* = (0.3 - 0.7) / 1 = -0.4", () => {
    const f = computeKellyFraction(0.3, 1);
    assert.ok(Math.abs(f - (-0.4)) < 1e-10);
  });

  it("certainty: p=1, b=2 → f* = (2 - 0) / 2 = 1 (bet everything)", () => {
    const f = computeKellyFraction(1, 2);
    assert.ok(Math.abs(f - 1) < 1e-10);
  });

  it("impossibility: p=0, b=2 → f* = (0 - 1) / 2 = -0.5", () => {
    const f = computeKellyFraction(0, 2);
    assert.ok(Math.abs(f - (-0.5)) < 1e-10);
  });
});

describe("computeKellyFraction — validation", () => {
  it("throws when p < 0", () => {
    assert.throws(() => computeKellyFraction(-0.1, 1), RangeError);
  });

  it("throws when p > 1", () => {
    assert.throws(() => computeKellyFraction(1.1, 1), RangeError);
  });

  it("throws when b <= 0", () => {
    assert.throws(() => computeKellyFraction(0.5, 0), RangeError);
    assert.throws(() => computeKellyFraction(0.5, -1), RangeError);
  });
});

// ---------------------------------------------------------------------------
// computeAuctionReserve
// ---------------------------------------------------------------------------

describe("computeAuctionReserve — clear cases", () => {
  it("positive Kelly → ESV = f* × aumRef", () => {
    // f* = 0.4 (from p=0.6, b=2), aumRef = 100000
    const esv = computeAuctionReserve(0.6, 2, 100_000);
    assert.ok(Math.abs(esv - 40_000) < 1e-6);
  });

  it("negative Kelly → reserve clamped to 0", () => {
    const esv = computeAuctionReserve(0.3, 1, 100_000);
    assert.equal(esv, 0);
  });

  it("zero Kelly → reserve is 0", () => {
    const esv = computeAuctionReserve(0.5, 1, 100_000);
    assert.equal(esv, 0);
  });
});

describe("computeAuctionReserve — boundary / validation", () => {
  it("aumRef = 0 → reserve is 0 regardless of Kelly", () => {
    const esv = computeAuctionReserve(0.9, 3, 0);
    assert.equal(esv, 0);
  });

  it("throws when aumRef < 0", () => {
    assert.throws(() => computeAuctionReserve(0.5, 1, -1), RangeError);
  });

  it("p = 1 (certainty) → f* = 1, ESV = aumRef", () => {
    const esv = computeAuctionReserve(1, 2, 100_000);
    assert.ok(Math.abs(esv - 100_000) < 1e-6);
  });
});
