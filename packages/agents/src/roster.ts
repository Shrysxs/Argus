import type { AgentPersona } from "@argus/shared-types";

// Snapshot keys: price | sentiment | technicals | onchainMetrics (see @argus/data-layer).
// `dataDependencies` are required — if one is missing the agent abstains.
export const AGENT_ROSTER: AgentPersona[] = [
  {
    id: "value-hunter",
    name: "Value Hunter",
    frameworkPromptRef: "prompts/value-hunter/v3.md",
    dataDependencies: ["price"],
    optionalDataDependencies: ["technicals", "sentiment"],
    modelPreference: "openai/gpt-oss-20b",
  },
  {
    id: "momentum-trader",
    name: "Momentum Trader",
    frameworkPromptRef: "prompts/momentum-trader/v3.md",
    dataDependencies: ["price", "technicals"],
    modelPreference: "openai/gpt-oss-20b",
  },
  {
    id: "macro-analyst",
    name: "Macro Analyst",
    frameworkPromptRef: "prompts/macro-analyst/v3.md",
    dataDependencies: ["price", "sentiment"],
    optionalDataDependencies: ["technicals"],
    modelPreference: "openai/gpt-oss-20b",
  },
  {
    id: "onchain-sleuth",
    name: "On-chain Sleuth",
    frameworkPromptRef: "prompts/onchain-sleuth/v3.md",
    dataDependencies: ["price", "onchainMetrics"],
    modelPreference: "openai/gpt-oss-20b",
  },
  {
    id: "risk-guardian",
    name: "Risk Guardian",
    frameworkPromptRef: "prompts/risk-guardian/v3.md",
    dataDependencies: ["price", "technicals"],
    optionalDataDependencies: ["sentiment"],
    modelPreference: "openai/gpt-oss-20b",
  },
];
