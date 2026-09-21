import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { createSession } from "../lib/auth/session";
import { GET as getBalanceHandler } from "../app/api/billing/balance/route";
import { POST as topupHandler } from "../app/api/billing/topup/route";
import { POST as pricingHandler } from "../app/api/pricing/signal/route";
import type { ConsensusResult } from "@argus/shared-types";

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (err?.code === "P1001" || err?.message?.includes("Can't reach database")) {
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

describe("Credit Billing & Payment Enforcement Suite", () => {
  const testEmail = `billing_test_${Date.now()}@argus.io`;
  let testUserId = "";
  let sessionId = "";

  const mockConsensusUnanimous: ConsensusResult = {
    recommendation: "BUY",
    confidence: 100,
    breakdown: { BUY: 100, SELL: 0, HOLD: 0 },
    disagreement: false,
    agentVotes: [],
  };

  test("0. Setup test user with default $25 starting credit & session (isAdmin=false)", async () => {
    const user = await withRetry(() =>
      db.user.create({
        data: {
          email: testEmail,
          passwordHash: "somehashedpassword",
          isAdmin: false,
        },
      })
    );

    testUserId = user.id;
    assert.strictEqual(user.creditsUsd, 25.0);
    assert.strictEqual(user.isAdmin, false);

    sessionId = await createSession(user.id);
    assert.ok(sessionId);
  });

  test("1. GET /api/billing/balance: returns logged-in user's credit balance", async () => {
    const req = new Request("http://localhost:3000/api/billing/balance", {
      headers: { Cookie: `argus_session=${sessionId}` },
    });

    const res = await getBalanceHandler(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.userId, testUserId);
    assert.strictEqual(body.email, testEmail);
    assert.strictEqual(body.creditsUsd, 25.0);
  });

  test("2a. POST /api/billing/topup: authenticated NON-ADMIN gets HTTP 403 Forbidden", async () => {
    const req = new Request("http://localhost:3000/api/billing/topup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `argus_session=${sessionId}`,
      },
      body: JSON.stringify({ amountUsd: 15.0 }),
    });

    const res = await topupHandler(req);
    assert.strictEqual(res.status, 403);

    const body = await res.json();
    assert.match(body.error, /Forbidden/);

    // Balance remains untouched
    const dbUser = await withRetry(() => db.user.findUnique({ where: { id: testUserId } }));
    assert.strictEqual(dbUser?.creditsUsd, 25.0);
  });

  test("2b. POST /api/billing/topup: ADMIN user (isAdmin=true) succeeds and increments balance", async () => {
    // Elevate user to admin
    await withRetry(() =>
      db.user.update({
        where: { id: testUserId },
        data: { isAdmin: true },
      })
    );

    const req = new Request("http://localhost:3000/api/billing/topup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `argus_session=${sessionId}`,
      },
      body: JSON.stringify({ amountUsd: 15.0 }),
    });

    const res = await topupHandler(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.amountAddedUsd, 15.0);
    assert.strictEqual(body.newBalanceUsd, 40.0);

    // Verify DB reflection
    const dbUser = await withRetry(() => db.user.findUnique({ where: { id: testUserId } }));
    assert.strictEqual(dbUser?.creditsUsd, 40.0);
  });

  test("3. POST /api/pricing/signal: sufficient balance deducts exact priceUsd ($10.00)", async () => {
    const req = new Request("http://localhost:3000/api/pricing/signal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `argus_session=${sessionId}`,
      },
      body: JSON.stringify({
        asset: "BTC",
        consensus: mockConsensusUnanimous,
      }),
    });

    const res = await pricingHandler(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.priceUsd, 10.0);
    assert.strictEqual(body.remainingCreditsUsd, 30.0);
    assert.strictEqual(body.paymentStatus, "paid_from_credits");

    // Verify DB reflection
    const dbUser = await withRetry(() => db.user.findUnique({ where: { id: testUserId } }));
    assert.strictEqual(dbUser?.creditsUsd, 30.0);
  });

  test("4. POST /api/pricing/signal: insufficient balance returns HTTP 402 with zero deduction", async () => {
    // Set user credits to $5.00 (below $10.00 unanimous signal price)
    await withRetry(() =>
      db.user.update({
        where: { id: testUserId },
        data: { creditsUsd: 5.0 },
      })
    );

    const req = new Request("http://localhost:3000/api/pricing/signal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `argus_session=${sessionId}`,
      },
      body: JSON.stringify({
        asset: "BTC",
        consensus: mockConsensusUnanimous,
      }),
    });

    const res = await pricingHandler(req);
    assert.strictEqual(res.status, 402);

    const body = await res.json();
    assert.strictEqual(body.priceUsd, 10.0);
    assert.strictEqual(body.currentBalanceUsd, 5.0);
    assert.strictEqual(body.requiredTopupUsd, 5.0);

    // Verify DB balance remains untouched at $5.00
    const dbUser = await withRetry(() => db.user.findUnique({ where: { id: testUserId } }));
    assert.strictEqual(dbUser?.creditsUsd, 5.0);
  });

  test("5. Concurrency & Anti-Double-Spend: simultaneous pricing calls cannot spend balance below 0", async () => {
    // Reset balance to exactly $10.00 (enough for exactly ONE $10.00 signal call)
    await withRetry(() =>
      db.user.update({
        where: { id: testUserId },
        data: { creditsUsd: 10.0 },
      })
    );

    const req1 = new Request("http://localhost:3000/api/pricing/signal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `argus_session=${sessionId}`,
      },
      body: JSON.stringify({
        asset: "BTC",
        consensus: mockConsensusUnanimous,
      }),
    });

    const req2 = new Request("http://localhost:3000/api/pricing/signal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `argus_session=${sessionId}`,
      },
      body: JSON.stringify({
        asset: "BTC",
        consensus: mockConsensusUnanimous,
      }),
    });

    // Fire both requests simultaneously
    const [res1, res2] = await Promise.all([
      pricingHandler(req1),
      pricingHandler(req2),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepStrictEqual(statuses, [200, 402]);

    // Verify DB balance is exactly $0.00 and NEVER negative
    const dbUser = await withRetry(() => db.user.findUnique({ where: { id: testUserId } }));
    assert.strictEqual(dbUser?.creditsUsd, 0.0);
  });

  test("6. Cleanup test user & sessions", async () => {
    if (testUserId) {
      await withRetry(() => db.user.delete({ where: { id: testUserId } }));
    }
  });
});
