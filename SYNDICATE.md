# SYNDICATE.md — AI Agent Roster & Orchestration

**Owns:** `packages/agents`
**Talks to:** `MATH.md` (must emit `AgentVote` in the exact shape the consensus engine expects), `DATA.md` (consumes `MarketDataSnapshot`, never fetches data itself), `BACKEND.md` (the orchestrator calls this package, this package never calls out to the API layer itself).

---

## 1. Roster (v1)

| Agent ID | Framework | Bias constraint |
|---|---|---|
| `value-hunter` | Graham margin-of-safety, Damodaran DCF, Buffett moat/owner-earnings | Reject speculative hype |
| `momentum-trader` | RSI/MACD/EMA/VWAP, volume-confirmed breakouts | Prioritize immediate trend |
| `macro-analyst` | Global M2, Fed policy, DXY, Nasdaq beta, halving cycle | Think globally/cyclically |
| `onchain-sleuth` | MVRV, SOPR, exchange netflows, whale accumulation, LTH/STH | Think blockchain-first |
| `risk-guardian` | Howard Marks cycles, Taleb tail-risk, Sharpe/Sortino, Kelly sizing | Stay cautious, challenge assumptions |

Roster is config, not code. Each agent is defined as:

```ts
interface AgentPersona {
  id: string;
  name: string;
  promptPath: string;      // packages/agents/prompts/{id}/v{n}.md
  promptVersion: number;
  dataDependencies: MarketDataField[];
  modelPreference: ModelId;
}
```

Adding an agent = adding a config entry + a prompt file. No orchestrator code changes required.

---

## 2. Prompt Versioning

- Prompts live at `packages/agents/prompts/{agent-id}/v{n}.md` — plain files, not inline strings anywhere in code.
- Never edit a prompt file in place. Bump the version, keep the old one. A decision record logs which prompt version produced it — this is what makes the reputation index in `MATH.md` §2 honest (an agent's track record shouldn't silently span multiple, different prompts).
- Log every change in `docs/agent-prompt-changelog.md` — one line, what changed and why.

---

## 3. Output Contract

Every agent call must return, via schema-constrained generation (not best-effort parsing):

```ts
interface AgentVote {
  agentId: string;
  vote: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;       // 1–100
  reasoning: string;
  dataPointsCited: string[]; // which MarketDataSnapshot fields it actually used
}
```

Reject and retry on schema mismatch. Never fall back to regex-parsing free text — if structured output isn't available from a provider for a given call, that call fails loud and the orchestrator marks that agent as non-responsive for the round (see `BACKEND.md` for how partial-response rounds are surfaced).

---

## 4. Multi-Provider Strategy

- Providers are interchangeable for most agents (failover: primary → secondary → tertiary), but consider pinning specific agents to specific models if you find one model is measurably sharper at a given framework's kind of reasoning (e.g. quantitative agents vs. narrative agents) — track this empirically via the reputation index, don't guess.
- Low temperature for quantitative agents (`momentum-trader`, `risk-guardian`); log the temperature/seed used per call for reproducibility debugging.
- Every raw response — including malformed ones that failed schema validation — gets logged for audit and drift detection.

---

## 5. Guardrails

- Rate-limit syndicate runs per user (5 parallel LLM calls per run is real cost — see `BACKEND.md` for enforcement).
- If any user-supplied text reaches a prompt (custom notes, asset requests), sanitize it — agents must not be steerable by adversarial input dressed up as market data.
- A round where fewer than N agents respond successfully should be flagged as degraded, not silently presented as a full 5-agent consensus.
