# Schema Shapes

What the builder compiles to, and how the same authored tool maps onto each
target. The editor's UI model (`assets/types.ts`) is deliberately neutral; the
compilers in `toolSchemaSlice.ts` emit these. Four targets ship: OpenAI,
Anthropic, MCP, and Gemini.

## OpenAI-compatible function tool (the default)

The common denominator across OpenAI, MiniMax, Nemotron, Ollama's `/v1`, and
most hosted open models. `selectOpenAITools` emits an array of:

```json
{
  "type": "function",
  "function": {
    "name": "repo_search",
    "description": "Search the repo for a string. Use to find where something is defined.",
    "parameters": {
      "type": "object",
      "properties": {
        "query": { "type": "string", "description": "Search text, e.g. 'auth middleware'" },
        "mode":  { "type": "string", "enum": ["semantic", "literal"], "default": "literal",
                   "description": "How to match: literal=exact, semantic=meaning" }
      },
      "required": ["query"],
      "additionalProperties": false
    }
  }
}
```

Pass this array as the `tools` parameter of the chat/completions call.

## Anthropic (Claude) tool

Same JSON-Schema body as OpenAI, under `input_schema` instead of nesting it in a
`function` object (`toAnthropicTool` / `selectAnthropicTools`):

```json
{
  "name": "repo_search",
  "description": "Search the repo for a string. Use to find where something is defined.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search text, e.g. 'auth middleware'" },
      "mode":  { "type": "string", "enum": ["semantic", "literal"], "default": "literal",
                 "description": "How to match: literal=exact, semantic=meaning" }
    },
    "required": ["query"],
    "additionalProperties": false
  }
}
```

Pass an array of these as the `tools` parameter of the Anthropic Messages API call.

## MCP tool

Same input schema, different envelope (`toMCPTool` / `selectMCPTools`):

```json
{
  "name": "repo_search",
  "description": "Search the repo for a string. Use to find where something is defined.",
  "inputSchema": { "type": "object", "properties": { "...": "same" }, "required": ["query"], "additionalProperties": false }
}
```

Use this when the authored tools are served by an MCP server rather than sent
directly to a model.

## Gemini function declarations

Gemini uses an OpenAPI-3 subset: **UPPERCASE** type names, an enclosing
`functionDeclarations` array, enums flagged with `format: "enum"`, and **no**
`additionalProperties` or `default` (those are dropped). `toGeminiFunctionDeclaration`
emits one declaration; `selectGeminiToolBlock` wraps the set:

```json
{
  "functionDeclarations": [
    {
      "name": "repo_search",
      "description": "Search the repo for a string. Use to find where something is defined.",
      "parameters": {
        "type": "OBJECT",
        "properties": {
          "query": { "type": "STRING", "description": "Search text, e.g. 'auth middleware'" },
          "mode":  { "type": "STRING", "format": "enum", "enum": ["semantic", "literal"],
                     "description": "How to match: literal=exact, semantic=meaning" }
        },
        "required": ["query"]
      }
    }
  ]
}
```

Put this object in the Gemini request's `tools` array.

## The mapping rules (UI model → wire)

- A `ToolParameter` becomes one entry in `properties`, keyed by its `name`.
- `required: true` adds the name to the schema's `required` array.
- `enumValues` → `enum` (Gemini also gets `format: "enum"`). This is the
  highest-value field for reliability — prefer it for any closed set.
- `type: 'array'` + `itemType` → `{ "type": "array", "items": { "type": … } }`
  (uppercased for Gemini).
- `defaultValue` is coerced to the parameter's type (`"true"`→`true`,
  `"5"`→`5`, comma-list→array) and emitted as `default` — **except Gemini**,
  which omits defaults.
- Half-finished rows (no name) are dropped, so the export is always valid.
- `additionalProperties: false` is set for OpenAI/Anthropic/MCP (models can't
  invent fields); Gemini omits it (unsupported).

## Importing (round-trip)

`parseToolsInput(text)` reads pasted JSON in **any** of the four shapes above —
array, single tool, `{ tools: [...] }`, or `{ functionDeclarations: [...] }` —
and reverse-compiles to the UI model (`fromWireTools` does the already-parsed
version). Type names are matched case-insensitively, so Gemini's UPPERCASE and
the lowercase JSON-Schema forms both import. Because the UI model is flat, a
**nested `object` property is coerced to `string`** on import; that is the only
lossy case — flat parameters, enums, arrays, defaults, and `required` all
round-trip.

## Per-runtime caveats

For the strict JSON-Schema subset and tool-call parsing that small/open models
need, see `agent-engineering/references/small-and-open-models.md`. The builder
already produces the safe-intersection shape (flat, enum'd, no `$ref`/combinators,
`additionalProperties:false` where supported), so its output works on those
runtimes and on the strict frontier models alike.
