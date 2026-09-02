import type { AgentPersona } from "@argus/shared-types";

export const AGENT_ROSTER: AgentPersona[] = [
  {
    id: "value-hunter",
    name: "Value Hunter",
    frameworkPromptRef: "prompts/value-hunter/v1.md",
    dataDependencies: ["price", "sentiment"],
    modelPreference: "llama-3.3-70b-versatile",
  },
  {
    id: "momentum-trader",
    name: "Momentum Trader",
    frameworkPromptRef: "prompts/momentum-trader/v1.md",
    dataDependencies: ["price"],
    modelPreference: "llama-3.3-70b-versatile",
  },
  {
    id: "macro-analyst",
    name: "Macro Analyst",
    frameworkPromptRef: "prompts/macro-analyst/v1.md",
    dataDependencies: ["price", "sentiment"],
    modelPreference: "llama-3.3-70b-versatile",
  },
  {
    id: "onchain-sleuth",
    name: "On-chain Sleuth",
    frameworkPromptRef: "prompts/onchain-sleuth/v1.md",
    dataDependencies: ["price", "onchain-metrics"],
    modelPreference: "llama-3.3-70b-versatile",
  },
  {
    id: "risk-guardian",
    name: "Risk Guardian",
    frameworkPromptRef: "prompts/risk-guardian/v1.md",
    dataDependencies: ["price", "sentiment"],
    modelPreference: "llama-3.3-70b-versatile",
  },
];
