---
name: llm-agent-engineering
description: >-
  Comprehensive playbook for designing, building, and hardening LLM agents,
  synthesizing Anthropic's published guidance (Building Effective Agents;
  Writing Effective Tools for Agents; Effective Context Engineering; Claude Code
  best practices; the tool-use and Agent SDK docs). Use this AGGRESSIVELY
  whenever the user is building or improving any AI agent or agentic system:
  deciding agent vs. workflow, designing the agent loop, writing or auditing
  tool / function-call schemas (OpenAI-style or MCP-style), parsing tool_calls,
  engineering context / memory / sub-agents, writing an agent system prompt,
  setting up agent evals, or adding guardrails. Trigger even when the user says
  things like "coding agent", "tool schema", "function calling", "my agent
  isn't calling tools reliably", "Ollama / Qwen / MiniMax / Nemotron tool use",
  or just "help me build an agent" — and even when they never say the word
  "agent" but are clearly wiring an LLM to tools in a loop.
---

# Agent Engineering

A field guide for building agents that actually work — and for fixing ones that
don't. It distills Anthropic's public guidance into runnable doctrine, then
points to deep references for each topic. It is a synthesis of published
material (see `references/sources.md`), not an official Anthropic artifact.

The throughline: **an agent is a model running in a loop with tools.** Almost
every reliability problem traces back to one of four surfaces — the *loop*, the
*tools*, the *context*, or the *prompt*. This skill is organized around those
surfaces plus the work that makes them trustworthy (evals and guardrails). It
applies whether you're wiring up a small task agent or building a full
coding-agent product (Claude Code / Codex / Grok–class); for the latter,
`references/coding-agent-tools.md` covers the specific tool surface to build.

## How to use this skill

Read this page for the doctrine. Then open the reference that matches the task.
Don't read all references up front — pull the one you need.

| If the task is… | Read |
| --- | --- |
| "Should this even be an agent? Which pattern?" | `references/agents-vs-workflows.md` |
| Building/debugging the control loop, the tool-call cycle, retries, stop conditions | `references/the-agent-loop.md` |
| Writing or auditing a tool / function schema; naming; descriptions; errors; return shape | `references/tool-design.md` |
| Making tools reliable on Ollama/Qwen local or MiniMax/Nemotron cloud; parsing messy `tool_calls`; flattening schemas | `references/small-and-open-models.md` |
| Managing the context window: compaction, memory, retrieval, sub-agents | `references/context-engineering.md` |
| Writing the agent's system prompt | `references/system-prompts.md` |
| Proving the agent works and iterating on it | `references/evaluation.md` |
| Permissions, sandboxing, human-in-the-loop, safe-by-default | `references/guardrails.md` |
| Building the tool surface for a **coding-agent product** (Claude Code / Codex / Grok–class): navigation, symbol editing, refactoring, diagnostics, memory | `references/coding-agent-tools.md` |
| The canonical source links behind all of the above | `references/sources.md` |

There is also a runnable linter: `scripts/validate_tool_schema.py` flags
agent-hostile and small-model-hostile schema patterns (deep nesting, `$ref`,
`oneOf`/`anyOf`, missing descriptions, closed value-spaces that should be
enums, over-broad `required`). Use it in audits and in CI.

---

## The doctrine

### 1. Decide: agent or workflow

"Agent" is not a prize for building something complex. **Workflows** orchestrate
LLMs along predefined code paths; **agents** let the model dynamically direct its
own process and tool use. Workflows are predictable, cheap, and easy to debug.
Agents trade latency, cost, and predictability for autonomy on open-ended
problems where you genuinely can't script the steps in advance.

Choose an agent only when (a) the path can't be predefined, (b) the steps
benefit from the model's judgment, and (c) the cost of a wrong autonomous step
is recoverable. Otherwise use a workflow — or a single well-equipped LLM call.
Depth, patterns (prompt chaining, routing, parallelization, orchestrator-
workers, evaluator-optimizer): `references/agents-vs-workflows.md`.

### 2. Start with the smallest thing that works

The base unit is one **augmented LLM** — a model with retrieval, tools, and
memory. Get that solid before adding orchestration. Add each new component
(another tool, a planner, a sub-agent) only when you can show it improves a real
outcome, and pay the complexity back in transparency. Frameworks are fine, but
understand the loop underneath them before you reach for one — abstraction you
can't debug is a liability.

### 3. The agent loop is the engine

The loop is mechanical and the same everywhere: send messages + tool schemas →
model returns text and/or tool calls → you execute the calls → you append the
results as tool messages → repeat until a stop condition. Reliability lives in
the unglamorous parts: a hard step cap, transient-error retries with backoff,
truncating tool output before it re-enters context, and treating tool failures
as *data the model can recover from* rather than exceptions that kill the run.
Mechanics, stop conditions, parallel calls: `references/the-agent-loop.md`.

