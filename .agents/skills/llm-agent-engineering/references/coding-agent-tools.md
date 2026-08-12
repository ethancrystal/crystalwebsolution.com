# Coding-Agent Tools

How to design the *tool surface* for a Claude Code / Codex / Grok–class coding
agent. This is the applied counterpart to `tool-design.md`: that file is the
general theory; this one is the specific set of tools a code agent needs and why.

The worked reference throughout is the **Serena** toolset (an open-source,
language-server-backed coding-agent toolkit) — the exact tool list this section
maps. The same families show up, under different names, inside every serious
coding agent.

## What separates a great coding agent from a toy

Two leaps, and both are tool-surface decisions:

1. **Semantic, not textual.** A toy agent reads files and greps strings. A real
   one understands *symbols* — it can jump to a definition, list every
   reference, find implementations, and edit a function body as a unit. That
   precision comes from wiring tools to a **language server (LSP)** per language,
   not from regexes. Symbol-level tools are more accurate *and* more
   token-efficient (you fetch the one function, not the whole file —
   `context-engineering.md`).
2. **A verification loop.** The agent can ask the compiler/linter what's broken
   and fix it. Diagnostics-after-edit is the single biggest quality
   differentiator — it's `SKILL.md` §7 ("close the loop") made concrete.

Add persistent memory and an onboarding step and you have the shape of a
production coding agent.

## The tool families (with the Serena set mapped in)

### 1. Project / session — `activate_project`
Scope the agent to one project: which files it may touch, which language servers
to start, which memory to load. This is also a guardrail — the activated project
is the blast-radius boundary (`guardrails.md`). Design: one tool, a project id/
path enum or a known list; everything else operates *within* the active project.

### 2. Semantic navigation (read-only) — `get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `find_implementations`, `find_declaration`
The agent's eyes. `get_symbols_overview` gives the map of a file/package;
`find_symbol` locates a function/class; `find_referencing_symbols` answers "what
calls this" (essential before any change); `find_implementations` and
`find_declaration` walk the type graph. Design notes:
- All read-only — mark them so the harness runs them freely.
- Return *locations + signatures*, not whole files; let the agent pull bodies on
  demand (just-in-time retrieval).
- Use an `enum` for symbol kind (`function | class | method | variable | …`) and
  describe what each navigation tool is *for* so the model doesn't confuse them
  (`tool-design.md` §5). This family is where wrong-tool-picking happens most.

### 3. Symbol-level editing — `replace_symbol_body`, `insert_before_symbol`, `insert_after_symbol`, plus `replace_content`
Edit by *symbol*, not by line range — `replace_symbol_body` swaps a whole
function/class atomically, and `insert_before/after_symbol` add siblings at the
right place. This avoids the classic line-offset corruption that text-only
agents produce. Keep `replace_content` (a literal find/replace) for edits that
aren't symbol-shaped (config files, prose, a one-line tweak). Design notes:
- These **mutate** — annotate them and run a verify step after (next family).
- Identify the target by symbol path/name, not a brittle byte range.
- The model must know when to reach for symbol-edit vs `replace_content`: say so
  in the descriptions.

### 4. Refactoring (high blast radius) — `rename_symbol`, `safe_delete_symbol`
The payoff of the semantic backbone: a rename updates every reference across the
codebase via the language server, and `safe_delete_symbol` checks references
*before* removing so it won't orphan callers. These are workflow tools
(`tool-design.md` §2) — one call does what would be dozens of error-prone text
edits. Design notes:
- `safe_delete_symbol` is **destructive** — gate it behind approval
  (`guardrails.md`) and/or require a clean diagnostics pass after.
- Make idempotency explicit; never let a rename fire twice for one intent
  (`the-agent-loop.md`).

### 5. Diagnostics / verification — `get_diagnostics_for_file`
The close-the-loop tool. After an edit, the agent reads the errors/warnings and
self-corrects instead of confidently shipping a broken change. Wire this into
the loop so the agent calls it after every mutation. Design: return a compact,
structured list (file, line, severity, message) — truncate noise; this re-enters
context every edit cycle.

