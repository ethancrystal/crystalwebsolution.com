# Evaluation

Sources: *Writing effective tools for AI agents* (evaluate-and-iterate with
agents) and the `mcp-builder` evaluation guide. See `sources.md`.

You cannot improve an agent you cannot measure, and you cannot measure one with
vibes. Evals are the flywheel: they turn "it felt better" into "task pass rate
went from 6/10 to 9/10," and they tell you *where* to spend the next fix.

## Build a small set of realistic tasks

Quality beats quantity — ten good tasks beat a hundred shallow ones. Each task
should be:

- **Realistic** — something a real user would actually ask, with the messy
  context real requests carry (a file path, a project name, an actual goal).
- **Complex enough to matter** — it should require several tool calls and real
  decisions, not a single lookup. Trivial tasks don't exercise the agent.
- **Independent** — not dependent on the outcome of another task.
- **Verifiable** — a clear way to judge success. Prefer objective checks (a
  string match, a file exists, tests pass) where the output allows; reserve
  human judgment for genuinely subjective qualities.
- **Stable** — the right answer won't drift over time.

Write the task, then **solve it yourself first** so you know the correct outcome
before you grade the agent against it.

## Run, then read the transcripts

Running the eval gives you a pass rate. **Reading the transcripts** gives you the
fixes. Most of the signal is in *how* the agent failed:

- It picked the wrong tool → the names/descriptions are confusable
  (`tool-design.md`).
- It hallucinated an argument → the schema is missing an enum or a description.
- It got a useless tool result → fix the return shape.
- It looped or stalled → check stop conditions and inline-call parsing
  (`the-agent-loop.md`, `small-and-open-models.md`).
- It drifted off task → the system prompt's altitude is off
  (`system-prompts.md`).

## Let the agent critique its own failures

A fast accelerant: feed an agent its own failed transcript and ask what tool
definition or instruction would have prevented the failure. Models are good at
spotting the ambiguity that tripped them. Fold the suggestions into the tools
and prompt, then re-run.

## Close the loop

1. Run the eval set; record pass rate and timing.
2. Read transcripts; attribute each failure to a surface (tool, loop, context,
   prompt).
3. Fix that surface.
4. Re-run the same set; confirm the fix helped and didn't regress others.
5. When the set is mostly green, expand it with the new edge cases you found.

Quantitative score keeps you honest; transcript reading tells you what to do.
You need both.
