# Agents vs. Workflows

Source: *Building Effective Agents*. See `sources.md`.

The first decision is whether to build an agent at all. The distinction:

- **Workflow** — LLMs and tools orchestrated through *predefined code paths*.
  You decide the steps; the model fills in the hard parts. Predictable, cheap,
  debuggable.
- **Agent** — the model *dynamically directs its own process and tool use*,
  deciding the steps as it goes. Flexible on open-ended problems; costs latency,
  money, and predictability.

Default to the simplest option that solves the problem. Often that's a single
**augmented LLM** (model + retrieval + tools + memory) — no orchestration at
all. Add structure only when it earns its keep.

## When to use an agent

Use an agent when all three hold:
1. The path **can't be predefined** — you can't enumerate the steps in advance.
2. The steps **benefit from the model's judgment** at each turn.
3. A wrong autonomous step is **recoverable** (or gated — see `guardrails.md`).

If you can draw the flowchart, build the flowchart (a workflow). Agents shine on
open-ended tasks like multi-file code changes or investigations where the next
move depends on what the last one revealed.

## The workflow patterns (reach for these before "agent")

- **Prompt chaining** — decompose into a fixed sequence of steps, each feeding
  the next; optional checks ("gates") between them. Use when the task splits
  cleanly into ordered subtasks.
- **Routing** — classify the input, then send it to a specialized prompt/path.
  Use when inputs fall into distinct categories better handled separately.
- **Parallelization** — run subtasks at once (*sectioning*) or run the same task
  multiple times and aggregate (*voting*). Use for speed or for confidence
  through multiple attempts.
- **Orchestrator-workers** — a lead model decomposes a task and delegates to
  worker calls, then synthesizes. Use when subtasks aren't known until runtime.
- **Evaluator-optimizer** — one call produces, another critiques, loop until the
  critique passes. Use when you have a clear quality bar and iteration helps.

## Frameworks

Frameworks (agent SDKs, graph libraries) speed up the boilerplate, but they add
a layer between you and the loop. Understand the raw loop (`the-agent-loop.md`)
first; otherwise you inherit bugs you can't see. Use a framework when it
removes real toil, not to avoid understanding the mechanics.

## The rule that prevents most pain

**Keep it simple, and make the agent's decisions transparent.** Show its
planning and reasoning, log every tool call and result, and resist adding a
component until a real failure proves you need it. Complexity you can't observe
is complexity you can't debug.