### 6. Persistent memory — `write_memory`, `read_memory`, `list_memories`, `edit_memory`, `delete_memory`, `rename_memory`
External, named memory is how a coding agent survives long tasks and *sessions*:
it writes down the plan, decisions made, conventions discovered, and reads them
back later (`context-engineering.md` — external notes + the CLAUDE.md pattern).
Design notes:
- Memories are named documents: a `name` (key) + `content`. The CRUD set above
  is the right surface; `list_memories` lets the agent discover what it knows.
- Keep returns lean; memory is a store, not a dumping ground for whole files.
- `delete_memory` mutates — same annotation discipline.

### 7. System / onboarding — `initial_instructions`, `onboarding`, `get_current_config`
The bootstrap layer. `initial_instructions` injects the agent's operating manual
and **must be called first** — it's the system prompt delivered as a tool
(`system-prompts.md`: set the altitude before work begins). `onboarding` builds
the initial project memory the first time the agent meets a codebase (indexes
structure, writes starter memories). `get_current_config` lets the agent
introspect its own setup. Design: make the "call `initial_instructions` first"
contract impossible to miss — enforce it in the harness, not just the prompt.

## Mapping table

| # | Tool | Family | Mutates? | Notes |
|---|------|--------|----------|-------|
| 1 | `activate_project` | Project/session | no | sets blast-radius + memory scope |
| 2 | `get_symbols_overview` | Navigation | no | the file/package map |
| 3 | `find_symbol` | Navigation | no | locate a symbol |
| 4 | `find_referencing_symbols` | Navigation | no | "what calls this" — pre-edit check |
| 5 | `find_implementations` | Navigation | no | interface/abstract → impls |
| 6 | `find_declaration` | Navigation | no | go to declaration |
| 7 | `replace_symbol_body` | Editing | **yes** | atomic function/class swap |
| 8 | `insert_before_symbol` | Editing | **yes** | add sibling before |
| 9 | `insert_after_symbol` | Editing | **yes** | add sibling after |
| 10 | `replace_content` | Editing | **yes** | literal find/replace for non-symbol edits |
| 11 | `rename_symbol` | Refactor | **yes** | cross-file rename via LSP |
| 12 | `safe_delete_symbol` | Refactor | **yes**/destructive | checks refs first — gate it |
| 13 | `get_diagnostics_for_file` | Verify | no | the close-the-loop tool |
| 14–19 | `*_memory` (write/read/list/edit/delete/rename) | Memory | mixed | named external notes |
| 20 | `get_current_config` | System | no | introspection |
| 21 | `onboarding` | System | yes (writes memory) | first-contact indexing |
| 22 | `initial_instructions` | System | no | the operating manual; **call first** |

## Designing this surface well

- **It's ~22 tools — already heavy for a small model.** Per
  `small-and-open-models.md`, advertise the smallest working set: group rarely-
  used tools, hide them behind unadvertised aliases, or expose "modes." A 7B
  model with 22 flat tools will mis-select; the same model with the 8 it needs
  for the current step won't.
- **Annotate read vs. write vs. destructive** and let the harness enforce
  approval gates (`guardrails.md`). Navigation/diagnostics run free; edits and
  especially `safe_delete_symbol` get gated and verified.
- **Lean returns everywhere** — signatures and locations over whole files,
  truncated diagnostics, named-but-not-dumped memories (`context-engineering.md`).
- **Validate every schema** with `scripts/validate_tool_schema.py --target small`.

## Build order for the surface

Front-load read + verify, end with the high-blast-radius tools:
1. `activate_project` + the **navigation** family (read-only — safe to ship first).
2. `get_diagnostics_for_file` (you need the verifier before you trust edits).
3. **Symbol editing** (`replace_symbol_body`, `insert_*`, `replace_content`) — each
   followed by a diagnostics call in the loop.
4. **Refactoring** (`rename_symbol`, then `safe_delete_symbol` behind a gate).
5. **Memory** + **onboarding/`initial_instructions`** to make it durable across
   sessions.

To let *users* define their own custom tools for this agent at runtime, see the
companion skill `llm-tool-schema-builder`.
