import type {
  AgentPersona,
  AgentVote,
  MarketDataSnapshot,
  VoteDirection,
} from "@argus/shared-types";
import { AGENT_ROSTER } from "./roster";


export interface RunAgentOptions {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
  mockFn?: (
    persona: AgentPersona,
    snapshot: MarketDataSnapshot,
  ) => Promise<AgentVote | null>;
}

export async function runAgentPersona(
  persona: AgentPersona,
  snapshot: MarketDataSnapshot,
  options: RunAgentOptions = {},
): Promise<AgentVote | null> {
  if (options.mockFn) {
    return options.mockFn(persona, snapshot);
  }

  const apiKey =
    options.apiKey ||
    process.env.GROQ_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      `No LLM API key configured for agent execution (GROQ_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY required).`,
    );
  }

  const model = options.model || persona.modelPreference || "llama-3.3-70b-versatile";
  const fetchImpl = options.fetchFn || fetch;

  const systemPrompt = `You are ${persona.name} (${persona.id}), an AI agent in the Argus Investment Syndicate.
Analyze the provided MarketDataSnapshot for asset ${snapshot.asset}.
Respond strictly with valid JSON with the following structure:
{
  "vote": "BUY" | "SELL" | "HOLD",
  "confidence": number (0 to 100),
  "reasoning": "2-3 concise sentences justifying your decision",
  "dataPointsCited": ["human-readable metric citation 1", "metric citation 2"]
}`;

  const userPrompt = `Asset: ${snapshot.asset}
Market Data Snapshot:
${JSON.stringify(snapshot.data, null, 2)}
Sources available: ${snapshot.sources.join(", ")}`;

  try {
    const isGroq = apiKey.startsWith("gsk_");
    const endpoint = isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: persona.id === "momentum-trader" || persona.id === "risk-guardian" ? 0.2 : 0.4,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`LLM Provider call failed for ${persona.id} (${response.status}): ${errText}`);
      return null;
    }

    const json = await response.json();
    const rawContent = json?.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    const parsed = JSON.parse(rawContent);

    const vote: VoteDirection =
      parsed.vote === "BUY" || parsed.vote === "SELL" || parsed.vote === "HOLD"
        ? parsed.vote
        : "HOLD";

    const confidence =
      typeof parsed.confidence === "number" && !isNaN(parsed.confidence)
        ? Math.min(100, Math.max(0, Math.round(parsed.confidence)))
        : 50;

    const reasoning =
      typeof parsed.reasoning === "string" && parsed.reasoning.trim().length > 0
        ? parsed.reasoning.trim()
        : `${persona.name} analyzed market conditions for ${snapshot.asset}.`;

    const dataPointsCited: string[] = Array.isArray(parsed.dataPointsCited)
      ? parsed.dataPointsCited.map((item: unknown) => String(item))
      : [`Asset: ${snapshot.asset}`];

    const promptVersion = `${persona.id}/v1`;

    return {
      agentId: persona.id,
      vote,
      confidence,
      reasoning,
      dataPointsCited,
      promptVersion,
      modelUsed: model,
    };
  } catch (err) {
    console.error(`Agent ${persona.id} execution failed:`, err);
    return null;
  }
}

export interface RunSyndicateOptions extends RunAgentOptions {
  roster?: AgentPersona[];
}

export async function runSyndicate(
  snapshot: MarketDataSnapshot,
  options: RunSyndicateOptions = {},
): Promise<AgentVote[]> {
  const roster = options.roster || AGENT_ROSTER;

  const results = await Promise.all(
    roster.map((persona) => runAgentPersona(persona, snapshot, options)),
  );

  return results.filter((vote): vote is AgentVote => vote !== null);
}
