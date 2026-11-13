import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "../lib/auth/rate-limit";
import { safeNextPath } from "../lib/safe-redirect";
import { GET as healthHandler } from "../app/api/health/route";
import { proxy } from "../proxy";
import { NextRequest } from "next/server";

describe("rate limiter (Upstash REST backend)", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  test("uses INCR + PEXPIRE NX and reads GET + PTTL", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    const store = new Map<string, number>();
    const calls: unknown[] = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      assert.equal(url, "https://redis.test/pipeline");
      assert.equal((init.headers as Record<string, string>).Authorization, "Bearer tok");
      const cmds = JSON.parse(String(init.body)) as (string | number)[][];
      calls.push(cmds);
      return new Response(
        JSON.stringify(
          cmds.map(([op, key]) => {
            const k = String(key);
            if (op === "INCR") return { result: store.set(k, (store.get(k) ?? 0) + 1).get(k) };
            if (op === "GET") return { result: store.has(k) ? String(store.get(k)) : null };
            if (op === "PTTL") return { result: 60_000 };
            if (op === "DEL") return { result: store.delete(k) ? 1 : 0 };
            return { result: 1 };
          }),
        ),
      );
    }) as typeof fetch;

    assert.equal((await checkRateLimit("k", 2)).allowed, true);
    await recordFailedAttempt("k");
    await recordFailedAttempt("k");
    const blocked = await checkRateLimit("k", 2);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 60);
    assert.deepEqual((calls[1] as unknown[][])[1], ["PEXPIRE", "argus:rl:k", 900000, "NX"]);
    await resetRateLimit("k");
    assert.equal((await checkRateLimit("k", 2)).allowed, true);
  });

  test("fails open to the in-memory limiter when Upstash is unreachable", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    globalThis.fetch = (async () => new Response("", { status: 500 })) as typeof fetch;
    assert.equal((await checkRateLimit("k2", 1)).allowed, true);
  });
});

describe("hardening", () => {
  test("safeNextPath blocks open redirects", () => {
    assert.equal(safeNextPath("/history?filter=sealed"), "/history?filter=sealed");
    assert.equal(safeNextPath("https://evil.example"), "/syndicate");
    assert.equal(safeNextPath("//evil.example"), "/syndicate");
    assert.equal(safeNextPath("/\\evil.example"), "/syndicate");
    assert.equal(safeNextPath(null), "/syndicate");
  });

  test("health endpoint reports status without leaking configuration", async () => {
    const res = await healthHandler();
    const body = await res.json();
    assert.deepEqual(Object.keys(body).sort(), ["checks", "latencyMs", "status"]);
    assert.equal(JSON.stringify(body).includes("DATABASE_URL"), false);
  });

  test("proxy redirects anonymous users with a return path and passes cookies through", () => {
    const anon = proxy(new NextRequest("http://x/history?filter=sealed"));
    assert.equal(anon.status, 307);
    assert.equal(anon.headers.get("location"), "http://x/login?next=%2Fhistory%3Ffilter%3Dsealed");
    const authed = proxy(new NextRequest("http://x/history", { headers: { cookie: "argus_session=abc" } }));
    assert.equal(authed.headers.get("location"), null);
  });
});
