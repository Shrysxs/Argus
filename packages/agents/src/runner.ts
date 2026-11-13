import { createHash } from "node:crypto";
import type {
  AgentAttempt,
  AgentPersona,
  AgentRunResult,
  AgentVote,
  MarketDataSnapshot,
  VoteDirection,
} from "@argus/shared-types";
import { AGENT_ROSTER } from "./roster";
import { PROMPTS } from "./prompts.generated";
import { validateAgentOutput } from "./validate";
import { resolveProviders, type ProviderConfig } from "./providers";

const REQUEST_TIMEOUT_MS = 25_000;
/** Attempts per provider. The second attempt only happens on a schema mismatch. */
const MAX_ATTEMPTS_PER_PROVIDER = 2;

export function getPromptText(persona: AgentPersona): string {
  const text = PROMPTS[persona.frameworkPromptRef];
  if (!text) {
    // Fail loud: a missing prompt must never degrade to a generic one.
    throw new Error(
      `Prompt "${persona.frameworkPromptRef}" for agent ${persona.id} is not bundled. ` +
        `Run \`npm run prompts -w @argus/agents\`.`,
    );
  }
  return text;
}

export function promptVersionOf(persona: AgentPersona): string {
  return persona.frameworkPromptRef.replace(/^prompts\//, "").replace(/\.md$/, "");
}

export function hashPrompt(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function temperatureFor(persona: AgentPersona): number {
  return persona.id === "momentum-trader" || persona.id === "risk-guardian" ? 0.2 : 0.4;
}

export interface RunAgentOptions {
  /** Force a single API key; provider is inferred from its prefix. */
  apiKey?: string;
  /** Override the model for every provider. */
  model?: string;
  /** Explicit provider chain (takes precedence over env). */
  providers?: ProviderConfig[];
  fetchFn?: typeof fetch;
  /** Test seam. Returning null is treated as a failed agent. */
  mockFn?: (persona: AgentPersona, snapshot: MarketDataSnapshot) => Promise<AgentVote | null>;
  /** Snapshot data scoped to this agent's dependencies. Defaults to the full snapshot data. */
  scopedData?: (persona: AgentPersona, snapshot: MarketDataSnapshot) => Record<string, unknown>;
}

function buildMessages(persona: AgentPersona, snapshot: MarketDataSnapshot, data: Record<string, unknown>) {
  const system = `${getPromptText(persona)}

Task: Analyze the MarketDataSnapshot for asset ${snapshot.asset}.
Respond strictly with a single JSON object conforming to the output schema.
Only cite data points that appear in the snapshot. Do not invent indicators that are not provided.`;
  const user = `Asset: ${snapshot.asset}
Snapshot hash: ${snapshot.hash}
Market Data Snapshot:
${JSON.stringify(data, null, 2)}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

async function callProvider(
  provider: ProviderConfig,
  model: string,
  messages: { role: string; content: string }[],
  temperature: number,
  fetchImpl: typeof fetch,
): Promise<{ attempt: AgentAttempt; content: string | null }> {
  const started = Date.now();
  const base = { provider: provider.name, model };
  try {
    const res = await fetchImpl(provider.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...provider.headers },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return {
        attempt: { ...base, httpStatus: res.status, rawResponse: text.slice(0, 4000), error: `HTTP ${res.status}`, latencyMs: Date.now() - started },
        content: null,
      };
    }
    let content: string | null = null;
    try {
      content = JSON.parse(text)?.choices?.[0]?.message?.content ?? null;
    } catch {
      content = null;
    }
    return {
      attempt: {
        ...base,
        httpStatus: res.status,
        rawResponse: (content ?? text).slice(0, 8000),
        error: content ? null : "provider response had no message content",
        latencyMs: Date.now() - started,
      },
      content,
    };
  } catch (err) {
    return {
      attempt: { ...base, httpStatus: null, rawResponse: null, error: err instanceof Error ? err.message : String(err), latencyMs: Date.now() - started },
      content: null,
    };
  }
}

/**
 * Run one agent. Never throws for provider/LLM problems: the outcome is always
 * returned as an AgentRunResult so the caller can show "N/5 responded".
 */
export async function runAgentDetailed(
  persona: AgentPersona,
  snapshot: MarketDataSnapshot,
  options: RunAgentOptions = {},
): Promise<AgentRunResult> {
  const promptVersion = promptVersionOf(persona);

  if (options.mockFn) {
    const vote = await options.mockFn(persona, snapshot);
    return vote
      ? { agentId: persona.id, status: "ok", vote, attempts: [] }
      : { agentId: persona.id, status: "failed", vote: null, error: "Agent returned no vote", attempts: [] };
  }

  const providers = options.providers ?? resolveProviders({ apiKey: options.apiKey });
  if (providers.length === 0) {
    return {
      agentId: persona.id,
      status: "failed",
      vote: null,
      error: "No LLM provider configured (set GROQ_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY or OPENAI_API_KEY)",
      attempts: [],
    };
  }

  const promptText = getPromptText(persona);
  const promptHash = hashPrompt(promptText);
  const temperature = temperatureFor(persona);
  const data = options.scopedData ? options.scopedData(persona, snapshot) : snapshot.data;
  const baseMessages = buildMessages(persona, snapshot, data);
  const fetchImpl = options.fetchFn ?? fetch;
  const attempts: AgentAttempt[] = [];
  let lastError = "unknown error";

  for (const provider of providers) {
    const model = options.model ?? provider.modelFor(persona);
    let messages = baseMessages;

    for (let i = 0; i < MAX_ATTEMPTS_PER_PROVIDER; i++) {
      const { attempt, content } = await callProvider(provider, model, messages, temperature, fetchImpl);
      attempts.push(attempt);

      if (content === null) {
        // Transport/HTTP failure: move on to the next provider.
        lastError = `${provider.name}: ${attempt.error}`;
        break;
      }

      const result = validateAgentOutput(content);
      if (result.ok) {
        const vote: AgentVote = {
          agentId: persona.id,
          vote: result.value.vote as VoteDirection,
          confidence: result.value.confidence,
          reasoning: result.value.reasoning,
          dataPointsCited: result.value.dataPointsCited,
          promptVersion,
          promptHash,
          modelUsed: model,
          params: { provider: provider.name, temperature },
        };
        return { agentId: persona.id, status: "ok", vote, attempts };
      }

      // Schema mismatch: log it on the attempt and retry once with the error fed back.
      attempt.error = `schema: ${result.error}`;
      lastError = `${provider.name}: invalid output (${result.error})`;
      messages = [
        ...baseMessages,
        { role: "assistant", content },
        {
          role: "user",
          content: `Your previous response was rejected: ${result.error}. Respond again with ONLY a valid JSON object matching the schema.`,
        },
      ];
    }
  }

  return { agentId: persona.id, status: "failed", vote: null, error: lastError, attempts };
}

/** Backwards-compatible single-agent call: returns the vote or null. */
export async function runAgentPersona(
  persona: AgentPersona,
  snapshot: MarketDataSnapshot,
  options: RunAgentOptions = {},
): Promise<AgentVote | null> {
  const result = await runAgentDetailed(persona, snapshot, options);
  return result.vote;
}

export interface RunSyndicateOptions extends RunAgentOptions {
  roster?: AgentPersona[];
  /** Called as each agent finishes — used for streaming results to the UI. */
  onResult?: (result: AgentRunResult) => void;
}

/** Run every agent in parallel and return one result per agent (including failures). */
export async function runSyndicateDetailed(
  snapshot: MarketDataSnapshot,
  options: RunSyndicateOptions = {},
): Promise<AgentRunResult[]> {
  const roster = options.roster ?? AGENT_ROSTER;
  return Promise.all(
    roster.map(async (persona) => {
      let result: AgentRunResult;
      try {
        result = await runAgentDetailed(persona, snapshot, options);
      } catch (err) {
        result = {
          agentId: persona.id,
          status: "failed",
          vote: null,
          error: err instanceof Error ? err.message : String(err),
          attempts: [],
        };
      }
      options.onResult?.(result);
      return result;
    }),
  );
}

/** Successful votes only. Prefer runSyndicateDetailed when you need failure visibility. */
export async function runSyndicate(
  snapshot: MarketDataSnapshot,
  options: RunSyndicateOptions = {},
): Promise<AgentVote[]> {
  const results = await runSyndicateDetailed(snapshot, options);
  return results.flatMap((r) => (r.vote ? [r.vote] : []));
}
