import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { createSession } from "../lib/auth/session";
import { GET as getBalanceHandler } from "../app/api/billing/balance/route";
import { POST as topupHandler } from "../app/api/billing/topup/route";
import { POST as pricingHandler } from "../app/api/pricing/signal/route";
import type { ConsensusResult } from "@argus/shared-types";

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

  test("0. Setup test user with default $25 starting credit & session", async () => {
    const user = await db.user.create({
      data: {
        email: testEmail,
        passwordHash: "somehashedpassword",
      },
    });

    testUserId = user.id;
    assert.strictEqual(user.creditsUsd, 25.0);

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

  test("2. POST /api/billing/topup: increments user credit balance", async () => {
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
    const dbUser = await db.user.findUnique({ where: { id: testUserId } });
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
    const dbUser = await db.user.findUnique({ where: { id: testUserId } });
    assert.strictEqual(dbUser?.creditsUsd, 30.0);
  });

  test("4. POST /api/pricing/signal: insufficient balance returns HTTP 402 with zero deduction", async () => {
    // Set user credits to $5.00 (below $10.00 unanimous signal price)
    await db.user.update({
      where: { id: testUserId },
      data: { creditsUsd: 5.0 },
    });

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
    const dbUser = await db.user.findUnique({ where: { id: testUserId } });
    assert.strictEqual(dbUser?.creditsUsd, 5.0);
  });

  test("5. Cleanup test user & sessions", async () => {
    await db.user.delete({ where: { id: testUserId } });
  });
});
