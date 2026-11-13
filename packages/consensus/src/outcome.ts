import type { VoteDirection } from "@argus/shared-types";
import { computeReputation, DEFAULT_LAMBDA } from "./reputation";

/** Moves within ±2% over the horizon count as "flat" (a correct HOLD). */
export const DEFAULT_FLAT_BAND_PCT = 2;

/** The direction the market actually took over the horizon. */
export function realizedDirection(returnPct: number, bandPct: number = DEFAULT_FLAT_BAND_PCT): VoteDirection {
  if (!Number.isFinite(returnPct)) throw new RangeError("realizedDirection: returnPct must be finite");
  if (bandPct < 0) throw new RangeError("realizedDirection: bandPct must be >= 0");
  if (returnPct > bandPct) return "BUY";
  if (returnPct < -bandPct) return "SELL";
  return "HOLD";
}

export function isCallCorrect(call: VoteDirection, returnPct: number, bandPct: number = DEFAULT_FLAT_BAND_PCT): boolean {
  return realizedDirection(returnPct, bandPct) === call;
}

export function percentReturn(entryPrice: number, exitPrice: number): number {
  if (!(entryPrice > 0) || !(exitPrice > 0)) throw new RangeError("percentReturn: prices must be > 0");
  return ((exitPrice - entryPrice) / entryPrice) * 100;
}

export interface ScoredCall {
  /** Stated confidence, 0–100. */
  confidence: number;
  correct: boolean;
  ageInDays: number;
}

export interface TrackRecord {
  calls: number;
  hits: number;
  hitRate: number;
  /** Mean (p − o)², p = confidence/100. Lower is better; 0.25 ≈ coin flip at 50% confidence. */
  brier: number;
  /** MATH.md §2 reputation index: 1 − time-decayed Brier. Higher is better. */
  reputation: number;
  avgConfidence: number;
}

export function summarizeTrackRecord(calls: ScoredCall[], lambda: number = DEFAULT_LAMBDA): TrackRecord | null {
  if (calls.length === 0) return null;
  const hits = calls.filter((c) => c.correct).length;
  const brier = calls.reduce((s, c) => s + (c.confidence / 100 - (c.correct ? 1 : 0)) ** 2, 0) / calls.length;
  return {
    calls: calls.length,
    hits,
    hitRate: hits / calls.length,
    brier,
    reputation: computeReputation(
      calls.map((c) => ({ confidence: c.confidence / 100, correct: c.correct ? 1 : 0, ageInDays: c.ageInDays })),
      lambda,
    ),
    avgConfidence: calls.reduce((s, c) => s + c.confidence, 0) / calls.length,
  };
}
