import { fetchPriceAt } from "@argus/data-layer";
import { DEFAULT_FLAT_BAND_PCT, percentReturn, realizedDirection } from "@argus/consensus";
import type { VoteDirection } from "@argus/shared-types";
import { db } from "@/lib/db";

export const OUTCOME_HORIZON_DAYS = Number(process.env.OUTCOME_HORIZON_DAYS) || 7;
const DAY_MS = 86_400_000;

function entryPriceFromSnapshot(snapshot: { canonical: string | null; data: unknown } | null): number | null {
  if (!snapshot) return null;
  const data = (snapshot.canonical ? JSON.parse(snapshot.canonical) : snapshot.data) as { price?: { priceUsd?: unknown } };
  const p = data?.price?.priceUsd;
  return typeof p === "number" && p > 0 ? p : null;
}

export interface ScoreRunResult {
  scored: { id: string; asset: string; correct: boolean; returnPct: number }[];
  failed: { id: string; asset: string; error: string }[];
  remaining: number;
}

/**
 * Score sealed decisions whose horizon has passed. Idempotent: a decision is
 * scored at most once (outcome row keyed by decision id).
 */
export async function scorePendingOutcomes({
  now = Date.now(),
  limit = 25,
  horizonDays = OUTCOME_HORIZON_DAYS,
  bandPct = DEFAULT_FLAT_BAND_PCT,
  priceAt = fetchPriceAt,
}: {
  now?: number;
  limit?: number;
  horizonDays?: number;
  bandPct?: number;
  priceAt?: typeof fetchPriceAt;
} = {}): Promise<ScoreRunResult> {
  const due = { sealed: true, outcome: null, recommendation: { not: "NONE" }, createdAt: { lte: new Date(now - horizonDays * DAY_MS) } };
  const [pending, total] = await Promise.all([
    db.analyzeResult.findMany({
      where: due,
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true, asset: true, recommendation: true, createdAt: true, snapshot: { select: { canonical: true, data: true } } },
    }),
    db.analyzeResult.count({ where: due }),
  ]);

  const result: ScoreRunResult = { scored: [], failed: [], remaining: Math.max(0, total - pending.length) };

  for (const d of pending) {
    try {
      const decidedAt = d.createdAt.getTime();
      const entryPrice = entryPriceFromSnapshot(d.snapshot) ?? (await priceAt(d.asset, decidedAt)).priceUsd;
      const exit = await priceAt(d.asset, decidedAt + horizonDays * DAY_MS);
      const returnPct = percentReturn(entryPrice, exit.priceUsd);
      const realized = realizedDirection(returnPct, bandPct);
      const correct = realized === (d.recommendation as VoteDirection);

      await db.decisionOutcome.create({
        data: {
          analyzeResultId: d.id,
          horizonDays,
          flatBandPct: bandPct,
          entryPrice,
          exitPrice: exit.priceUsd,
          exitPriceAt: new Date(exit.timestamp),
          returnPct,
          realizedDirection: realized,
          correct,
          source: exit.source,
        },
      });
      result.scored.push({ id: d.id, asset: d.asset, correct, returnPct });
    } catch (err) {
      result.failed.push({ id: d.id, asset: d.asset, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return result;
}
