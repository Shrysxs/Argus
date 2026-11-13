import { isCallCorrect, summarizeTrackRecord, type ScoredCall, type TrackRecord } from "@argus/consensus";
import type { VoteDirection } from "@argus/shared-types";
import { db } from "@/lib/db";

const DAY_MS = 86_400_000;
/** Bound the in-memory aggregation; move to an indexer/materialized view at scale (AGENTS.md §8). */
const MAX_OUTCOMES = 5000;

export interface LeaderboardRow {
  agentId: string;
  record: TrackRecord | null;
  abstentions: number;
  recent: boolean[];
}

export interface Leaderboard {
  agents: LeaderboardRow[];
  committee: TrackRecord | null;
  scoredDecisions: number;
  pendingDecisions: number;
}

export async function getLeaderboard(now = Date.now()): Promise<Leaderboard> {
  const [outcomes, pendingDecisions] = await Promise.all([
    db.decisionOutcome.findMany({
      orderBy: { scoredAt: "desc" },
      take: MAX_OUTCOMES,
      select: {
        returnPct: true,
        flatBandPct: true,
        correct: true,
        analyzeResult: {
          select: {
            createdAt: true,
            confidence: true,
            agentVotes: { select: { agentId: true, status: true, vote: true, confidence: true } },
          },
        },
      },
    }),
    db.analyzeResult.count({ where: { sealed: true, outcome: null, recommendation: { not: "NONE" } } }),
  ]);

  const perAgent = new Map<string, { calls: ScoredCall[]; abstentions: number }>();
  const committee: ScoredCall[] = [];

  for (const o of outcomes) {
    const ageInDays = Math.max(0, (now - o.analyzeResult.createdAt.getTime()) / DAY_MS);
    committee.push({ confidence: o.analyzeResult.confidence, correct: o.correct, ageInDays });
    for (const v of o.analyzeResult.agentVotes) {
      const entry = perAgent.get(v.agentId) ?? { calls: [], abstentions: 0 };
      if (v.status === "ok" && v.vote && v.confidence !== null) {
        entry.calls.push({
          confidence: v.confidence,
          correct: isCallCorrect(v.vote as VoteDirection, o.returnPct, o.flatBandPct),
          ageInDays,
        });
      } else if (v.status === "abstained") {
        entry.abstentions++;
      }
      perAgent.set(v.agentId, entry);
    }
  }

  const agents: LeaderboardRow[] = [...perAgent.entries()].map(([agentId, e]) => ({
    agentId,
    record: summarizeTrackRecord(e.calls),
    abstentions: e.abstentions,
    recent: e.calls.slice(0, 10).map((c) => c.correct),
  }));
  agents.sort((a, b) => (b.record?.reputation ?? -1) - (a.record?.reputation ?? -1));

  return { agents, committee: summarizeTrackRecord(committee), scoredDecisions: outcomes.length, pendingDecisions };
}
