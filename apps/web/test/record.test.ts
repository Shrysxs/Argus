import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { DecisionPayload, VerifiedDecision } from "@argus/shared-types";
import { MonadChainAdapter } from "@argus/chain-adapters";
import { POST as recordHandler } from "../app/api/record/route";
import { db } from "../lib/db";
import { createSession } from "../lib/auth/session";
import { setChainAdapterForTests } from "../lib/chain";
import { resetRateLimit } from "../lib/auth/rate-limit";
import { buildSealPayload } from "../lib/analysis/seal-payload";

const TX = `0x${"e5".repeat(32)}`;
const TX2 = `0x${"f6".repeat(32)}`;

class FakeAdapter extends MonadChainAdapter {
  recorded: DecisionPayload[] = [];
  verifyResult: "ok" | "mismatch" = "ok";
  failRecord = false;
  constructor(private configured = true) {
    super({ signerPrivateKey: "" });
  }
  override get signerConfigured() {
    return this.configured;
  }
  override async recordDecision(p: DecisionPayload) {
    if (this.failRecord) throw new Error("On-chain transaction reverted: 0xdead");
    this.recorded.push(p);
    return { txHash: TX };
  }
  override async verifyDecision(txHash: string, _p: DecisionPayload): Promise<VerifiedDecision> {
    if (this.verifyResult === "mismatch") throw new Error("Transaction does not contain a DecisionRecorded event matching this analysis");
    return { txHash, sender: "0x00000000000000000000000000000000000000aa", blockNumber: "7" };
  }
}

function req(body: unknown, session?: string) {
  return new Request("http://localhost/api/record", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(session ? { cookie: `argus_session=${session}` } : {}) },
    body: JSON.stringify(body),
  });
}

describe("POST /api/record", () => {
  let userId: string;
  let otherUserId: string;
  let session: string;
  let adapter: FakeAdapter;

  async function makeAnalysis(overrides: Record<string, unknown> = {}, owner = userId) {
    return db.analyzeResult.create({
      data: {
        userId: owner,
        asset: "BTC",
        status: "complete",
        recommendation: "BUY",
        confidence: 71.25,
        breakdown: { BUY: 285, SELL: 0, HOLD: 115 },
        responsiveCount: 5,
        dataSnapshotHash: "11".repeat(32),
        promptVersionHash: "22".repeat(32),
        reasoningHash: "33".repeat(32),
        ...overrides,
      },
    });
  }

  before(async () => {
    await db.user.deleteMany({ where: { email: { in: ["record_a@argus.test", "record_b@argus.test"] } } });
    userId = (await db.user.create({ data: { email: "record_a@argus.test", passwordHash: "x" } })).id;
    otherUserId = (await db.user.create({ data: { email: "record_b@argus.test", passwordHash: "x" } })).id;
    session = await createSession(userId);
  });

  beforeEach(async () => {
    await db.analyzeResult.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
    adapter = new FakeAdapter();
    setChainAdapterForTests(adapter);
    resetRateLimit(`record:${userId}`);
  });

  after(() => setChainAdapterForTests(null));

  test("401 when unauthenticated", async () => {
    const res = await recordHandler(req({ id: "x" }));
    assert.equal(res.status, 401);
  });

  test("backend seal uses the stored row, ignoring tampered client fields", async () => {
    const row = await makeAnalysis();
    const res = await recordHandler(
      req({ id: row.id, consensus: { recommendation: "SELL", confidence: 99 }, dataSnapshotHash: "ff".repeat(32) }, session),
    );
    assert.equal(res.status, 200);
    assert.equal(adapter.recorded.length, 1);
    assert.deepEqual(adapter.recorded[0], buildSealPayload(row));
    assert.equal(adapter.recorded[0]!.consensus.recommendation, "BUY");

    const after = await db.analyzeResult.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(after.sealed, true);
    assert.equal(after.sealedBy, "backend");
    assert.equal(after.txHash, TX);
  });

  test("client tx hash is verified on-chain before sealing", async () => {
    const row = await makeAnalysis();
    adapter.verifyResult = "mismatch";
    const bad = await recordHandler(req({ id: row.id, txHash: TX2 }, session));
    assert.equal(bad.status, 422);
    assert.equal((await db.analyzeResult.findUniqueOrThrow({ where: { id: row.id } })).sealed, false);

    adapter.verifyResult = "ok";
    const good = await recordHandler(req({ id: row.id, txHash: TX2 }, session));
    assert.equal(good.status, 200);
    const sealed = await db.analyzeResult.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(sealed.sealedBy, "client");
    assert.equal(sealed.signerAddress, "0x00000000000000000000000000000000000000aa");
  });

  test("a tx hash cannot be reused for a second analysis", async () => {
    const a = await makeAnalysis();
    const b = await makeAnalysis();
    assert.equal((await recordHandler(req({ id: a.id, txHash: TX2 }, session))).status, 200);
    assert.equal((await recordHandler(req({ id: b.id, txHash: TX2 }, session))).status, 409);
  });

  test("cannot seal twice, another user's analysis, or a no-quorum analysis", async () => {
    const row = await makeAnalysis();
    assert.equal((await recordHandler(req({ id: row.id }, session))).status, 200);
    assert.equal((await recordHandler(req({ id: row.id }, session))).status, 409);

    const foreign = await makeAnalysis({}, otherUserId);
    assert.equal((await recordHandler(req({ id: foreign.id }, session))).status, 404);

    const noQuorum = await makeAnalysis({ status: "no_quorum", recommendation: "NONE", confidence: 0 });
    assert.equal((await recordHandler(req({ id: noQuorum.id }, session))).status, 422);
  });

  test("rejects malformed tx hashes and missing ids", async () => {
    const row = await makeAnalysis();
    assert.equal((await recordHandler(req({ id: row.id, txHash: "0x1234" }, session))).status, 400);
    assert.equal((await recordHandler(req({}, session))).status, 400);
  });

  test("503 when backend signer is not configured", async () => {
    setChainAdapterForTests(new FakeAdapter(false));
    const row = await makeAnalysis();
    assert.equal((await recordHandler(req({ id: row.id }, session))).status, 503);
  });

  test("chain failure surfaces loudly and releases the claim for retry", async () => {
    const row = await makeAnalysis();
    adapter.failRecord = true;
    const res = await recordHandler(req({ id: row.id }, session));
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /reverted/);
    const after = await db.analyzeResult.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(after.sealed, false);
    assert.equal(after.sealedBy, null);
  });
});
