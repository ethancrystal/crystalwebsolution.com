# Sources

The canonical Anthropic material this skill synthesizes. All links verified
reachable (HTTP 200) at build time. The docs site now serves under
`platform.claude.com` and `code.claude.com`; where a `docs.claude.com` or
`anthropic.com` URL redirects, the resolved home is noted. Titles are the live
page titles.

When a topic here is load-bearing for a decision, go read the primary source —
this skill is a distilled operating layer on top of it, not a replacement.

## Primary essays (Anthropic Engineering)

- **Building Effective Agents** — the foundational essay.
  https://www.anthropic.com/engineering/building-effective-agents
  Covers: what agents are; when (and when not) to use them; frameworks; the
  building-block patterns (augmented LLM → prompt chaining, routing,
  parallelization, orchestrator-workers, evaluator-optimizer) → autonomous
  agents; "keep it simple"; *Appendix 2: Prompt engineering your tools*.
  → feeds `agents-vs-workflows.md`, `the-agent-loop.md`, `tool-design.md`.

- **Writing effective tools for AI agents** — the tool-design source.
  https://www.anthropic.com/engineering/writing-tools-for-agents
  Covers: what a tool is; how to write tools; *principles for writing effective
  tools* (build for real workflows not endpoint-wrapping; namespacing;
  high-signal token-efficient returns; unambiguous descriptions; actionable
  errors; evaluate-and-iterate with agents).
  → feeds `tool-design.md`, `evaluation.md`.

- **Effective context engineering for AI agents** — the context source.
  https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
  Covers: context engineering vs. prompt engineering; why context is a finite
  budget; the anatomy of effective context (system prompt altitude, minimal
  tools, examples); context retrieval and agentic search; long-horizon tactics
  (compaction, note-taking/memory, sub-agents).
  → feeds `context-engineering.md`, `system-prompts.md`.

## Practical / product docs

- **Best practices for Claude Code** — applied agentic-coding workflow.
  https://www.anthropic.com/engineering/claude-code-best-practices
  (resolves to https://code.claude.com/docs/en/best-practices)
  Covers: give the agent a way to verify its work; explore → plan → code;
  provide specific context (project memory); configure the environment; manage
  the session; automate and scale.
  → feeds `guardrails.md`, `system-prompts.md`, doctrine §7.

- **Tool use with Claude** — the technical tool-use reference.
  https://docs.claude.com/en/docs/build-with-claude/tool-use/overview
  (resolves to https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
  Covers: how tool use works; when the model uses tools; the request/return
  cycle; where tools execute.
  → feeds `the-agent-loop.md`, `tool-design.md`.

- **Prompt engineering overview** — prompt techniques.
  https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview
  (resolves to https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)
  → feeds `system-prompts.md`.

- **Claude Agent SDK overview** — productionizing an agent as a library.
  https://docs.claude.com/en/api/agent-sdk/overview
  (resolves to https://code.claude.com/docs/en/agent-sdk/overview)
  → useful when graduating a prototype to production.

## Adjacent (bundled) skill

- **mcp-builder** (Anthropic example skill) — tool/MCP-server design guidance:
  naming with prefixes, coverage-vs-workflow tradeoffs, input/output schemas
  with examples in field descriptions, the `readOnlyHint` / `destructiveHint` /
  `idempotentHint` / `openWorldHint` annotations, and eval-driven iteration.
  → feeds `tool-design.md`, `evaluation.md`.

## Coding-agent toolkits (for `coding-agent-tools.md`)

- **Serena** — open-source coding-agent toolkit (by Oraios) that gives an LLM
  language-server-backed (LSP) semantic tools: symbol navigation, symbol-level
  editing, safe refactors, file diagnostics, plus a project-memory and
  onboarding / `initial_instructions` system. The tool families in
  `coding-agent-tools.md` are mapped directly to its tool set. Search
  "Serena MCP coding agent" for the current repo, and verify tool names against
  the version you run — they evolve.
- **Language Server Protocol (LSP)** — the backbone that makes cross-language
  semantic navigation/editing/refactoring reliable.
  https://microsoft.github.io/language-server-protocol/
- The same families recur inside Claude Code, OpenAI Codex, and Cursor-class
  agents under different names.

## Model-specific references (for `small-and-open-models.md`)

These move fast; verify against current docs/model cards before relying on a
detail. Note the *vendor docs*, not third-party reposts.

- Ollama tool calling / API (`/api/chat` native and the OpenAI-compatible
  `/v1`): https://github.com/ollama/ollama/blob/main/docs/api.md and
  https://ollama.com/blog/tool-support
- OpenAI-compatible function-calling shape (the common cloud denominator):
  the `tools=[{type:"function", function:{name, description, parameters}}]`
  contract documented by OpenAI-compatible providers.
- Qwen tool-calling / chat-template notes: the Qwen model cards and Hugging
  Face Qwen-Agent docs.
- MiniMax and NVIDIA Nemotron: each vendor's API reference / NIM docs and model
  cards for their function-calling format and any reasoning-token quirks.
