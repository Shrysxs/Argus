import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sma, ema, rsi, macd, realizedVolatility, percentChange, drawdownFromHigh, computeTechnicals } from "./indicators";

const close = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

describe("indicators", () => {
  it("sma / ema basics", () => {
    assert.equal(sma([1, 2, 3, 4], 2), 3.5);
    assert.equal(sma([1], 2), null);
    // EMA of a constant series is the constant.
    close(ema(Array(50).fill(10), 20)!, 10);
    // Seeded with SMA(1,2,3)=2 then k=0.5: 4*0.5+2*0.5=3
    close(ema([1, 2, 3, 4], 3)!, 3);
  });

  it("rsi: monotonic up = 100, monotonic down = 0, flat = 50", () => {
    const up = Array.from({ length: 30 }, (_, i) => 100 + i);
    assert.equal(rsi(up), 100);
    assert.equal(rsi([...up].reverse()), 0);
    assert.equal(rsi(Array(30).fill(5)), 50);
    assert.equal(rsi([1, 2, 3]), null);
  });

  it("rsi matches the Wilder reference example", () => {
    // Classic dataset from the StockCharts RSI tutorial. They report 70.53 using
    // rounded intermediate averages (0.2385 / 0.0996); unrounded Wilder RSI is 70.46.
    const closes = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28];
    close(rsi(closes)!, 70.464, 0.001);
  });

  it("macd is positive in an accelerating uptrend and null with too little data", () => {
    const up = Array.from({ length: 60 }, (_, i) => 100 * 1.01 ** i);
    const m = macd(up)!;
    assert.ok(m.macd > 0);
    assert.equal(macd(up.slice(0, 20)), null);
  });

  it("realized volatility of a constant-return series is 0", () => {
    const series = Array.from({ length: 40 }, (_, i) => 100 * 1.02 ** i);
    close(realizedVolatility(series)!, 0, 1e-9);
  });

  it("percentChange and drawdown", () => {
    close(percentChange([100, 110, 121], 2)!, 21);
    close(drawdownFromHigh([100, 200, 150], 90)!, -25);
  });

  it("computeTechnicals degrades indicators to null when history is short", () => {
    const t = computeTechnicals([1, 2, 3, 4, 5]);
    assert.equal(t.lookbackDays, 5);
    assert.equal(t.rsi14, null);
    assert.equal(t.ema200, null);
    assert.throws(() => computeTechnicals([]));
  });
});
