# Tool Design

The tool layer is the agent-computer interface, and it is almost always the
highest-leverage surface you can improve. The model is a non-deterministic
caller; your tools are the deterministic contract it acts through. Invest in
this contract as much as you invest in the prompt.

Primary sources: *Writing effective tools for AI agents* and *Building Effective
Agents* (Appendix 2), plus the `mcp-builder` skill. See `sources.md`.

## Contents
1. The mental model
2. Select tools for workflows, not endpoints
3. Name and namespace
4. Schema design
5. Descriptions that leave nothing to infer
6. Return shape: high-signal and token-efficient
7. Errors are data
8. Metadata and behavior annotations
9. Anti-patterns (audit checklist)
10. Evaluate and iterate with agents
11. Worked example (ToolSpec convention)

## 1. The mental model

The model sees only three things about a tool: its **name**, its
**description**, and its **parameters** schema. It cannot see your
implementation, your variable names, or your intentions. Every ambiguity in
those three becomes a wrong call, a hallucinated argument, or a tool the model
avoids. Design them for a competent caller who has zero prior context and will
infer nothing.

## 2. Select tools for workflows, not endpoints

The instinct to expose one tool per API endpoint produces a large, flat,
low-leverage surface. Instead, build a smaller set of tools shaped around the
*tasks an agent actually performs*. A single `schedule_meeting(attendees,
window)` tool that internally checks availability and books beats four
primitives the agent must orchestrate correctly every time.

- Favor a few high-impact tools over exhaustive coverage. Each extra tool costs
  context and adds a chance to pick wrong.
