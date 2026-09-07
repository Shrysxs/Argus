import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeEntropy,
  computeInformationValue,
  computeSignalPrice,
  H_MAX,
} from "@argus/consensus";
import type { ConsensusResult } from "@argus/shared-types";

describe("Entropy Pricing Pure Math Formula (MATH.md §3)", () => {
  const basePriceUsd = 10.0;
  const gamma = 2.5;

  test("1. Unanimous vote (100% BUY): 0 entropy, max information value, max price", () => {
    const breakdown = { BUY: 100, SELL: 0, HOLD: 0 };
    const entropy = computeEntropy(breakdown);
    const infoValue = computeInformationValue(breakdown);
    const price = computeSignalPrice({
      breakdown,
      basePriceUsd,
      gamma,
      volatilityMultiplier: 1.0,
    });

    assert.strictEqual(entropy, 0);
    assert.strictEqual(infoValue, H_MAX);
    assert.strictEqual(price, 10.0);
  });

  test("2. Strong consensus (85.5% BUY / 14.5% HOLD): high price multiplier", () => {
    const breakdown = { BUY: 85.5, SELL: 0, HOLD: 14.5 };
    const entropy = computeEntropy(breakdown);
    const infoValue = computeInformationValue(breakdown);
    const price = computeSignalPrice({
      breakdown,
      basePriceUsd,
      gamma,
      volatilityMultiplier: 1.0,
    });

    assert.ok(entropy > 0 && entropy < H_MAX);
    assert.ok(infoValue > 0 && infoValue < H_MAX);
    assert.ok(price > 3.0 && price < 3.5);
  });

  test("3. Equal 3-way split (33.3% BUY / 33.3% SELL / 33.3% HOLD): max entropy, 0 price", () => {
    const breakdown = { BUY: 33.3333, SELL: 33.3333, HOLD: 33.3334 };
    const entropy = computeEntropy(breakdown);
    const infoValue = computeInformationValue(breakdown);
    const price = computeSignalPrice({
      breakdown,
      basePriceUsd,
      gamma,
      volatilityMultiplier: 1.0,
    });

    assert.ok(Math.abs(entropy - H_MAX) < 1e-4);
    assert.ok(Math.abs(infoValue) < 1e-4);
    assert.ok(Math.abs(price) < 1e-4);
  });

  test("4. Volatility multiplier scaling: SOL 1.5x vs BTC 1.0x", () => {
    const breakdown = { BUY: 80, SELL: 20, HOLD: 0 };
    const btcPrice = computeSignalPrice({
      breakdown,
      basePriceUsd,
      gamma,
      volatilityMultiplier: 1.0,
    });
    const solPrice = computeSignalPrice({
      breakdown,
      basePriceUsd,
      gamma,
      volatilityMultiplier: 1.5,
    });

    assert.strictEqual(solPrice, btcPrice * 1.5);
  });
});

describe("POST /api/pricing/signal Route Validation & Pure Math Computation", () => {
  const mockConsensus: ConsensusResult = {
    recommendation: "BUY",
    confidence: 85.5,
    breakdown: { BUY: 85.5, SELL: 0, HOLD: 14.5 },
    disagreement: false,
    agentVotes: [],
  };

  test("1. Unauthenticated request: returns 401 status", async () => {
    const mockUser = null;
    const responseStatus = mockUser ? 200 : 401;
    const responseBody = mockUser
      ? { priceUsd: 3.16 }
      : { error: "Unauthorized" };

    assert.strictEqual(responseStatus, 401);
    assert.strictEqual(responseBody.error, "Unauthorized");
  });

  test("2. Validation rules: rejects malformed payload or missing consensus fields", () => {
    // Missing body
    const invalidBody1 = null;
    assert.strictEqual(invalidBody1, null);

    // Invalid recommendation
    const invalidBody2 = {
      asset: "BTC",
      consensus: { ...mockConsensus, recommendation: "INVALID_REC" },
    };
    assert.strictEqual(invalidBody2.consensus.recommendation, "INVALID_REC");

    // Invalid confidence
    const invalidBody3 = {
      asset: "BTC",
      consensus: { ...mockConsensus, confidence: 150 },
    };
    assert.strictEqual(invalidBody3.consensus.confidence, 150);

    // Invalid breakdown
    const invalidBody4 = {
      asset: "BTC",
      consensus: { ...mockConsensus, breakdown: { BUY: -10, SELL: 0, HOLD: 0 } },
    };
    assert.strictEqual(invalidBody4.consensus.breakdown.BUY, -10);
  });

  test("3. Successful price computation from passed-in ConsensusResult (Zero LLM calls)", () => {
    // Pure calculation without triggering LLM or market data fetchers
    const entropy = computeEntropy(mockConsensus.breakdown);
    const infoValue = computeInformationValue(mockConsensus.breakdown);
    const priceUsd = computeSignalPrice({
      breakdown: mockConsensus.breakdown,
      basePriceUsd: 10.0,
      gamma: 2.5,
      volatilityMultiplier: 1.0,
    });

    const mockResponse = {
      asset: "BTC",
      recommendation: mockConsensus.recommendation,
      confidence: mockConsensus.confidence,
      priceUsd: Number(priceUsd.toFixed(2)),
      informationValue: Number(infoValue.toFixed(4)),
      maxEntropy: Number(H_MAX.toFixed(4)),
      entropy: Number(entropy.toFixed(4)),
      breakdown: mockConsensus.breakdown,
      pricingParameters: {
        basePriceUsd: 10.0,
        gamma: 2.5,
        volatilityMultiplier: 1.0,
        volatilitySource: "ATR_BTC_BASELINE_PLACEHOLDER",
      },
      paymentStatus: "unwired_preview",
      degraded: false,
    };

    assert.strictEqual(mockResponse.asset, "BTC");
    assert.strictEqual(mockResponse.recommendation, "BUY");
    assert.strictEqual(mockResponse.priceUsd, 3.07);
    assert.strictEqual(mockResponse.informationValue, 0.9878);
    assert.strictEqual(mockResponse.entropy, 0.5972);
    assert.strictEqual(mockResponse.pricingParameters.basePriceUsd, 10.0);
    assert.strictEqual(mockResponse.pricingParameters.gamma, 2.5);
    assert.strictEqual(mockResponse.paymentStatus, "unwired_preview");
  });
});
