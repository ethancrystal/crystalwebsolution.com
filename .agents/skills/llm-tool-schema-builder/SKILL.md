---
name: llm-tool-schema-builder
description: >-
  Scaffold a ToolSchemaBuilder — a UI plus a state slice that lets users define
  and edit custom tool / function-call schemas (name, description, parameters)
  for an LLM agent, with live validation and OpenAI / MCP export. Use whenever
  someone wants a screen where end-users or developers author tools for an
  agent: "tool schema builder", "let users define custom tools", "a UI / form to
  create function-call schemas", "schema editor for my agent", "store tool
  definitions in a Redux slice / Zustand store", "add custom tools at runtime".
  Ships a drop-in React + Redux Toolkit + TypeScript reference implementation
  (types, slice, validator, component) to adapt to the user's stack. For the
  *theory* of what makes a tool schema good, defer to the llm-agent-engineering
  skill's `tool-design.md`; this skill is about shipping the feature.
---

# Tool Schema Builder

Build a feature where users define their own tools for an LLM agent — naming
them, describing them, and adding typed parameters — and get a valid
OpenAI/MCP tool schema out the other end, stored in app state.

This skill ships a working reference implementation in `assets/`. Read it, then
adapt it to the target codebase; don't hand-write this from scratch.

## What it builds

A `ToolSchemaBuilder` component backed by a state slice:

- **Author tools**: name + description + a list of parameters.
- **Per parameter**: name, JSON type, description, `required`, optional `enum`
  values (for closed sets), array item type, and an optional default.
- **Live validation**: flags the issues a human author can still create — weak
  names/descriptions, missing parameter descriptions, closed sets left as free
  text, duplicate names, required-flag problems. Strict mode targets small/open
  models.
- **Export**: compiles the edited shape to the OpenAI function-tool array (and
  an MCP variant) — feed it straight into the agent's request.
- **State**: everything lives in a Redux Toolkit slice (`toolSchemas`), so it
  persists across the app and survives navigation; swap to Zustand trivially.

## The data model

The editor works on a UI-friendly shape (flat parameters, ids for React keys),
and compiles to the wire shape on export. The model has the good-schema rules
*designed in* — the UI literally cannot produce `$ref`, `oneOf`, or deep nesting,
and it nudges closed sets toward `enum`. Full types: `assets/types.ts`. Emitted
shapes and per-runtime notes: `references/schema-shapes.md`.

## Architecture (four files in `assets/`)

| File | Role |
| --- | --- |
| `types.ts` | The `ToolSchema` / `ToolParameter` UI model + the `OpenAIFunctionTool` / `MCPTool` export types. |
| `toolSchemaSlice.ts` | RTK slice: state (`tools`, `selectedId`), reducers (add/remove/duplicate/select/update tool; add/remove/update param; import), selectors, and the `toOpenAITool` / `toMCPTool` compilers + `selectOpenAITools`. |
| `validateToolSchema.ts` | Browser validation mirroring the llm-agent-engineering linter; returns leveled findings the UI renders live. |
| `ToolSchemaBuilder.tsx` | The two-pane component (tool list + editor + validation + copyable JSON preview). Only renders state and dispatches edits. |

## Build it

1. **Drop the four asset files** into the codebase (e.g. `src/features/tools/`).
   Match their import paths and the project's styling (the component uses
   Tailwind — restyle if the project uses something else).
2. **Register the reducer** under the key `toolSchemas`:
   ```ts
   import toolSchemas from './features/tools/toolSchemaSlice';
   export const store = configureStore({ reducer: { toolSchemas /* , ... */ } });
   ```
3. **Render** `<ToolSchemaBuilder />` anywhere inside the Redux `<Provider>`.
4. **Feed the agent.** Where you build the LLM request, pull the compiled tools:
   ```ts
   import { selectOpenAITools } from './features/tools/toolSchemaSlice';
   const tools = useSelector(selectOpenAITools); // OpenAI `tools` array
   // ...include `tools` in the chat/completions call
   ```
5. **(Optional) persist.** Add `redux-persist` or a tiny `localStorage`
   subscriber on the slice so user-defined tools survive reloads.

## What it enforces (and why)

The validator and the model encode the rules from
`llm-agent-engineering/references/tool-design.md` and `small-and-open-models.md`:
flat parameters, `enum` for closed value-sets, a description (with an example)
on every parameter, snake_case action-oriented names, sane `required`, and no
ref-graphs/combinators. Keep that skill as the source of truth for the *why*;
when a user asks "is this a good tool," route to it.

## Adapting to the user's stack

- **Zustand / Jotai / plain context** instead of RTK: the reducer logic in
  `toolSchemaSlice.ts` maps 1:1 to store actions; only the hooks in the
  component change. The compilers (`toOpenAITool`, `buildObjectSchema`) and the
  validator are framework-agnostic — reuse them as-is.
- **Different UI kit**: the component is intentionally plain. Replace the inputs
  with the project's design-system components; keep the dispatch wiring.
- **Persisting to a backend**: add a thunk that POSTs `selectOpenAITools` output;
  the slice is already the single source of truth.
- **MCP server** instead of a direct LLM call: export with `toMCPTool` and serve
  the result as your tool list (`references/schema-shapes.md`).

## Assets
- `assets/types.ts`
- `assets/toolSchemaSlice.ts`
- `assets/validateToolSchema.ts`
- `assets/ToolSchemaBuilder.tsx`
- `references/schema-shapes.md`