- Consolidate tools that are always used together into one workflow tool.
- Keep the *advertised* set small. If you must keep many primitives for
  flexibility, hide rarely-used ones (or expose them as aliases that resolve for
  dispatch but aren't advertised — see the worked example).

## 3. Name and namespace

- Action-oriented verbs: `create`, `list`, `search`, `read`, `update`,
  `delete`, `run`. The name should predict the effect.
- Consistent prefixes for related tools so the agent can find the family:
  `repo_search`, `repo_create_pr`, `repo_list_branches`.
- Distinct, non-confusable names. If two tools could plausibly answer the same
  request, the agent will sometimes pick the wrong one — rename or merge.

## 4. Schema design

Use a JSON Schema object for `parameters`. Keep it the simplest thing that fully
specifies the call.

- **Flat over nested.** Prefer top-level scalar parameters. Deep nesting is
  harder for models to fill correctly and is poorly supported on smaller
  runtimes. If you need structure, keep it one level deep and document it.
- **Right-size `required`.** Mark a parameter required only if the call is
  meaningless without it. Over-broad `required` forces the model to invent
  values; too-loose `required` invites incomplete calls. Give sensible
  `default`s for the rest.
- **Use `enum` for closed value-spaces.** If a parameter has a known finite set
  of valid values (`"asc" | "desc"`, a set of statuses, a fixed mode), make it
  an `enum`. This is the single most effective way to stop free-text drift, and
  it is far more reliable than describing the options in prose.
- **Constrain where it helps**: `type`, `enum`, `minimum`/`maximum`,
  `minLength`, `format` for dates. But know your target — many small/open-model
  runtimes ignore exotic keywords (see `small-and-open-models.md`).
- **Avoid `$ref` / `$defs` / `oneOf` / `anyOf` / `allOf` when you can.** They are
  the classic Pydantic/Zod auto-emission artifacts and a common cause of
  silent breakage on non-frontier runtimes. If you generate schemas from types,
  inline and flatten the result rather than shipping the raw `$ref` graph.

## 5. Descriptions that leave nothing to infer

The tool description and each parameter description are prompt real estate. Make
them earn it.

- **Tool description**: one or two sentences on what it does, plus when to use
  it (and when not to, if it's confusable with a sibling). State important
  side effects and constraints.
- **Every parameter gets a description.** State what it is, the expected format,
  and an example. "`path`: file or directory to search, relative to the repo
  root, e.g. `src/api`" beats "`path`: the path."
- **Put examples in descriptions.** A concrete example value is worth a
  paragraph of explanation, and it materially lifts call accuracy.
- **Disambiguate siblings.** If `search_code` and `search_docs` both exist, each
  description should say what it's *for* so the model doesn't coin-flip.

## 6. Return shape: high-signal and token-efficient

What a tool returns re-enters the context window and competes for the model's
attention. Treat the return as part of the design, not an afterthought.

- Return what the agent needs to decide its next step — not the raw API dump.
- Let the agent control verbosity/format when it matters (e.g., a
  `response_format` or `detail` parameter), defaulting to concise.
- Use stable, human-meaningful identifiers and consistent enums in outputs;
  avoid spraying opaque internal IDs unless the agent will pass them back.
- Paginate or cap large results, and say so in the output ("showing 50 of 320;
  refine with `glob`"). Truncate before it floods the window.
- When the SDK supports it, return both readable text and structured data
  (e.g. `structuredContent` / an `outputSchema`) so clients can parse reliably.

## 7. Errors are data

A tool error is a turn in a conversation, not a stack trace. Return errors that
*steer the model to success*:

- Say what went wrong **and** what to do about it: "path 'src/api' not found;
  list the directory with `list_files` first" beats "ENOENT".
- Return errors as normal tool results (a string/object the model reads), not by
  throwing through the loop. Let the agent recover.
- Keep them short and specific. Don't dump a 500-line traceback into context.

## 8. Metadata and behavior annotations

Carry behavior flags alongside the schema so the harness can enforce policy
(see `guardrails.md`):

- Whether the tool **mutates** state, and a category (read / write / exec /
  meta). Read-only tools can run freely; mutating ones can be gated.
- The MCP-style hints when applicable: `readOnlyHint`, `destructiveHint`,
  `idempotentHint`, `openWorldHint`. These let clients reason about safety and
  retries without parsing your description.
- Idempotency matters for retries and for dedup: a non-idempotent tool
  (commit, send, delete, charge) must never be fired twice for one intent.

## 9. Anti-patterns (audit checklist)

Run `scripts/validate_tool_schema.py` to catch these mechanically:

- A parameter with no description.
- A closed value-space left as free `string` instead of an `enum`.
- `$ref` / `$defs` / `oneOf` / `anyOf` / `allOf`, or nesting deeper than ~2.
- `required` listing everything (or nothing meaningful).
- Vague tool description; name that doesn't predict the effect.
- Two tools that overlap in purpose.
- A return that dumps raw payloads with no truncation/pagination.
- More advertised tools than the model can reliably choose among (especially on
  small models — see `small-and-open-models.md`).

## 10. Evaluate and iterate with agents

Tool quality is measured by whether an agent completes real tasks with the
tools — not by how clean the schema looks. The fastest improvement loop:

1. Write a handful of realistic tasks that exercise the tools (`evaluation.md`).
2. Run the agent and **read the transcripts**. Watch where it picked the wrong
   tool, hallucinated an argument, or got a useless return.
3. Feed those failures back into the names, descriptions, enums, and return
   shapes. Letting an agent critique its own failed transcripts surfaces fixes
   you'd miss.
4. Re-run. Repeat until the failures are about the task, not the tools.

## 11. Worked example (ToolSpec convention)

A clean tool in a `ToolSpec`-style registry where `.schema()` emits the
OpenAI-compatible shape `{"type":"function","function":{name, description,
parameters}}`, and aliases resolve for dispatch but are **not** advertised
(keeping the advertised count down — which matters for small models):

```python
register(ToolSpec(
    name="grep",
    description=(
        "Search file contents with a regular expression (ripgrep-backed). "
        "Use to find where a symbol or string appears. For finding files by "
        "name, use `glob` instead. Respects .gitignore."
    ),
    parameters={
        "type": "object",
        "properties": {
            "pattern":       {"type": "string",  "description": "Regex to search for, e.g. 'def \\\\w+_handler'"},
            "path":          {"type": "string",  "description": "Directory or file to search, relative to repo root (default '.')", "default": "."},
            "glob":          {"type": "string",  "description": "Limit to files matching this glob, e.g. '*.py'"},
            "context_lines": {"type": "integer", "description": "Lines of context before/after each match", "default": 0, "minimum": 0},
            "ignore_case":   {"type": "boolean", "description": "Case-insensitive match", "default": False},
        },
        "required": ["pattern"],
    },
    impl=grep, category="read",
))
```

Why it's good: action name; description says what it does, when to use it, and
how it differs from a sibling (`glob`); every parameter described with an
example; closed defaults; `required` limited to the one parameter the call is
meaningless without; flat schema, no `$ref`/`anyOf`; marked `category="read"`
so the harness knows it's safe to run unattended.

### Before / after audit

A schema as a type-generator might emit it — and the flattened version a small
model can actually call:

```jsonc
// BEFORE — model-hostile
{
  "type": "object",
  "properties": {
    "query": {
      "$ref": "#/$defs/Query"          // ref graph: often ignored/broken
    },
    "options": {                        // nested object: hard to fill
      "type": "object",
      "properties": {
        "mode": { "type": "string" }    // closed set left as free text
      }
    }
  }
  // no descriptions, no required, no enum
}
```

```jsonc
// AFTER — flattened, explicit, enum'd
{
  "type": "object",
  "properties": {
    "query":      { "type": "string", "description": "Search text, e.g. 'auth middleware'" },
    "mode":       { "type": "string", "enum": ["semantic", "literal"], "default": "literal",
                    "description": "How to match: 'literal' = exact text, 'semantic' = meaning-based" },
    "max_results":{ "type": "integer", "default": 10, "minimum": 1, "maximum": 50,
                    "description": "How many results to return" }
  },
  "required": ["query"]
}
```

For the rules behind why the "after" version is mandatory (not just nicer) on
Ollama/Qwen and MiniMax/Nemotron, and how to parse the calls they emit, see
`small-and-open-models.md`.
