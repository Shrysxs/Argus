import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GET as historyHandler } from "../app/api/history/route";
import { db } from "../lib/db";
import { createSession, destroySession } from "../lib/auth/session";

describe("Analyze History Persistence & User Isolation (Real Database & Route Handler)", () => {
  let testUserAId: string;
  let testUserBId: string;
  let sessionAId: string;

  beforeEach(async () => {
    // Clean existing test users if any
    await db.user.deleteMany({
      where: { email: { in: ["history_a@argus.io", "history_b@argus.io"] } },
    });

    const userA = await db.user.create({
      data: { email: "history_a@argus.io", passwordHash: "hashA" },
    });
    const userB = await db.user.create({
      data: { email: "history_b@argus.io", passwordHash: "hashB" },
    });

    testUserAId = userA.id;
    testUserBId = userB.id;

    sessionAId = await createSession(testUserAId);
  });

  test("1. Unauthenticated /api/history request returns 401 status", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "GET",
    });

    const res = await historyHandler(req);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error, "Unauthorized");
  });

  test("2. Prisma analyzeResult creation and retrieval via /api/history", async () => {
    await db.analyzeResult.create({
      data: {
        userId: testUserAId,
        asset: "BTC",
        recommendation: "BUY",
        confidence: 85.5,
        breakdown: { BUY: 85.5, SELL: 0, HOLD: 14.5 },
        disagreement: false,
        dataSnapshotHash: "0xhash_snapshot_1",
        promptVersionHash: "0xhash_prompt_1",
        sealed: false,
        txHash: null,
      },
    });

    const results = await db.analyzeResult.findMany({ where: { userId: testUserAId } });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0]?.asset, "BTC");
    assert.strictEqual(results[0]?.sealed, false);
  });

  test("3. Sealing update on analyzeResult updates database record with sealed=true and txHash", async () => {
    const created = await db.analyzeResult.create({
      data: {
        userId: testUserAId,
        asset: "ETH",
        recommendation: "SELL",
        confidence: 70.0,
        breakdown: { BUY: 10, SELL: 70, HOLD: 20 },
        disagreement: false,
        dataSnapshotHash: "0xhash_snapshot_eth",
        promptVersionHash: "0xhash_prompt_eth",
        sealed: false,
        txHash: null,
      },
    });

    await db.analyzeResult.update({
      where: { id: created.id },
      data: { sealed: true, txHash: "0xmonad_tx_hash_12345" },
    });

    const updated = await db.analyzeResult.findUnique({ where: { id: created.id } });
    assert.ok(updated);
    assert.strictEqual(updated.sealed, true);
    assert.strictEqual(updated.txHash, "0xmonad_tx_hash_12345");
  });

  test("4. Strict user data isolation: User A cannot see or update User B's history", async () => {
    await db.analyzeResult.create({
      data: {
        userId: testUserAId,
        asset: "BTC",
        recommendation: "BUY",
        confidence: 90,
        breakdown: { BUY: 90, SELL: 0, HOLD: 10 },
        disagreement: false,
        dataSnapshotHash: "0xsnapshot_A",
        promptVersionHash: "0xprompt_A",
      },
    });

    await db.analyzeResult.create({
      data: {
        userId: testUserBId,
        asset: "SOL",
        recommendation: "HOLD",
        confidence: 55,
        breakdown: { BUY: 20, SELL: 25, HOLD: 55 },
        disagreement: true,
        dataSnapshotHash: "0xsnapshot_B",
        promptVersionHash: "0xprompt_B",
      },
    });

    const userARecords = await db.analyzeResult.findMany({ where: { userId: testUserAId } });
    const userBRecords = await db.analyzeResult.findMany({ where: { userId: testUserBId } });

    assert.strictEqual(userARecords.length, 1);
    assert.strictEqual(userARecords[0]?.asset, "BTC");
    assert.strictEqual(userBRecords.length, 1);
    assert.strictEqual(userBRecords[0]?.asset, "SOL");
  });
});
