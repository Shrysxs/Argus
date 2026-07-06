// @argus/agents — Versioned agent prompt files, persona configs, and the agent runner (see AGENTS.md §5).

// TODO: Create versioned prompt files for each agent persona (agents/<name>/v1.md) per AGENTS.md §5.2.
// TODO: Define agent config schema: { id, name, framework prompt, data dependencies, model preference } per AGENTS.md §5.2.
// TODO: Build agent runner that calls LLM providers with per-agent framework prompts, enforcing
// JSON-schema-constrained structured output (AGENTS.md §5.2).
// TODO: Implement multi-provider support (not just failover) per AGENTS.md §5.2.
// NOTE: New agents should be a config change, not a code change (AGENTS.md §5.2).
// NOTE: Every new agent persona needs a prompt file, a JSON schema for its output,
// and a unit test with at least one fixture input/output pair (AGENTS.md §11).
export {};
