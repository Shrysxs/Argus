import type { AgentPersona } from "@argus/shared-types";

export const AGENT_ROSTER: AgentPersona[] = [
  {
    id: "value-hunter",
    name: "Value Hunter",
    frameworkPromptRef: "prompts/value-hunter/v2.md",
    dataDependencies: ["price", "sentiment"],
    modelPreference: "openai/gpt-oss-20b",
  },
  {
    id: "momentum-trader",
    name: "Momentum Trader",
    frameworkPromptRef: "prompts/momentum-trader/v2.md",
    dataDependencies: ["price"],
    modelPreference: "openai/gpt-oss-20b",
  },
  {
    id: "macro-analyst",
    name: "Macro Analyst",
    frameworkPromptRef: "prompts/macro-analyst/v2.md",
    dataDependencies: ["price", "sentiment"],
    modelPreference: "openai/gpt-oss-20b",
  },
  {
    id: "onchain-sleuth",
    name: "On-chain Sleuth",
    frameworkPromptRef: "prompts/onchain-sleuth/v2.md",
    dataDependencies: ["price", "onchain-metrics"],
    modelPreference: "openai/gpt-oss-20b",
  },
  {
    id: "risk-guardian",
    name: "Risk Guardian",
    frameworkPromptRef: "prompts/risk-guardian/v2.md",
    dataDependencies: ["price", "sentiment"],
    modelPreference: "openai/gpt-oss-20b",
  },
];
