import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { scorePendingOutcomes } from "../lib/outcomes";
import { getLeaderboard } from "../lib/leaderboard";
import { GET as cronHandler } from "../app/api/cron/score-outcomes/route";

const DAY = 86_400_000;

describe("outcome scoring & leaderboard", () => {
  let userId: string;
  const ids: Record<string, string> = {};

  before(async () => {
    await db.user.deleteMany({ where: { email: "outcomes@argus.test" } });
    await db.decisionOutcome.deleteMany({});
    userId = (await db.user.create({ data: { email: "outcomes@argus.test", passwordHash: "x" } })).id;
    const mk = async (key: string, recommendation: string, ageDays: number, sealed = true) => {
      const snap = await db.marketSnapshot.create({
        data: {
          id: crypto.randomUUID(),
          asset: "ETH",
          hash: "ab".repeat(32),
          data: {},
          canonical: JSON.stringify({ price: { priceUsd: 100 } }),
          sources: [],
          capturedAt: new Date(),
        },
      });
      const row = await db.analyzeResult.create({
        data: {
          userId,
          asset: "ETH",
          recommendation,
          confidence: 70,
          breakdown: {},
          dataSnapshotHash: "ab".repeat(32),
          promptVersionHash: "cd".repeat(32),
          sealed,
          txHash: sealed ? `0x${key.padEnd(64, "0")}` : null,
          snapshotId: snap.id,
          createdAt: new Date(Date.now() - ageDays * DAY),
          agentVotes: {
            create: [
              { agentId: "momentum-trader", status: "ok", vote: "BUY", confidence: 80, dataPointsCited: [] },
              { agentId: "risk-guardian", status: "ok", vote: "SELL", confidence: 90, dataPointsCited: [] },
              { agentId: "onchain-sleuth", status: "abstained", dataPointsCited: [] },
            ],
          },
        },
      });
      ids[key] = row.id;
    };
    await mk("a", "BUY", 10);
    await mk("b", "BUY", 3); // horizon not reached
    await mk("c", "SELL", 9, false); // unsealed: never scored
  });

  test("scores only sealed decisions past the horizon, once", async () => {
    const priceAt = async () => ({ priceUsd: 110, timestamp: Date.now() - 3 * DAY, source: "test" });
    const r1 = await scorePendingOutcomes({ priceAt });
    assert.deepEqual(r1.scored.map((s) => s.id), [ids.a]);
    assert.equal(r1.scored[0]!.correct, true);
    assert.ok(Math.abs(r1.scored[0]!.returnPct - 10) < 1e-9);
    const r2 = await scorePendingOutcomes({ priceAt });
    assert.equal(r2.scored.length, 0);
  });

  test("price failures are reported, not swallowed", async () => {
    await db.analyzeResult.update({ where: { id: ids.b }, data: { createdAt: new Date(Date.now() - 8 * DAY) } });
    const r = await scorePendingOutcomes({ priceAt: async () => { throw new Error("rate limited"); } });
    assert.equal(r.failed.length, 1);
    assert.match(r.failed[0]!.error, /rate limited/);
  });

  test("leaderboard grades each agent's own vote and counts abstentions", async () => {
    const lb = await getLeaderboard();
    const mom = lb.agents.find((a) => a.agentId === "momentum-trader")!;
    const risk = lb.agents.find((a) => a.agentId === "risk-guardian")!;
    assert.equal(mom.record!.hits, 1); // BUY on +10%
    assert.equal(risk.record!.hits, 0); // SELL on +10%
    assert.ok(mom.record!.reputation > risk.record!.reputation);
    assert.equal(lb.agents.find((a) => a.agentId === "onchain-sleuth")!.abstentions, 1);
    assert.equal(lb.scoredDecisions, 1);
  });

  test("cron endpoint requires the bearer secret", async () => {
    process.env.CRON_SECRET = "s3cret";
    assert.equal((await cronHandler(new Request("http://x/api/cron/score-outcomes"))).status, 401);
    assert.equal((await cronHandler(new Request("http://x", { headers: { authorization: "Bearer nope" } }))).status, 401);
    delete process.env.CRON_SECRET;
    assert.equal((await cronHandler(new Request("http://x", { headers: { authorization: "Bearer " } }))).status, 401);
  });
});
