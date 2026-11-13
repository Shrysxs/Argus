import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import type { AgentRunResult, MarketDataSnapshot } from "@argus/shared-types";
import { computeReasoningHash } from "@argus/data-layer";
import { db } from "../lib/db";
import { runAnalysis, classifyRun } from "../lib/analysis/run-analysis";
import type { AnalysisEvent } from "../lib/analysis/types";

const AGENTS = ["value-hunter", "momentum-trader", "macro-analyst", "onchain-sleuth", "risk-guardian"];

function snapshot(id: string): MarketDataSnapshot {
  return {
    snapshotId: id,
    asset: "BTC",
    timestamp: 1_700_000_000_000,
    hash: "cd".repeat(32),
    data: { price: { priceUsd: 90000 } },
    sources: ["coingecko"],
  };
}

function results(okIds: string[]): AgentRunResult[] {
  return AGENTS.map((agentId) =>
    okIds.includes(agentId)
      ? {
          agentId,
          status: "ok",
          vote: {
            agentId,
            vote: "BUY",
            confidence: 70,
            reasoning: `${agentId} reasoning`,
            dataPointsCited: ["Price: $90,000"],
            promptVersion: `${agentId}/v2`,
            promptHash: "ee".repeat(32),
            modelUsed: "m",
            params: { provider: "groq", temperature: 0.2 },
          },
          attempts: [{ provider: "groq", model: "m", httpStatus: 200, rawResponse: "{...}", error: null, latencyMs: 5 }],
        }
      : {
          agentId,
          status: "failed",
          vote: null,
          error: "groq: HTTP 429",
          attempts: [{ provider: "groq", model: "m", httpStatus: 429, rawResponse: "rate limited", error: "HTTP 429", latencyMs: 5 }],
        },
  );
}

describe("runAnalysis persistence", () => {
  let userId: string;

  before(async () => {
    await db.user.deleteMany({ where: { email: "run_analysis@argus.test" } });
    userId = (await db.user.create({ data: { email: "run_analysis@argus.test", passwordHash: "x" } })).id;
  });

  test("classifies quorum", () => {
    assert.equal(classifyRun(5, 0), "complete");
    assert.equal(classifyRun(4, 0), "complete"); // one abstained
    assert.equal(classifyRun(3, 1), "degraded");
    assert.equal(classifyRun(2, 0), "no_quorum");
  });

  test("persists snapshot, every agent outcome and raw attempts", async () => {
    const events: AnalysisEvent["type"][] = [];
    const ok = AGENTS.slice(0, 4);
    const res = await runAnalysis({
      userId,
      asset: "BTC",
      onEvent: (e) => events.push(e.type),
      deps: {
        fetchSnapshot: async () => snapshot(crypto.randomUUID()),
        runSyndicateDetailed: async () => results(ok),
      },
    });

    assert.equal(res.status, "degraded");
    assert.equal(res.responsiveCount, 4);
    assert.equal(res.sealable, true);
    assert.deepEqual(events, ["snapshot", "result"]);

    const row = await db.analyzeResult.findUniqueOrThrow({
      where: { id: res.id },
      include: { agentVotes: true, snapshot: true },
    });
    assert.equal(row.agentVotes.length, 5);
    assert.equal(row.agentVotes.find((v) => v.agentId === "risk-guardian")?.status, "failed");
    assert.equal(row.snapshot?.hash, "cd".repeat(32));
    assert.equal(row.reasoningHash, computeReasoningHash("cd".repeat(32), res.agentVotes));
    const attempts = row.agentVotes.find((v) => v.agentId === "risk-guardian")!.attempts as any[];
    assert.equal(attempts[0].rawResponse, "rate limited");
  });

  test("zero responsive agents records NONE, not a fabricated HOLD", async () => {
    const res = await runAnalysis({
      userId,
      asset: "BTC",
      deps: {
        fetchSnapshot: async () => snapshot(crypto.randomUUID()),
        runSyndicateDetailed: async () => results([]),
      },
    });
    assert.equal(res.recommendation, "NONE");
    assert.equal(res.status, "no_quorum");
    assert.equal(res.sealable, false);
  });
});

describe("POST /api/analyze streaming", () => {
  test("returns 401 before opening a stream when unauthenticated", async () => {
    const { POST } = await import("../app/api/analyze/route");
    const res = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: { Accept: "text/event-stream", "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    assert.equal(res.status, 401);
    assert.match(res.headers.get("content-type") ?? "", /json/);
  });
});
