// @argus/agents — Versioned agent prompt files, persona configs, and the agent runner (see AGENTS.md §5).

import type {
  AgentPersona,
  AgentVote,
  MarketDataSnapshot,
  VoteDirection,
} from "@argus/shared-types";

export type { AgentPersona, AgentVote, MarketDataSnapshot, VoteDirection };
export { AGENT_ROSTER } from "./roster";
export { runAgentPersona, runSyndicate } from "./runner";
export type { RunAgentOptions, RunSyndicateOptions } from "./runner";
