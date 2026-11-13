import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { MarketDataSnapshot } from "@argus/shared-types";
import {
  AGENT_ROSTER,
  runAgentDetailed,
  runSyndicateDetailed,
  validateAgentOutput,
  resolveProviders,
  type ProviderConfig,
} from "./index";
import { PROMPTS } from "./prompts.generated";

const snapshot: MarketDataSnapshot = {
  snapshotId: "snap-1",
  asset: "BTC",
  timestamp: 1_700_000_000_000,
  hash: "ab".repeat(32),
  data: { price: { priceUsd: 88000 } },
  sources: ["coingecko"],
};

const goodJson = JSON.stringify({
  vote: "BUY",
  confidence: 72,
  reasoning: "Price at $88,000 holds above prior range.",
  dataPointsCited: ["Price: $88,000"],
});

function provider(name: ProviderConfig["name"]): ProviderConfig {
  return { name, endpoint: `https://${name}.test/v1`, headers: {}, modelFor: () => `${name}-model` };
}

function chatResponse(content: string, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
}

describe("validateAgentOutput", () => {
  test("accepts a valid object", () => {
    const r = validateAgentOutput(goodJson);
    assert.ok(r.ok);
  });

  test("unwraps a markdown fence but does no other repair", () => {
    assert.ok(validateAgentOutput("```json\n" + goodJson + "\n```").ok);
  });

  for (const [label, payload] of [
    ["invalid vote", { vote: "STRONG_BUY", confidence: 50, reasoning: "x", dataPointsCited: ["a"] }],
    ["string confidence", { vote: "BUY", confidence: "50", reasoning: "x", dataPointsCited: ["a"] }],
    ["out of range confidence", { vote: "BUY", confidence: 140, reasoning: "x", dataPointsCited: ["a"] }],
    ["empty reasoning", { vote: "BUY", confidence: 50, reasoning: "  ", dataPointsCited: ["a"] }],
    ["no citations", { vote: "BUY", confidence: 50, reasoning: "x", dataPointsCited: [] }],
  ] as const) {
    test(`rejects ${label} instead of substituting a default`, () => {
      const r = validateAgentOutput(JSON.stringify(payload));
      assert.equal(r.ok, false);
    });
  }

  test("rejects non-JSON", () => {
    assert.equal(validateAgentOutput("I think BUY").ok, false);
  });
});

describe("runAgentDetailed", () => {
  const persona = AGENT_ROSTER[0]!;

  test("returns ok with prompt hash and generation params", async () => {
    const fetchFn = (async () => chatResponse(goodJson)) as typeof fetch;
    const r = await runAgentDetailed(persona, snapshot, { providers: [provider("groq")], fetchFn });
    assert.equal(r.status, "ok");
    assert.equal(r.vote?.vote, "BUY");
    assert.equal(r.vote?.params?.provider, "groq");
    assert.match(r.vote!.promptHash!, /^[0-9a-f]{64}$/);
    assert.equal(r.attempts.length, 1);
  });

  test("retries once on schema mismatch, feeding the error back", async () => {
    const bodies: any[] = [];
    let n = 0;
    const fetchFn = (async (_u: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return chatResponse(n++ === 0 ? '{"vote":"MAYBE"}' : goodJson);
    }) as typeof fetch;
    const r = await runAgentDetailed(persona, snapshot, { providers: [provider("groq")], fetchFn });
    assert.equal(r.status, "ok");
    assert.equal(r.attempts.length, 2);
    assert.match(r.attempts[0]!.error!, /^schema:/);
    assert.match(bodies[1].messages.at(-1).content, /rejected/);
  });

  test("fails (does not invent a HOLD) after repeated invalid output", async () => {
    const fetchFn = (async () => chatResponse('{"vote":"MAYBE"}')) as typeof fetch;
    const r = await runAgentDetailed(persona, snapshot, { providers: [provider("groq")], fetchFn });
    assert.equal(r.status, "failed");
    assert.equal(r.vote, null);
    assert.equal(r.attempts.length, 2);
    assert.equal(r.attempts[0]!.rawResponse, '{"vote":"MAYBE"}');
  });

  test("fails over to the next provider on HTTP error", async () => {
    const fetchFn = (async (url: unknown) =>
      String(url).includes("groq") ? new Response("rate limited", { status: 429 }) : chatResponse(goodJson)) as typeof fetch;
    const r = await runAgentDetailed(persona, snapshot, {
      providers: [provider("groq"), provider("openrouter")],
      fetchFn,
    });
    assert.equal(r.status, "ok");
    assert.equal(r.vote?.params?.provider, "openrouter");
    assert.equal(r.attempts[0]!.httpStatus, 429);
  });

  test("reports failure when no provider is configured", async () => {
    const r = await runAgentDetailed(persona, snapshot, { providers: [] });
    assert.equal(r.status, "failed");
    assert.match(r.error!, /No LLM provider/);
  });
});

describe("runSyndicateDetailed", () => {
  test("returns one result per agent and streams each via onResult", async () => {
    const seen: string[] = [];
    const results = await runSyndicateDetailed(snapshot, {
      mockFn: async (p) =>
        p.id === "macro-analyst"
          ? null
          : { agentId: p.id, vote: "HOLD", confidence: 60, reasoning: "r", dataPointsCited: ["x"], promptVersion: "v", modelUsed: "m" },
      onResult: (r) => seen.push(r.agentId),
    });
    assert.equal(results.length, 5);
    assert.equal(seen.length, 5);
    assert.equal(results.find((r) => r.agentId === "macro-analyst")?.status, "failed");
  });
});

describe("providers & prompts", () => {
  test("provider chain follows env order and skips unset keys", () => {
    const chain = resolveProviders({ env: { OPENAI_API_KEY: "sk-1", GROQ_API_KEY: "gsk_1" } });
    assert.deepEqual(chain.map((p) => p.name), ["groq", "openai"]);
  });

  test("bundled prompts match the .md files on disk (run `npm run prompts` if this fails)", () => {
    const root = path.resolve(import.meta.dirname, "..");
    for (const [ref, text] of Object.entries(PROMPTS)) {
      assert.equal(fs.readFileSync(path.join(root, ref), "utf-8"), text, ref);
    }
    for (const persona of AGENT_ROSTER) {
      assert.ok(PROMPTS[persona.frameworkPromptRef], `${persona.frameworkPromptRef} not bundled`);
    }
  });
});