### 4. Tools are the interface — engineer them like one

The agent only knows what your tool definitions tell it. The tool schema is a
contract between a deterministic system and a non-deterministic caller, and it
is usually the highest-leverage thing you can improve. Build a few high-impact
tools for real workflows instead of a thin wrapper over every API endpoint.
Name them consistently (action-oriented, namespaced: `repo_search`,
`repo_create_pr`). Describe every parameter as if briefing someone who will
infer nothing. Return high-signal, token-efficient results and let the agent
control verbosity. Make errors actionable — an error should tell the model how
to succeed next time. Full principles + worked example: `references/tool-design.md`.

### 5. Context is a budget, not a backpack

The context window is a finite resource with diminishing returns — pile in
low-signal tokens and quality degrades ("context rot"). Engineer the *smallest
set of high-signal tokens* that gets the job done: a system prompt at the right
altitude, a minimal non-overlapping tool set, and **just-in-time retrieval**
(let the agent fetch what it needs) instead of pre-loading everything. For long
or multi-step runs, reach for compaction (summarize and reinitialize), external
notes/memory, and sub-agents with isolated context that return only summaries.
Depth: `references/context-engineering.md`.

### 6. The system prompt sets altitude

Write the agent's system prompt at the "right altitude" — specific enough to be
unambiguous, general enough not to be brittle. State the role, the tools and
when to use them, the conventions to follow, when to plan vs. act, and the
guardrails. Prefer explaining *why* a rule exists over piling up rigid MUSTs;
capable models follow reasoning better than they follow edicts. Depth:
`references/system-prompts.md`.

### 7. Close the loop: give the agent a way to verify its work

The single biggest reliability multiplier for action-taking agents is a way to
*check themselves* — tests to run, a linter, a type-checker, a build, a
script that re-reads what was written. An agent that can see whether it
succeeded will self-correct; one that's flying blind will confidently drift.
Wire verification into the tool set and the loop.

### 8. Evaluate with agents, then iterate

You cannot improve what you cannot measure, and you cannot measure an agent with
vibes alone. Build a small set of realistic, verifiable tasks; run the agent;
**read the transcripts, not just the final answers**; and iterate on tools and
prompt where the agent actually stumbled. Tool definitions especially get
sharper fast when you let an agent critique its own failed runs. Depth:
`references/evaluation.md`.

### 9. Make it safe by default

Autonomy plus tools means an agent can do real damage. Default to least
privilege: read-only unless a mutation is needed, confine file and network
access, gate irreversible or costly actions (delete, send, deploy, spend) behind
explicit approval, and never let untrusted tool output be treated as
instructions. Build the guardrails into the harness, not the prompt. Depth:
`references/guardrails.md`.

### 10. Small and open models change the constants, not the shape

The doctrine above is model-agnostic, but the *tolerances* tighten sharply on
smaller / open-weight models (Qwen on Ollama; MiniMax, Nemotron on cloud). They
follow instructions less reliably, support a narrower slice of JSON Schema,
degrade with large tool counts and deep nesting, and frequently emit tool calls
as inline text the runtime won't parse. The schema shape is identical — what
changes is that you must flatten schemas, lean on enums and explicit
descriptions, keep the advertised tool count small, and add a robust fallback
parser that recovers tool calls from prose. Everything specific to this:
`references/small-and-open-models.md`.

---

## A default build order

When starting (or rescuing) an agent, work the surfaces in this order — it front-
loads the cheap, high-leverage wins:

1. **Pick the pattern** (`agents-vs-workflows.md`). Don't build an agent you
   didn't need.
2. **Define the tools well** (`tool-design.md`, then validate with
   `scripts/validate_tool_schema.py`). This is where most reliability is won or
   lost.
3. **Stand up the loop** (`the-agent-loop.md`) with step caps, retries, output
   truncation, and errors-as-data.
4. **Give it a verifier** (doctrine §7) so it can self-correct.
5. **Engineer the context** (`context-engineering.md`) once runs get long.
6. **Write the system prompt** (`system-prompts.md`) to match the tools and
   guardrails you actually have.
7. **Add guardrails** (`guardrails.md`) before you widen permissions.
8. **Build evals and iterate** (`evaluation.md`) — then loop back to step 2 with
   what the transcripts taught you.
9. If you're on small/open models, apply `small-and-open-models.md` throughout —
   it modifies steps 2, 3, and 6.

If the product *is* a coding agent (Claude Code / Codex / Grok–class), step 2
expands into a whole tool surface — read `coding-agent-tools.md` for the families
to build (semantic navigation, symbol editing, refactoring, diagnostics, memory,
onboarding) and the order to ship them.

The work is iterative, not linear: most gains come from cycling step 8 back into
steps 2 and 6.
