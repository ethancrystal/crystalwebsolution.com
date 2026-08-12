# Schema Shapes

What the builder compiles to, and how the same authored tool maps onto each
target. The editor's UI model (`assets/types.ts`) is deliberately neutral; the
compilers in `toolSchemaSlice.ts` emit these.

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

## MCP tool

Same input schema, different envelope (`toMCPTool`):

```json
{
  "name": "repo_search",
  "description": "Search the repo for a string. Use to find where something is defined.",
  "inputSchema": { "type": "object", "properties": { /* …same… */ }, "required": ["query"], "additionalProperties": false }
}
```

Use this when the authored tools are served by an MCP server rather than sent
directly to a model.

## Anthropic tool-use (if targeting Claude directly)

Anthropic's Messages API uses the same JSON-Schema body under a slightly
different envelope (`name`, `description`, `input_schema`). If you need a Claude
target, add a `toAnthropicTool` compiler alongside the two existing ones — it's
the MCP shape with `inputSchema` renamed to `input_schema`.

## The mapping rules (UI model → wire)

- A `ToolParameter` becomes one entry in `properties`, keyed by its `name`.
- `required: true` adds the name to the schema's `required` array.
- `enumValues` → `enum`. (This is the highest-value field for reliability —
  prefer it for any closed set.)
- `type: 'array'` + `itemType` → `{ "type": "array", "items": { "type": … } }`.
- `defaultValue` is coerced to the parameter's type (`"true"`→`true`,
  `"5"`→`5`, comma-list→array) and emitted as `default`.
- Half-finished rows (no name) are dropped, so the export is always valid.
- `additionalProperties: false` is always set, so models can't invent fields.

## Per-runtime caveats

For the strict JSON-Schema subset and tool-call parsing that small/open models
need, see `llm-agent-engineering/references/small-and-open-models.md`. The builder
already produces the safe-intersection shape (flat, enum'd, no `$ref`/combinators,
`additionalProperties:false`), so its output works on those runtimes and on the
strict frontier models alike.
