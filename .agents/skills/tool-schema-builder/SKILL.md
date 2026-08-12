---
name: tool-schema-builder
description: >-
  Scaffold a ToolSchemaBuilder — a UI plus a state slice that lets users define
  and edit custom tool / function-call schemas (name, description, parameters)
  for an LLM agent, with live validation and multi-provider export to OpenAI,
  Anthropic (Claude), MCP, and Gemini. Round-trips: paste an existing tools
  array and edit it. Use whenever someone wants a screen where end-users or
  developers author tools for an agent: "tool schema builder", "let users define
  custom tools", "a UI / form to create function-call schemas", "schema editor
  for my agent", "store tool definitions in a Redux slice / Zustand store", "add
  custom tools at runtime", "import my OpenAI/Claude tools and edit them". Ships a
  drop-in React + Redux Toolkit + TypeScript reference implementation (types,
  slice, validator, persistence, component) to adapt to the user's stack. For the
  *theory* of what makes a tool schema good, defer to the agent-engineering
  skill's `tool-design.md`; this skill is about shipping the feature.
---

# Tool Schema Builder

Build a feature where users define their own tools for an LLM agent — naming
them, describing them, and adding typed parameters — and get a valid tool
schema out the other end for **OpenAI, Anthropic (Claude), MCP, or Gemini**,
stored in app state. It round-trips: paste an existing tools array back in and
keep editing.

This skill ships a working reference implementation in `assets/`. Read it, then
adapt it to the target codebase; don't hand-write this from scratch.

## What it builds

A `ToolSchemaBuilder` component backed by a state slice:

- **Author tools**: name + description + a list of parameters.
- **Per parameter**: name, JSON type, description, `required`, optional `enum`
  values (for closed sets), array item type, and an optional default.
- **Live validation**: flags the issues a human author can still create — weak
  names/descriptions, over-long names (>64) or descriptions, missing parameter
  descriptions, closed sets left as free text, defaults that contradict their
  enum, duplicate names, required-flag problems, oversized tool/parameter sets.
  Strict mode targets small/open models.
- **Multi-provider export**: compiles the edited shape to the **OpenAI**
  function-tool array, **Anthropic** `input_schema` tools, **MCP** tools, or a
  **Gemini** `functionDeclarations` block — switch target in the UI, copy one or
  all, feed it straight into the agent's request.
- **Import / round-trip**: paste a tools array in any of those four formats and
  it reverse-compiles into editable tools (`Replace all` or `Add to set`).
- **State**: everything lives in a Redux Toolkit slice (`toolSchemas`), so it
  persists across the app and survives navigation; swap to Zustand trivially.
- **Persistence**: one call (`attachToolPersistence(store)`) hydrates from and
  saves to `localStorage`, so user-defined tools survive reloads.

## The data model

The editor works on a UI-friendly shape (flat parameters, ids for React keys),
and compiles to the wire shape on export. The model has the good-schema rules
*designed in* — the UI literally cannot produce `$ref`, `oneOf`, or deep nesting,
and it nudges closed sets toward `enum`. One target (OpenAI/Anthropic/MCP) shares
a single JSON-Schema body; Gemini gets its OpenAPI-subset variant (uppercase
types, `functionDeclarations` envelope). Full types: `assets/types.ts`. Emitted
shapes and per-runtime notes: `references/schema-shapes.md`.

## Architecture (files in `assets/`)

| File | Role |
| --- | --- |
| `types.ts` | The `ToolSchema` / `ToolParameter` UI model + the export types: `OpenAIFunctionTool`, `AnthropicTool`, `MCPTool`, and the Gemini `GeminiFunctionDeclaration` / `GeminiToolBlock`. Plus `ExportFormat`. |
| `toolSchemaSlice.ts` | RTK slice: state (`tools`, `selectedId`), reducers (add/remove/duplicate/select/update tool; add/remove/update param; `importTools`/`mergeTools`), selectors, the `toOpenAITool` / `toAnthropicTool` / `toMCPTool` / `toGeminiFunctionDeclaration` compilers + per-target selectors, and the `parseToolsInput` / `fromWireTools` reverse-compiler. |
| `validateToolSchema.ts` | Browser validation mirroring the agent-engineering linter; returns leveled findings the UI renders live. |
| `persistence.ts` | `attachToolPersistence(store)` + `load/savePersistedTools` — drop-in `localStorage` persistence (debounced, SSR-safe). |
| `ToolSchemaBuilder.tsx` | The two-pane component (tool list + editor + validation + provider switcher + copyable JSON preview + import panel). Only renders state and dispatches edits. |

