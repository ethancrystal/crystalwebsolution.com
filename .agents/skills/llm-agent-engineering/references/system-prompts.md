# System Prompts for Agents

Sources: *Prompt engineering overview*; *Building Effective Agents* (Appendix 2:
prompt-engineering your tools); *Effective context engineering* (altitude).
See `sources.md`.

An agent's system prompt is its operating manual: who it is, what it can do,
when to act, and what lines not to cross. It works with the tool definitions and
the guardrails — write all three to match.

## Altitude: the central skill

Write at the **right altitude** — the Goldilocks zone between two failure modes:
- **Too low** (brittle): a thicket of hardcoded if-this-then-that rules. It
  breaks on the first situation you didn't foresee and is miserable to maintain.
- **Too high** (vague): "be a helpful coding assistant." Gives the model nothing
  to act on, so behavior drifts.

Aim for clear principles and concrete guidance that generalize — heuristics, not
a decision tree.

## What to include

- **Role and objective** — what this agent is for, in one or two sentences.
- **The tools and when to use each** — don't restate the schemas, but tell the
  agent *which* tool fits *which* situation, and how confusable ones differ.
- **Operating procedure** — when to plan before acting; explore-then-edit on
  hard tasks; verify work before declaring done (`SKILL.md` §7).
- **Conventions** — output format, style, the project's norms (often via a
  project-memory file the agent reads).
- **Guardrails** — what requires approval, what's off-limits, how to handle
  untrusted input (`guardrails.md`).
- **A worked example or two** — especially valuable on smaller models, which
  imitate examples more reliably than they follow prose.

## Explain the why, don't just command

Capable models follow *reasoning* better than they follow stacked imperatives. A
short "do X because Y" generalizes to situations a bare "ALWAYS do X" never
anticipated. Reserve hard MUST/NEVER language for genuine safety lines, and even
then, say why.

## Prompt-engineer your tools too

The tool descriptions are part of the prompt the model reads (`tool-design.md`).
If the agent misuses a tool, the fix is often in the tool's description or
parameter docs, not in piling another rule into the system prompt. Treat the
system prompt and the tool definitions as one coherent instruction surface.

## Iterate against transcripts

Write a first version, run it on real tasks, read where the agent went wrong
(`evaluation.md`), and tighten the spot that actually failed. A system prompt is
a draft you refine against evidence — not a spec you write once.
