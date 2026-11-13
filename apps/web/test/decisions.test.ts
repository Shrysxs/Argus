import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import type { AgentRunResult } from "@argus/shared-types";
import { sha256, computePromptVersionHash, computeReasoningHash } from "@argus/data-layer";
import { db } from "../lib/db";
import { runAnalysis } from "../lib/analysis/run-analysis";
import { getDecision, listSealedDecisions } from "../lib/decisions";

const AGENTS = ["value-hunter", "momentum-trader", "macro-analyst", "onchain-sleuth", "risk-guardian"];

const results: AgentRunResult[] = AGENTS.map((agentId, i) => ({
  agentId,
  status: "ok",
  vote: {
    agentId,
    vote: i % 2 ? "BUY" : "HOLD",
    confidence: 61.3 + i,
    reasoning: `Reasoning ${i} with unicode — “quotes” and 1e-7 small numbers`,
    dataPointsCited: [`RSI(14): ${40 + i}.5`, "Price: $0.000012"],
    promptVersion: `${agentId}/v3`,
    promptHash: String(i).repeat(64).slice(0, 64),
    modelUsed: "m",
    params: { provider: "groq", temperature: 0.2 },
  },
  attempts: [],
}));

describe("public decision records", () => {
  let ownerId: string;
  let otherId: string;
  let decisionId: string;

  before(async () => {
    await db.user.deleteMany({ where: { email: { in: ["dec_owner@argus.test", "dec_other@argus.test"] } } });
    ownerId = (await db.user.create({ data: { email: "dec_owner@argus.test", passwordHash: "x" } })).id;
    otherId = (await db.user.create({ data: { email: "dec_other@argus.test", passwordHash: "x" } })).id;
    // Awkward numbers on purpose: JSONB round-trips must not change the hash.
    const data = {
      // 17-significant-digit doubles (real CoinGecko values) lose precision through Prisma's Json path.
      price: { priceUsd: 0.000012345, marketCapUsd: 1378198275777.4033, priceChangePercent24h: -4.658430555257058, volume24hUsd: null },
      big: 1.2e21,
      technicals: { rsi14: 33.33, macd: { macd: -0.0000042, signal: 1e-7, histogram: 0 } },
      z: { nested: [3, 2, 1], a: "ü" },
    };
    const res = await runAnalysis({
      userId: ownerId,
      asset: "PEPE",
      deps: {
        fetchSnapshot: async () => ({ snapshotId: crypto.randomUUID(), asset: "PEPE", timestamp: Date.now(), hash: sha256(data), data, sources: ["test"] }),
        runSyndicateDetailed: async () => results,
      },
    });
    decisionId = res.id;
  });

  test("unsealed decisions are visible to the owner only", async () => {
    assert.ok(await getDecision(decisionId, ownerId));
    assert.equal(await getDecision(decisionId, otherId), null);
    assert.equal(await getDecision(decisionId, null), null);
    assert.equal(await getDecision("not-a-uuid", ownerId), null);
  });

  test("every hash re-verifies from what the database returns", async () => {
    const d = (await getDecision(decisionId, ownerId))!;
    const { createHash } = await import("node:crypto");
    assert.equal(createHash("sha256").update(d.snapshot!.canonical!).digest("hex"), d.dataSnapshotHash);
    // Parsing the canonical bytes (what a verifier does) also round-trips exactly.
    assert.equal(sha256(JSON.parse(d.snapshot!.canonical!)), d.dataSnapshotHash);
    const ok = d.agentVotes.filter((v) => v.status === "ok").map((v) => ({
      agentId: v.agentId,
      vote: v.vote!,
      confidence: v.confidence!,
      reasoning: v.reasoning!,
      dataPointsCited: v.dataPointsCited,
      promptVersion: v.promptVersion!,
      promptHash: v.promptHash,
    }));
    assert.equal(computePromptVersionHash(ok), d.promptVersionHash);
    assert.equal(computeReasoningHash(d.dataSnapshotHash, ok), d.reasoningHash);
  });

  test("sealed decisions become public and appear in the feed without user ids", async () => {
    await db.analyzeResult.update({ where: { id: decisionId }, data: { sealed: true, txHash: `0x${"9".repeat(64)}`, sealedAt: new Date(), sealedBy: "backend" } });
    const pub = await getDecision(decisionId, null);
    assert.ok(pub);
    assert.equal("userId" in pub!, false);
    const feed = await listSealedDecisions({ asset: "pepe" });
    assert.ok(feed.items.some((i) => i.id === decisionId));
  });
});
