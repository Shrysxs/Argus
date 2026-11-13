import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computePromptVersionHash, computeReasoningHash, sha256 } from "./index";

const votes = [
  { agentId: "risk-guardian", promptVersion: "risk-guardian/v2", promptHash: "aa", vote: "HOLD", confidence: 60, reasoning: "r1", dataPointsCited: ["x"] },
  { agentId: "value-hunter", promptVersion: "value-hunter/v2", promptHash: "bb", vote: "BUY", confidence: 70, reasoning: "r2", dataPointsCited: ["y"] },
];

describe("audit hashes", () => {
  test("are independent of vote order", () => {
    const reversed = [...votes].reverse();
    assert.equal(computePromptVersionHash(votes), computePromptVersionHash(reversed));
    assert.equal(computeReasoningHash("s", votes), computeReasoningHash("s", reversed));
  });

  test("prompt hash changes when prompt text changes in place", () => {
    const edited = votes.map((v) => (v.agentId === "value-hunter" ? { ...v, promptHash: "cc" } : v));
    assert.notEqual(computePromptVersionHash(votes), computePromptVersionHash(edited));
  });

  test("reasoning hash binds the snapshot and every word of reasoning", () => {
    assert.notEqual(computeReasoningHash("s1", votes), computeReasoningHash("s2", votes));
    const edited = votes.map((v, i) => (i === 0 ? { ...v, reasoning: "r1 " } : v));
    assert.notEqual(computeReasoningHash("s1", votes), computeReasoningHash("s1", edited));
  });

  test("sha256 is canonical over key order", () => {
    assert.equal(sha256({ a: 1, b: { d: 2, c: 3 } }), sha256({ b: { c: 3, d: 2 }, a: 1 }));
  });
});