## Build it

1. **Drop the asset files** into the codebase (e.g. `src/features/tools/`).
   Match their import paths and the project's styling (the component uses
   Tailwind — restyle if the project uses something else).
2. **Register the reducer** under the key `toolSchemas`:
   ```ts
   import toolSchemas from './features/tools/toolSchemaSlice';
   export const store = configureStore({ reducer: { toolSchemas /* , ... */ } });
   ```
3. **(Optional) persist** so user tools survive reloads:
   ```ts
   import { attachToolPersistence } from './features/tools/persistence';
   attachToolPersistence(store); // hydrates now, saves on every change
   ```
4. **Render** `<ToolSchemaBuilder />` anywhere inside the Redux `<Provider>`.
5. **Feed the agent.** Where you build the LLM request, pull the compiled tools
   for your provider:
   ```ts
   import {
     selectOpenAITools, selectAnthropicTools, selectMCPTools, selectGeminiToolBlock,
   } from './features/tools/toolSchemaSlice';
   const tools = useSelector(selectOpenAITools);        // OpenAI `tools` array
   // const tools = useSelector(selectAnthropicTools);  // Claude Messages `tools`
   // const tools = useSelector(selectMCPTools);         // MCP tool list
   // const tools = useSelector(selectGeminiToolBlock);  // Gemini { functionDeclarations }
   // ...include `tools` in the model call
   ```

## What it enforces (and why)

The validator and the model encode the rules from
`agent-engineering/references/tool-design.md` and `small-and-open-models.md`:
flat parameters, `enum` for closed value-sets, a description (with an example)
on every parameter, snake_case action-oriented names within length limits, sane
`required`, defaults that agree with their enum, and no ref-graphs/combinators.
Keep that skill as the source of truth for the *why*; when a user asks "is this
a good tool," route to it.

## Importing existing tools (round-trip)

`parseToolsInput(text)` accepts pasted JSON in any supported shape — an OpenAI
`tools` array, a single function tool, MCP tool(s), Anthropic tool(s), or a
Gemini block / `functionDeclarations` — and reverse-compiles to the UI model;
the Import panel wires it to `importTools` (replace) or `mergeTools` (append).
The UI model is intentionally flat, so a **nested `object` parameter is coerced
to `string` on import** (the one lossy case); everything else round-trips.

## Adapting to the user's stack

- **Zustand / Jotai / plain context** instead of RTK: the reducer logic in
  `toolSchemaSlice.ts` maps 1:1 to store actions; only the hooks in the
  component change. The compilers (`toOpenAITool` … `toGeminiFunctionDeclaration`),
  the `parseToolsInput` importer, and the validator are framework-agnostic —
  reuse them as-is. `persistence.ts` only needs `getState`/`subscribe`/`dispatch`.
- **Different UI kit**: the component is intentionally plain. Replace the inputs
  with the project's design-system components; keep the dispatch wiring.
- **Persisting to a backend**: swap `persistence.ts`'s localStorage calls for a
  thunk that POSTs the selected provider's output; the slice is already the
  single source of truth.
- **Provider choice**: all four targets are first-class — pick the selector that
  matches your model call. Gemini is the only one with a different envelope
  (`references/schema-shapes.md`).

## Assets
- `assets/types.ts`
- `assets/toolSchemaSlice.ts`
- `assets/validateToolSchema.ts`
- `assets/persistence.ts`
- `assets/ToolSchemaBuilder.tsx`
- `references/schema-shapes.md`
