import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { AgentRunResult } from "@argus/shared-types";
import { db } from "../lib/db";
import { createSession } from "../lib/auth/session";
import { chargeCredits, grantCredits, InsufficientCreditsError, listTransactions } from "../lib/billing";
import { runPaidAnalysis } from "../lib/analysis/paid";
import { GET as balanceHandler } from "../app/api/billing/balance/route";
import { POST as topupHandler } from "../app/api/billing/topup/route";
import { POST as signupHandler } from "../app/api/auth/signup/route";

const withCookie = (url: string, session: string, init: RequestInit = {}) =>
  new Request(url, { ...init, headers: { ...(init.headers ?? {}), cookie: `argus_session=${session}`, "content-type": "application/json" } });

async function balance(id: string) {
  return (await db.user.findUniqueOrThrow({ where: { id } })).creditsCents;
}

const okResults = (n: number): AgentRunResult[] =>
  ["value-hunter", "momentum-trader", "macro-analyst", "onchain-sleuth", "risk-guardian"].map((agentId, i) =>
    i < n
      ? { agentId, status: "ok", vote: { agentId, vote: "BUY", confidence: 70, reasoning: "r", dataPointsCited: ["x"], promptVersion: "v", modelUsed: "m" }, attempts: [] }
      : { agentId, status: "failed", vote: null, error: "e", attempts: [] },
  );

const snap = () => ({ snapshotId: crypto.randomUUID(), asset: "BTC", timestamp: Date.now(), hash: "ef".repeat(32), data: { price: { priceUsd: 1 } }, sources: [] });

describe("credits & ledger", () => {
  let userId: string;
  let adminId: string;
  let session: string;
  let adminSession: string;

  before(async () => {
    await db.user.deleteMany({ where: { email: { in: ["billing_user@argus.test", "billing_admin@argus.test", "billing_signup@argus.test"] } } });
    userId = (await db.user.create({ data: { email: "billing_user@argus.test", passwordHash: "x" } })).id;
    adminId = (await db.user.create({ data: { email: "billing_admin@argus.test", passwordHash: "x", isAdmin: true } })).id;
    session = await createSession(userId);
    adminSession = await createSession(adminId);
  });

  beforeEach(async () => {
    await db.user.update({ where: { id: userId }, data: { creditsCents: 2500 } });
  });

  test("signup grants $25 and writes a matching ledger entry", async () => {
    const res = await signupHandler(
      new Request("http://x/api/auth/signup", { method: "POST", headers: { "x-forwarded-for": "10.9.9.9" }, body: JSON.stringify({ email: "billing_signup@argus.test", password: "Password123" }) }),
    );
    assert.equal(res.status, 201);
    const u = await db.user.findUniqueOrThrow({ where: { email: "billing_signup@argus.test" } });
    assert.equal(u.creditsCents, 2500);
    const [t] = await listTransactions(u.id);
    assert.equal(t!.kind, "signup_grant");
    assert.equal(t!.balanceAfterCents, 2500);
  });

  test("charge debits exactly and records balance after", async () => {
    const r = await chargeCredits(userId, 137, "analysis", "ref-1");
    assert.equal(r.balanceCents, 2363);
    assert.equal(await balance(userId), 2363);
    const [t] = await listTransactions(userId, 1);
    assert.equal(t!.amountCents, -137);
    assert.equal(t!.balanceAfterCents, 2363);
  });

  test("insufficient balance throws and changes nothing", async () => {
    await assert.rejects(() => chargeCredits(userId, 2501, "analysis"), InsufficientCreditsError);
    assert.equal(await balance(userId), 2500);
  });

  test("concurrent charges can never overdraw", async () => {
    await db.user.update({ where: { id: userId }, data: { creditsCents: 300 } });
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => chargeCredits(userId, 100, "analysis")));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
    assert.equal(await balance(userId), 0);
  });

  test("paid analysis charges once, and refunds when no analyst responds", async () => {
    const ok = await runPaidAnalysis({ userId, asset: "BTC", costCents: 100, deps: { fetchSnapshot: async () => snap(), runSyndicateDetailed: async () => okResults(4) } });
    assert.equal(ok.chargedCents, 100);
    assert.equal(await balance(userId), 2400);
    const [charge] = await listTransactions(userId, 1);
    assert.equal(charge!.reference, ok.id);

    const none = await runPaidAnalysis({ userId, asset: "BTC", costCents: 100, deps: { fetchSnapshot: async () => snap(), runSyndicateDetailed: async () => okResults(0) } });
    assert.equal(none.chargedCents, 0);
    assert.equal(await balance(userId), 2400);
  });

  test("paid analysis refunds when the run throws", async () => {
    await assert.rejects(() =>
      runPaidAnalysis({ userId, asset: "BTC", costCents: 100, deps: { fetchSnapshot: async () => { throw new Error("down"); } } }),
    );
    assert.equal(await balance(userId), 2500);
    const [refund] = await listTransactions(userId, 1);
    assert.equal(refund!.kind, "refund");
  });

  test("balance endpoint reports USD and recent ledger entries", async () => {
    const res = await balanceHandler(withCookie("http://x/api/billing/balance", session));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.creditsUsd, 25);
    assert.ok(Array.isArray(body.transactions));
  });

  test("top-up is admin-only, validated, and ledgered", async () => {
    const forbidden = await topupHandler(withCookie("http://x/api/billing/topup", session, { method: "POST", body: JSON.stringify({ amountUsd: 10 }) }));
    assert.equal(forbidden.status, 403);

    const bad = await topupHandler(withCookie("http://x", adminSession, { method: "POST", body: JSON.stringify({ amountUsd: -5, targetUserId: userId }) }));
    assert.equal(bad.status, 400);

    const missing = await topupHandler(withCookie("http://x", adminSession, { method: "POST", body: JSON.stringify({ amountUsd: 5, targetUserId: "nope" }) }));
    assert.equal(missing.status, 404);

    const ok = await topupHandler(withCookie("http://x", adminSession, { method: "POST", body: JSON.stringify({ amountUsd: 15, targetUserId: userId }) }));
    assert.equal(ok.status, 200);
    assert.equal(await balance(userId), 4000);
    const [t] = await listTransactions(userId, 1);
    assert.equal(t!.kind, "admin_grant");
    assert.equal(t!.reference, adminId);
  });

  test("grant rejects non-positive amounts", async () => {
    await assert.rejects(() => grantCredits(userId, 0, "admin_grant"));
  });
});
