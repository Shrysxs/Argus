import fs from "node:fs";
import path from "node:path";
import type {
  AgentPersona,
  AgentVote,
  MarketDataSnapshot,
  VoteDirection,
} from "@argus/shared-types";
import { AGENT_ROSTER } from "./roster";

function loadPromptContent(frameworkPromptRef: string): string | null {
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), frameworkPromptRef),
      path.resolve(process.cwd(), "packages/agents", frameworkPromptRef),
      path.resolve(process.cwd(), "..", frameworkPromptRef),
      path.resolve(process.cwd(), "../packages/agents", frameworkPromptRef),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, "utf-8");
      }
    }
  } catch {
    // Fallback if file read unavailable
  }
  return null;
}

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

  const model = options.model || persona.modelPreference || "openai/gpt-oss-20b";
  const fetchImpl = options.fetchFn || fetch;

  const promptFileContent = loadPromptContent(persona.frameworkPromptRef);
  const systemPrompt = promptFileContent
    ? `${promptFileContent}\n\nTask: Analyze MarketDataSnapshot for asset ${snapshot.asset}.\nRespond strictly with valid JSON conforming to the output schema.`
    : `You are ${persona.name} (${persona.id}), a specialized model in the Argus Investment Syndicate.
Analyze the provided MarketDataSnapshot for asset ${snapshot.asset}.
Respond strictly with valid JSON with keys: "vote", "confidence", "reasoning", "dataPointsCited".`;

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

    const promptVersion = persona.frameworkPromptRef
      .replace(/^prompts\//, "")
      .replace(/\.md$/, "");

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
    roster.map((persona: AgentPersona) => runAgentPersona(persona, snapshot, options)),
  );

  return results.filter((vote: AgentVote | null): vote is AgentVote => vote !== null);
}
