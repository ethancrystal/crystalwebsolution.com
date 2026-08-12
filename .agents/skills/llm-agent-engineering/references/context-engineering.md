# Context Engineering

Source: *Effective context engineering for AI agents*. See `sources.md`.

Prompt engineering asks "what do I say?" Context engineering asks "what is the
optimal *set of tokens* in the window at this step?" For agents — which run many
turns and accumulate history, tool results, and retrieved data — this is the
discipline that decides whether they stay coherent over long runs.

## The core idea: context is a finite budget

A context window has diminishing returns. Past a point, adding more tokens
*lowers* quality — the model loses the signal in the noise ("context rot").
The goal is the **smallest set of high-signal tokens** that produces the right
next action, not the largest set of possibly-relevant ones.

## The anatomy of good context

- **System prompt at the right altitude** — specific enough to steer, general
  enough not to be brittle. Not a wall of hardcoded edge cases; not vague
  platitudes. (See `system-prompts.md`.)
- **A minimal, non-overlapping tool set** — every advertised tool costs
  attention; overlapping tools cause wrong picks. (See `tool-design.md`.)
- **A few sharp examples** over many mediocre ones.
- **Only the history that matters** — don't carry every raw tool dump forward.

## Just-in-time retrieval over pre-loading

Don't stuff everything the agent *might* need into the window up front. Give it
tools to **pull context on demand** (read a file, search the codebase, query the
API) and let it retrieve just-in-time as the task unfolds. Agentic search —
the model deciding what to look up next — keeps the window lean and lets the
agent follow the actual shape of the problem. Pre-loading guesses; retrieval
responds.

## Tactics for long-horizon runs

When a task outgrows a single window, use these (and combine them):

- **Compaction.** When the conversation approaches a fraction of the context
  limit (e.g. ~75%), summarize the older turns into a compact state and
  reinitialize, preserving the most recent turns verbatim. This is how agents
  run for hundreds of steps without falling off the front of their own history.
- **External notes / memory.** Let the agent write durable notes to a file or
  store (decisions made, what's been tried, the plan) and read them back. The
  window holds the working set; the notes hold the long-term state. A persistent
  project-memory file (CLAUDE.md-style) does the same job across sessions.
- **Sub-agents with isolated context.** Spin up a child agent for a bounded
  subtask in its *own* clean window; have it return only a summary, not its full
  transcript. The parent's context stays uncluttered while the subtask gets full
  room to work. (This is exactly the "private context + summaries only" pattern.)

## The test

If you can't say why each block of tokens is in the window at this step, it
probably shouldn't be. Engineer the context as deliberately as the code.
