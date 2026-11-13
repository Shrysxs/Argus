import type { AgentPersona } from "@argus/shared-types";

export type ProviderName = "groq" | "openrouter" | "gemini" | "openai";

export interface ProviderConfig {
  name: ProviderName;
  endpoint: string;
  headers: Record<string, string>;
  modelFor: (persona: AgentPersona) => string;
}

type Env = Record<string, string | undefined>;

function build(name: ProviderName, apiKey: string, env: Env): ProviderConfig {
  const auth = { Authorization: `Bearer ${apiKey}` };
  switch (name) {
    case "groq":
      return {
        name,
        endpoint: "https://api.groq.com/openai/v1/chat/completions",
        headers: auth,
        modelFor: (p) => env.GROQ_MODEL || p.modelPreference,
      };
    case "openrouter":
      return {
        name,
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        headers: {
          ...auth,
          ...(env.NEXT_PUBLIC_APP_URL ? { "HTTP-Referer": env.NEXT_PUBLIC_APP_URL } : {}),
          "X-Title": "Argus",
        },
        modelFor: (p) => env.OPENROUTER_MODEL || p.modelPreference,
      };
    case "gemini":
      return {
        name,
        endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        headers: auth,
        // Persona preferences are Groq/OpenRouter model ids; Gemini needs its own.
        modelFor: () => env.GEMINI_MODEL || "gemini-2.5-flash",
      };
    case "openai":
      return {
        name,
        // OPENAI_BASE_URL allows any OpenAI-compatible server (Azure, vLLM, Ollama, …).
        endpoint: `${(env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`,
        headers: auth,
        modelFor: () => env.OPENAI_MODEL || "gpt-4.1-mini",
      };
  }
}

function inferProvider(apiKey: string, env: Env): ProviderName {
  if (apiKey.startsWith("gsk_") || apiKey === env.GROQ_API_KEY) return "groq";
  if (apiKey.startsWith("sk-or-") || apiKey === env.OPENROUTER_API_KEY) return "openrouter";
  if (apiKey.startsWith("AIza") || apiKey === env.GEMINI_API_KEY) return "gemini";
  return "openai";
}

/**
 * Ordered provider chain built from the environment. Every configured provider
 * is used as a failover, in this order: Groq → OpenRouter → Gemini → OpenAI.
 */
export function resolveProviders(opts: { apiKey?: string; env?: Env } = {}): ProviderConfig[] {
  const env = opts.env ?? process.env;
  if (opts.apiKey) return [build(inferProvider(opts.apiKey, env), opts.apiKey, env)];

  const chain: [ProviderName, string | undefined][] = [
    ["groq", env.GROQ_API_KEY],
    ["openrouter", env.OPENROUTER_API_KEY],
    ["gemini", env.GEMINI_API_KEY],
    ["openai", env.OPENAI_API_KEY],
  ];
  return chain.filter(([, key]) => Boolean(key)).map(([name, key]) => build(name, key!, env));
}
