// types.ts — the data model the ToolSchemaBuilder edits and exports.
//
// The editor works on a UI-friendly shape (flat, array-of-params, ids for React
// keys + state updates). On export it is compiled to the OpenAI-compatible
// function-tool shape, which is also the basis of an MCP tool's inputSchema.
//
// Rules baked into this model (see the `llm-tool-schema-builder` SKILL.md and
// llm-agent-engineering/references/tool-design.md): parameters are flat, closed
// value-sets are enums, every parameter carries a description, and there is no
// $ref / oneOf / anyOf — the model never needs to produce those.

export type JSONType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array';

export const JSON_TYPES: JSONType[] = ['string', 'number', 'integer', 'boolean', 'array'];

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

// ---- Export targets ------------------------------------------------------

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
