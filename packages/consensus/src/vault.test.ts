import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeVaultFee } from "./vault.js";

// ---------------------------------------------------------------------------
// Clear cases
// ---------------------------------------------------------------------------

describe("computeVaultFee — clear cases", () => {
  it("profit above HWM → management + performance fee", () => {
    const fee = computeVaultFee({
      managementFeeRate: 0.01,  // 1%
      performanceFeeRate: 0.20, // 20%
      aum: 1_000_000,
      currentValue: 1_200_000,
      highWaterMark: 1_100_000,
    });
    // management = 0.01 * 1_000_000 = 10_000
    // performance = 0.20 * (1_200_000 - 1_100_000) = 0.20 * 100_000 = 20_000
    // total = 30_000
    assert.ok(Math.abs(fee - 30_000) < 1e-6);
  });

  it("no profit (V_t < HWM) → management fee only", () => {
    const fee = computeVaultFee({
      managementFeeRate: 0.01,
      performanceFeeRate: 0.20,
      aum: 1_000_000,
      currentValue: 900_000,
      highWaterMark: 1_000_000,
    });
    // management = 10_000, performance = 0 (no new profit)
    assert.ok(Math.abs(fee - 10_000) < 1e-6);
  });

  it("MATH.md suggested defaults: m=0.5–1%, p=15–20%", () => {
    const fee = computeVaultFee({
      managementFeeRate: 0.005, // 0.5%
      performanceFeeRate: 0.15, // 15%
      aum: 100_000,
      currentValue: 110_000,
      highWaterMark: 105_000,
    });
    // management = 500, performance = 0.15 * 5_000 = 750, total = 1_250
    assert.ok(Math.abs(fee - 1_250) < 1e-6);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("computeVaultFee — edge cases", () => {
  it("V_t exactly at HWM → management fee only", () => {
    const fee = computeVaultFee({
      managementFeeRate: 0.01,
      performanceFeeRate: 0.20,
      aum: 500_000,
      currentValue: 500_000,
      highWaterMark: 500_000,
    });
    // management = 5_000, performance = 0
    assert.ok(Math.abs(fee - 5_000) < 1e-6);
  });

  it("zero AUM → zero fee", () => {
    const fee = computeVaultFee({
      managementFeeRate: 0.01,
      performanceFeeRate: 0.20,
      aum: 0,
      currentValue: 100_000,
      highWaterMark: 50_000,
    });
    // management = 0, performance = 0.20 * 50_000 = 10_000
    assert.ok(Math.abs(fee - 10_000) < 1e-6);
  });

  it("zero fee rates → zero fee", () => {
    const fee = computeVaultFee({
      managementFeeRate: 0,
      performanceFeeRate: 0,
      aum: 1_000_000,
      currentValue: 2_000_000,
      highWaterMark: 1_000_000,
    });
    assert.ok(Math.abs(fee) < 1e-10);
  });
});

// ---------------------------------------------------------------------------
// Boundary / validation
// ---------------------------------------------------------------------------

describe("computeVaultFee — boundary / validation", () => {
  it("negative profit → clamped to 0 (no clawback)", () => {
    const fee = computeVaultFee({
      managementFeeRate: 0,
      performanceFeeRate: 0.20,
      aum: 100_000,
      currentValue: 80_000,
      highWaterMark: 100_000,
    });
    // max(0, 80k - 100k) = 0 → performance fee = 0
    assert.ok(Math.abs(fee) < 1e-10);
  });

  it("throws when managementFeeRate < 0", () => {
    assert.throws(
      () =>
        computeVaultFee({
          managementFeeRate: -0.01,
          performanceFeeRate: 0.20,
          aum: 100_000,
          currentValue: 100_000,
          highWaterMark: 100_000,
        }),
      RangeError,
    );
  });

  it("throws when performanceFeeRate < 0", () => {
    assert.throws(
      () =>
        computeVaultFee({
          managementFeeRate: 0.01,
          performanceFeeRate: -0.10,
          aum: 100_000,
          currentValue: 100_000,
          highWaterMark: 100_000,
        }),
      RangeError,
    );
  });

  it("throws when aum < 0", () => {
    assert.throws(
      () =>
        computeVaultFee({
          managementFeeRate: 0.01,
          performanceFeeRate: 0.20,
          aum: -1,
          currentValue: 100_000,
          highWaterMark: 100_000,
        }),
      RangeError,
    );
  });
});
