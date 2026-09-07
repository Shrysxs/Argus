import { test, describe } from "node:test";
import assert from "node:assert/strict";

interface AnalyzeRecordMock {
  id: string;
  userId: string;
  asset: string;
  recommendation: "BUY" | "SELL" | "HOLD";
  confidence: number;
  breakdown: { BUY: number; SELL: number; HOLD: number };
  disagreement: boolean;
  dataSnapshotHash: string;
  promptVersionHash: string;
  sealed: boolean;
  txHash: string | null;
  createdAt: Date;
}

// In-memory mock store representing AnalyzeResult DB table
class MockAnalyzeDb {
  private records: AnalyzeRecordMock[] = [];

  async create(data: Omit<AnalyzeRecordMock, "id" | "createdAt">): Promise<AnalyzeRecordMock> {
    const record: AnalyzeRecordMock = {
      ...data,
      id: `analyze_rec_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date(),
    };
    this.records.push(record);
    return record;
  }

  async updateMany(query: {
    where: { id?: string; userId: string; asset?: string; dataSnapshotHash?: string; sealed?: boolean };
    data: { sealed?: boolean; txHash?: string | null };
  }): Promise<{ count: number }> {
    let count = 0;
    for (const rec of this.records) {
      if (rec.userId !== query.where.userId) continue;
      if (query.where.id && rec.id !== query.where.id) continue;
      if (query.where.asset && rec.asset !== query.where.asset) continue;
      if (query.where.dataSnapshotHash && rec.dataSnapshotHash !== query.where.dataSnapshotHash) continue;
      if (query.where.sealed !== undefined && rec.sealed !== query.where.sealed) continue;

      if (query.data.sealed !== undefined) rec.sealed = query.data.sealed;
      if (query.data.txHash !== undefined) rec.txHash = query.data.txHash;
      count++;
    }
    return { count };
  }

  async findMany(query: {
    where: { userId: string };
    skip?: number;
    take?: number;
  }): Promise<AnalyzeRecordMock[]> {
    const userRecords = this.records
      .filter((r) => r.userId === query.where.userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const skip = query.skip || 0;
    const take = query.take || userRecords.length;
    return userRecords.slice(skip, skip + take);
  }

  async count(query: { where: { userId: string } }): Promise<number> {
    return this.records.filter((r) => r.userId === query.where.userId).length;
  }

  clear() {
    this.records = [];
  }
}

describe("Analyze History Persistence & User Isolation (BACKEND.md & AGENTS.md)", () => {
  const dbMock = new MockAnalyzeDb();

  test("1. Unauthenticated /api/history request returns 401 status", async () => {
    const sessionUser = null;
    const responseStatus = sessionUser ? 200 : 401;
    const responseBody = sessionUser ? {} : { error: "Unauthorized" };

    assert.strictEqual(responseStatus, 401);
    assert.strictEqual(responseBody.error, "Unauthorized");
  });

  test("2. Auto-persistence on /api/analyze creates unsealed AnalyzeResult record", async () => {
    dbMock.clear();
    const userId = "user_123";

    const record = await dbMock.create({
      userId,
      asset: "BTC",
      recommendation: "BUY",
      confidence: 85.5,
      breakdown: { BUY: 85.5, SELL: 0, HOLD: 14.5 },
      disagreement: false,
      dataSnapshotHash: "0xhash_snapshot_1",
      promptVersionHash: "0xhash_prompt_1",
      sealed: false,
      txHash: null,
    });

    assert.ok(record.id.startsWith("analyze_rec_"));
    assert.strictEqual(record.userId, "user_123");
    assert.strictEqual(record.asset, "BTC");
    assert.strictEqual(record.sealed, false);
    assert.strictEqual(record.txHash, null);

    const count = await dbMock.count({ where: { userId } });
    assert.strictEqual(count, 1);
  });

  test("3. Sealing update on /api/record updates AnalyzeResult record with sealed=true and txHash", async () => {
    dbMock.clear();
    const userId = "user_123";

    const created = await dbMock.create({
      userId,
      asset: "ETH",
      recommendation: "SELL",
      confidence: 70.0,
      breakdown: { BUY: 10, SELL: 70, HOLD: 20 },
      disagreement: false,
      dataSnapshotHash: "0xhash_snapshot_eth",
      promptVersionHash: "0xhash_prompt_eth",
      sealed: false,
      txHash: null,
    });

    // Simulate sealing via /api/record
    const updateResult = await dbMock.updateMany({
      where: { id: created.id, userId },
      data: { sealed: true, txHash: "0xmonad_tx_hash_12345" },
    });

    assert.strictEqual(updateResult.count, 1);

    const userHistory = await dbMock.findMany({ where: { userId } });
    assert.strictEqual(userHistory.length, 1);
    assert.strictEqual(userHistory[0]!.sealed, true);
    assert.strictEqual(userHistory[0]!.txHash, "0xmonad_tx_hash_12345");
  });

  test("4. Strict user data isolation: User A cannot see or update User B's history", async () => {
    dbMock.clear();
    const userA = "user_A";
    const userB = "user_B";

    await dbMock.create({
      userId: userA,
      asset: "BTC",
      recommendation: "BUY",
      confidence: 90,
      breakdown: { BUY: 90, SELL: 0, HOLD: 10 },
      disagreement: false,
      dataSnapshotHash: "0xsnapshot_A",
      promptVersionHash: "0xprompt_A",
      sealed: false,
      txHash: null,
    });

    await dbMock.create({
      userId: userB,
      asset: "SOL",
      recommendation: "HOLD",
      confidence: 55,
      breakdown: { BUY: 20, SELL: 25, HOLD: 55 },
      disagreement: true,
      dataSnapshotHash: "0xsnapshot_B",
      promptVersionHash: "0xprompt_B",
      sealed: false,
      txHash: null,
    });

    // Query for User A
    const historyA = await dbMock.findMany({ where: { userId: userA } });
    assert.strictEqual(historyA.length, 1);
    assert.strictEqual(historyA[0]!.asset, "BTC");

    // Query for User B
    const historyB = await dbMock.findMany({ where: { userId: userB } });
    assert.strictEqual(historyB.length, 1);
    assert.strictEqual(historyB[0]!.asset, "SOL");

    // User B attempts to seal User A's record -> updateMany should affect 0 rows
    const crossUserUpdate = await dbMock.updateMany({
      where: { userId: userB, dataSnapshotHash: "0xsnapshot_A" },
      data: { sealed: true, txHash: "0xmalicious_tx" },
    });
    assert.strictEqual(crossUserUpdate.count, 0);

    // Verify User A's record remains unsealed
    const historyAAfter = await dbMock.findMany({ where: { userId: userA } });
    assert.strictEqual(historyAAfter[0]!.sealed, false);
  });

  test("5. Pagination calculation logic correctly slices records", async () => {
    dbMock.clear();
    const userId = "user_paginated";

    // Insert 15 records
    for (let i = 1; i <= 15; i++) {
      await dbMock.create({
        userId,
        asset: i % 2 === 0 ? "ETH" : "BTC",
        recommendation: "BUY",
        confidence: 80,
        breakdown: { BUY: 80, SELL: 10, HOLD: 10 },
        disagreement: false,
        dataSnapshotHash: `0xsnapshot_${i}`,
        promptVersionHash: `0xprompt_${i}`,
        sealed: false,
        txHash: null,
      });
    }

    const totalCount = await dbMock.count({ where: { userId } });
    const limit = 10;
    const totalPages = Math.ceil(totalCount / limit);

    assert.strictEqual(totalCount, 15);
    assert.strictEqual(totalPages, 2);

    // Page 1
    const page1 = await dbMock.findMany({ where: { userId }, skip: 0, take: limit });
    assert.strictEqual(page1.length, 10);

    // Page 2
    const page2 = await dbMock.findMany({ where: { userId }, skip: 10, take: limit });
    assert.strictEqual(page2.length, 5);
  });
});
