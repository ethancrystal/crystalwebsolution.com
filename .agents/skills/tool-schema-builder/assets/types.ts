// types.ts — the data model the ToolSchemaBuilder edits and exports.
//
// The editor works on a UI-friendly shape (flat, array-of-params, ids for React
// keys + state updates). On export it is compiled to whichever provider shape
// you target: OpenAI function tools, Anthropic (Claude) tools, MCP tools, or
// Gemini function declarations. The same authored tool feeds all four.
//
// Rules baked into this model (see the `tool-schema-builder` SKILL.md and
// agent-engineering/references/tool-design.md): parameters are flat, closed
// value-sets are enums, every parameter carries a description, and there is no
// $ref / oneOf / anyOf — the model never needs to produce those.

export type JSONType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array';

export const JSON_TYPES: JSONType[] = ['string', 'number', 'integer', 'boolean', 'array'];

/** Provider targets the builder can emit (and import from). */
export type ExportFormat = 'openai' | 'anthropic' | 'mcp' | 'gemini';

export const EXPORT_FORMATS: { id: ExportFormat; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'mcp', label: 'MCP' },
  { id: 'gemini', label: 'Gemini' },
];

/** One parameter as edited in the UI. */
export interface ToolParameter {
  id: string;            // stable id for React keys + reducers (not exported)
  name: string;          // JSON property name, e.g. "max_results"
  type: JSONType;
  description: string;    // what it is + an example value
  required: boolean;
  enumValues?: string[];  // closed value-set -> emitted as `enum`
  itemType?: JSONType;    // element type when `type === 'array'`
  defaultValue?: string;  // raw text; coerced to the right type on export
}

/** One tool as edited in the UI. */
export interface ToolSchema {
  id: string;             // stable id (not exported)
  name: string;           // tool/function name, snake_case + action-oriented
  description: string;    // what it does + when to use it
  parameters: ToolParameter[];
}

// ---- JSON-Schema body (shared by OpenAI / Anthropic / MCP) ----------------

export interface JSONSchemaProperty {
  type: JSONType;
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: { type: JSONType };
}

export interface JSONSchemaObject {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties: false;
}

/** OpenAI-compatible function tool (the common cloud denominator). */
export interface OpenAIFunctionTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchemaObject;
  };
}

/** MCP-style tool (same input schema, different envelope). */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchemaObject;
}

/** Anthropic (Claude) Messages-API tool: JSON-Schema body under `input_schema`. */
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: JSONSchemaObject;
}

// ---- Gemini function declarations -----------------------------------------
// Gemini uses an OpenAPI-3 subset with UPPERCASE type names, no
// `additionalProperties`, and enums flagged with `format: "enum"`.

export type GeminiType =
  | 'STRING'
  | 'NUMBER'
  | 'INTEGER'
  | 'BOOLEAN'
  | 'ARRAY'
  | 'OBJECT';

export interface GeminiSchema {
  type: GeminiType;
  description?: string;
  format?: string;        // e.g. "enum" for closed string sets
  enum?: string[];
  items?: GeminiSchema;
  properties?: Record<string, GeminiSchema>;
  required?: string[];
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: GeminiSchema;
}

/** What you put in the Gemini request's `tools` array. */
export interface GeminiToolBlock {
  functionDeclarations: GeminiFunctionDeclaration[];
}
