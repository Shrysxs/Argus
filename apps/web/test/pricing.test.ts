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

import { GET as quoteHandler, POST as quotePostHandler } from "../app/api/pricing/signal/route";
import { quoteSignal, volatilityMultiplier } from "../lib/signal-quote";

describe("Signal value quote (read-only, from stored decisions)", () => {
  test("volatility multiplier comes from realized 30d vol, clamped", () => {
    assert.equal(volatilityMultiplier({ technicals: { realizedVol30dPct: 50 } }).value, 1);
    assert.equal(volatilityMultiplier({ technicals: { realizedVol30dPct: 75 } }).value, 1.5);
    assert.equal(volatilityMultiplier({ technicals: { realizedVol30dPct: 900 } }).value, 3);
    assert.equal(volatilityMultiplier({}).source, "default (no volatility data)");
  });

  test("quote matches the MATH.md §3 reference values", () => {
    const q = quoteSignal({ BUY: 85.5, SELL: 0, HOLD: 14.5 }, null)!;
    assert.equal(q.priceUsd, 3.07);
    assert.equal(q.informationValue, 0.9878);
    assert.equal(q.entropy, 0.5972);
    assert.equal(quoteSignal({ BUY: 0, SELL: 0, HOLD: 0 }, null), null);
  });

  test("endpoint 404s for unknown/private decisions and rejects POST", async () => {
    const res = await quoteHandler(new Request("http://x/api/pricing/signal?id=00000000-0000-0000-0000-000000000000"));
    assert.equal(res.status, 404);
    assert.equal((await quotePostHandler()).status, 405);
  });
});
