// Pure technical indicator math (no I/O). Inputs are daily closes, oldest first.
// Standard definitions are used so values can be cross-checked against any
// charting tool: Wilder RSI, EMA-seeded-by-SMA, MACD(12,26,9).

const round = (n: number, dp = 4) => Math.round(n * 10 ** dp) / 10 ** dp;

export function sma(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

/** Full EMA series (seeded with the SMA of the first `period` values). */
export function emaSeries(values: number[], period: number): number[] {
  if (period <= 0 || values.length < period) return [];
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  const out = [prev];
  for (let i = period; i < values.length; i++) {
    prev = values[i]! * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function ema(values: number[], period: number): number | null {
  const s = emaSeries(values, period);
  return s.length ? s[s.length - 1]! : null;
}

/** Wilder's RSI. */
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i]! - closes[i - 1]!;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i]! - closes[i - 1]!;
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface Macd {
  macd: number;
  signal: number;
  histogram: number;
}

export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9): Macd | null {
  if (closes.length < slow + signalPeriod) return null;
  const fastS = emaSeries(closes, fast);
  const slowS = emaSeries(closes, slow);
  // Align: slowS[i] corresponds to closes[slow - 1 + i]; fastS[j] to closes[fast - 1 + j].
  const offset = slow - fast;
  const line = slowS.map((s, i) => fastS[i + offset]! - s);
  const sig = emaSeries(line, signalPeriod);
  const m = line[line.length - 1]!;
  const s = sig[sig.length - 1]!;
  return { macd: m, signal: s, histogram: m - s };
}

/** Annualized realized volatility of daily log returns over the last `window` days, in %. */
export function realizedVolatility(closes: number[], window = 30): number | null {
  if (closes.length < window + 1) return null;
  const slice = closes.slice(-(window + 1));
  const rets: number[] = [];
  for (let i = 1; i < slice.length; i++) rets.push(Math.log(slice[i]! / slice[i - 1]!));
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(365) * 100;
}

/** % change over the last `days` closes. */
export function percentChange(closes: number[], days: number): number | null {
  if (closes.length < days + 1) return null;
  const from = closes[closes.length - 1 - days]!;
  const to = closes[closes.length - 1]!;
  return ((to - from) / from) * 100;
}

/** % below the max close within the window (0 at a new high). */
export function drawdownFromHigh(closes: number[], window: number): number | null {
  if (closes.length === 0) return null;
  const slice = closes.slice(-window);
  const high = Math.max(...slice);
  const last = slice[slice.length - 1]!;
  return ((last - high) / high) * 100;
}

export interface Technicals {
  /** Number of daily closes the indicators were computed from. */
  lookbackDays: number;
  lastClose: number;
  rsi14: number | null;
  macd: Macd | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  /** Position of last close relative to each EMA, in %. */
  priceVsEma20Pct: number | null;
  priceVsEma50Pct: number | null;
  priceVsEma200Pct: number | null;
  change7dPct: number | null;
  change30dPct: number | null;
  change90dPct: number | null;
  realizedVol30dPct: number | null;
  drawdownFrom90dHighPct: number | null;
  /** 7-day average volume divided by 30-day average volume. >1 = rising participation. */
  volumeTrend7v30: number | null;
}

export function computeTechnicals(closes: number[], volumes: number[] = []): Technicals {
  if (closes.length === 0) throw new RangeError("computeTechnicals: no closes");
  const last = closes[closes.length - 1]!;
  const rel = (v: number | null) => (v === null ? null : round(((last - v) / v) * 100, 2));
  const r = (v: number | null, dp = 2) => (v === null ? null : round(v, dp));
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const e200 = ema(closes, 200);
  const m = macd(closes);
  const v7 = sma(volumes, 7);
  const v30 = sma(volumes, 30);

  return {
    lookbackDays: closes.length,
    lastClose: last,
    rsi14: r(rsi(closes, 14)),
    macd: m ? { macd: r(m.macd, 4)!, signal: r(m.signal, 4)!, histogram: r(m.histogram, 4)! } : null,
    ema20: r(e20, 4),
    ema50: r(e50, 4),
    ema200: r(e200, 4),
    priceVsEma20Pct: rel(e20),
    priceVsEma50Pct: rel(e50),
    priceVsEma200Pct: rel(e200),
    change7dPct: r(percentChange(closes, 7)),
    change30dPct: r(percentChange(closes, 30)),
    change90dPct: r(percentChange(closes, 90)),
    realizedVol30dPct: r(realizedVolatility(closes, 30)),
    drawdownFrom90dHighPct: r(drawdownFromHigh(closes, 90)),
    volumeTrend7v30: v7 !== null && v30 ? r(v7 / v30, 3) : null,
  };
}
