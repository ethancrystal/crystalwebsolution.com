# The Agent Loop

Sources: *Tool use with Claude* (the mechanics) and *Building Effective Agents*.
See `sources.md`. For the open/small-model specifics of each step, layer in
`small-and-open-models.md`.

An agent is a model in a loop with tools. The loop is mechanical and identical
across providers; reliability comes from the controls you wrap around it.

## The cycle

1. Send the conversation **messages** plus the **tool schemas** to the model.
2. The model returns text and/or one or more **tool calls**.
3. If there are tool calls: **execute** each (dispatch by name to its impl).
4. Append each result back as a **tool message** the model can read.
5. Repeat from step 1 until a **stop condition**.

That's it. Everything else is hardening.

## Stop conditions

End the loop when any of these holds — and always have more than one:
- The model returns a final answer with **no tool calls**.
- A dedicated **completion/`finish` tool** is called (an explicit "I'm done"
  signal is more reliable than inferring done-ness from prose).
- A **step cap** is hit (e.g. 50 turns). Non-negotiable — it's your circuit
  breaker against loops and runaway spend.
- A budget cap (tokens / wall-clock / cost) is exceeded.

## The controls that make it reliable

- **Hard step cap.** Always. Without it, a confused agent loops forever.
- **Retries with backoff** on transient transport errors (connection resets,
  timeouts, 5xx). Exponential backoff with jitter; cap the attempts.
- **Truncate tool output** before it re-enters context (e.g. a ~12K-char cap).
  One chatty tool can blow the window and degrade everything after it.
- **Errors as data, not exceptions.** A failed tool returns a readable,
  actionable message the model can recover from; it does not crash the loop
  (`tool-design.md` §7).
- **Dispatch safety.** Validate the tool name against the registry; if the model
  calls an unknown tool or sends malformed arguments, return a corrective tool
  result rather than throwing.
- **Idempotency / dedup.** Never fire a non-idempotent tool (commit, send,
  delete, charge) twice for the same intent; dedup identical calls within a turn.

## Parallel tool calls

Models can request several tool calls in one turn. Run independent, read-only
calls concurrently for speed, but **serialize anything with side effects or
ordering dependencies**, and apply approval gates per call (`guardrails.md`).
Return each result keyed to its call so the model can match them up.

## Streaming and verification

Stream tokens for responsiveness if your transport supports it cleanly (note the
Ollama `/v1` streaming-with-tools caveat in `small-and-open-models.md`). And
remember the highest-leverage control of all (`SKILL.md` §7): give the agent a
**way to verify its work** inside the loop — a test runner, linter, or build —
so it can see its own mistakes and correct them instead of drifting.
