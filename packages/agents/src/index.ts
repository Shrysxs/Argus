// @argus/agents — Versioned agent prompt files, persona configs, and the agent runner (see AGENTS.md §5).

import type {
  AgentPersona,
  AgentRunResult,
  AgentVote,
  MarketDataSnapshot,
  VoteDirection,
} from "@argus/shared-types";

export type { AgentPersona, AgentRunResult, AgentVote, MarketDataSnapshot, VoteDirection };
export { AGENT_ROSTER } from "./roster";
export {
  runAgentPersona,
  runAgentDetailed,
  runSyndicate,
  runSyndicateDetailed,
  getPromptText,
  promptVersionOf,
  hashPrompt,
  missingDependencies,
  scopeSnapshotData,
} from "./runner";
export type { RunAgentOptions, RunSyndicateOptions } from "./runner";
export { validateAgentOutput } from "./validate";
export type { ValidAgentOutput, ValidationResult } from "./validate";
export { resolveProviders } from "./providers";
export type { ProviderConfig, ProviderName } from "./providers";
