// @argus/agents — Versioned agent prompt files, persona configs, and the agent runner (see AGENTS.md §5).

// Verify that shared types are importable from this package.
import type {
  AgentPersona,
  AgentVote,
  MarketDataSnapshot,
} from "@argus/shared-types";

// Re-export the types that consumers of the agent runner will need.
export type { AgentPersona, AgentVote, MarketDataSnapshot };

// TODO: Create versioned prompt files for each agent persona (agents/<name>/v1.md) per AGENTS.md §5.2.
// TODO: Replace mocked MarketDataSnapshot input with @argus/data-layer.fetchSnapshot() — BACKEND.md integration step.
// TODO: Build agent runner that calls LLM providers with per-agent framework prompts, enforcing
// JSON-schema-constrained structured output (AGENTS.md §5.2).
// TODO: Implement multi-provider support (not just failover) per AGENTS.md §5.2.
// NOTE: New agents should be a config change, not a code change (AGENTS.md §5.2).
// NOTE: Every new agent persona needs a prompt file, a JSON schema for its output,
// and a unit test with at least one fixture input/output pair (AGENTS.md §11).
