import { runSyndicateDetailed, AGENT_ROSTER } from "@argus/agents";
import { computeConsensus } from "@argus/consensus";
import {
  canonicalJson,
  fetchSnapshot,
  computePromptVersionHash,
  computeReasoningHash,
} from "@argus/data-layer";
import type { AgentRunResult, AgentVote, VoteDirection } from "@argus/shared-types";
import { db } from "@/lib/db";
import { buildSealPayload, isSealable } from "./seal-payload";
import type { AgentOutcome, AnalysisEvent, AnalysisResponse, AnalysisStatus } from "./types";

/** Minimum responsive agents for a sealable consensus (3 of 5). */
export const MIN_RESPONSIVE_AGENTS = 3;

export function toOutcome(r: AgentRunResult): AgentOutcome {
  return { agentId: r.agentId, status: r.status, vote: r.vote, error: r.error };
}

/**
 * Abstentions (required data unavailable) are a principled "no opinion" and
 * do not degrade a run; provider/LLM failures do.
 */
export function classifyRun(responsive: number, failed: number): AnalysisStatus {
  if (responsive < MIN_RESPONSIVE_AGENTS) return "no_quorum";
  return failed === 0 ? "complete" : "degraded";
}

const EMPTY_BREAKDOWN: Record<VoteDirection, number> = { BUY: 0, SELL: 0, HOLD: 0 };

export interface RunAnalysisInput {
  userId: string;
  asset: string;
  onEvent?: (event: AnalysisEvent) => void;
  /** Test seams; default to the real data layer and agent runner. */
  deps?: {
    fetchSnapshot?: typeof fetchSnapshot;
    runSyndicateDetailed?: typeof runSyndicateDetailed;
  };
}

/**
 * Snapshot → syndicate → consensus → persist. Every agent outcome (including
 * failures and raw provider responses) is stored; nothing is silently dropped.
 */
export async function runAnalysis({ userId, asset, onEvent, deps = {} }: RunAnalysisInput): Promise<AnalysisResponse> {
  const snapshot = await (deps.fetchSnapshot ?? fetchSnapshot)(asset);
  onEvent?.({ type: "snapshot", snapshot });

  const results = await (deps.runSyndicateDetailed ?? runSyndicateDetailed)(snapshot, {
    onResult: (r) => onEvent?.({ type: "agent", outcome: toOutcome(r) }),
  });

  const votes: AgentVote[] = results.flatMap((r) => (r.vote ? [r.vote] : []));
  const rosterSize = AGENT_ROSTER.length;
  const failed = results.filter((r) => r.status === "failed").length;
  const status = classifyRun(votes.length, failed);

  const consensus = votes.length > 0 ? computeConsensus(votes) : null;
  const breakdown = { ...EMPTY_BREAKDOWN, ...(consensus?.breakdown ?? {}) };

  const promptVersionHash = computePromptVersionHash(
    votes.map((v) => ({ agentId: v.agentId, promptVersion: v.promptVersion, promptHash: v.promptHash ?? null })),
  );
  const reasoningHash = computeReasoningHash(snapshot.hash, votes);

  const record = await db.$transaction(async (tx) => {
    await tx.marketSnapshot.upsert({
      where: { id: snapshot.snapshotId },
      update: {},
      create: {
        id: snapshot.snapshotId,
        asset: snapshot.asset,
        hash: snapshot.hash,
        data: snapshot.data as object,
        canonical: canonicalJson(snapshot.data),
        sources: snapshot.sources,
        capturedAt: new Date(snapshot.timestamp),
      },
    });

    return tx.analyzeResult.create({
      data: {
        userId,
        asset: snapshot.asset,
        status,
        recommendation: consensus?.recommendation ?? "NONE",
        confidence: consensus?.confidence ?? 0,
        breakdown,
        disagreement: consensus?.disagreement ?? true,
        responsiveCount: votes.length,
        rosterSize,
        snapshotId: snapshot.snapshotId,
        dataSnapshotHash: snapshot.hash,
        promptVersionHash,
        reasoningHash,
        agentVotes: {
          create: results.map((r) => ({
            agentId: r.agentId,
            status: r.status,
            vote: r.vote?.vote ?? null,
            confidence: r.vote?.confidence ?? null,
            reasoning: r.vote?.reasoning ?? null,
            dataPointsCited: r.vote?.dataPointsCited ?? [],
            promptVersion: r.vote?.promptVersion ?? null,
            promptHash: r.vote?.promptHash ?? null,
            modelUsed: r.vote?.modelUsed ?? null,
            provider: r.vote?.params?.provider ?? null,
            temperature: r.vote?.params?.temperature ?? null,
            error: r.error ?? null,
            attempts: r.attempts as unknown as object,
          })),
        },
      },
    });
  });

  const response: AnalysisResponse = {
    id: record.id,
    asset: snapshot.asset,
    status,
    recommendation: consensus?.recommendation ?? "NONE",
    confidence: consensus?.confidence ?? 0,
    breakdown,
    disagreement: consensus?.disagreement ?? true,
    agentVotes: votes,
    agentOutcomes: results.map(toOutcome),
    responsiveCount: votes.length,
    rosterSize,
    degraded: status !== "complete",
    sealable: status !== "no_quorum",
    dataSnapshotHash: snapshot.hash,
    promptVersionHash,
    reasoningHash,
    snapshot,
    createdAt: record.createdAt.toISOString(),
    sealPayload: isSealable(record) ? buildSealPayload(record) : null,
  };
  onEvent?.({ type: "result", result: response });
  return response;
}
