// toolSchemaSlice.ts — Redux Toolkit state for user-defined tool schemas.
//
// Register in your store under the key `toolSchemas`:
//   import toolSchemas from './toolSchemaSlice';
//   export const store = configureStore({ reducer: { toolSchemas /* , ... */ } });
//
// Selectors are written to accept any RootState that includes this slice under
// `toolSchemas`, so you don't have to import your app's RootState here.

import {
  createSlice,
  createSelector,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type {
  ToolSchema,
  ToolParameter,
  JSONType,
  JSONSchemaObject,
  JSONSchemaProperty,
  OpenAIFunctionTool,
  MCPTool,
  AnthropicTool,
  GeminiType,
  GeminiSchema,
  GeminiFunctionDeclaration,
  GeminiToolBlock,
} from './types';

export interface ToolSchemasState {
  tools: ToolSchema[];
  selectedId: string | null;
}

const initialState: ToolSchemasState = { tools: [], selectedId: null };

const newParameter = (): ToolParameter => ({
  id: nanoid(),
  name: '',
  type: 'string',
  description: '',
  required: false,
});

const toolSchemaSlice = createSlice({
  name: 'toolSchemas',
  initialState,
  reducers: {
    addTool: {
      reducer(state, action: PayloadAction<ToolSchema>) {
        state.tools.push(action.payload);
        state.selectedId = action.payload.id;
      },
      prepare() {
        return {
          payload: {
            id: nanoid(),
            name: 'new_tool',
            description: '',
            parameters: [],
          } as ToolSchema,
        };
      },
    },
    removeTool(state, action: PayloadAction<string>) {
      state.tools = state.tools.filter((t) => t.id !== action.payload);
      if (state.selectedId === action.payload) {
        state.selectedId = state.tools[0]?.id ?? null;
      }
    },
    duplicateTool(state, action: PayloadAction<string>) {
      const src = state.tools.find((t) => t.id === action.payload);
      if (!src) return;
      const copy: ToolSchema = {
        ...src,
        id: nanoid(),
        name: `${src.name}_copy`,
        parameters: src.parameters.map((p) => ({ ...p, id: nanoid() })),
      };
      const i = state.tools.findIndex((t) => t.id === action.payload);
      state.tools.splice(i + 1, 0, copy);
      state.selectedId = copy.id;
    },
    selectTool(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    updateTool(
      state,
      action: PayloadAction<{ id: string; changes: Partial<Pick<ToolSchema, 'name' | 'description'>> }>,
    ) {
      const tool = state.tools.find((t) => t.id === action.payload.id);
      if (tool) Object.assign(tool, action.payload.changes);
    },
    addParam(state, action: PayloadAction<string>) {
      state.tools.find((t) => t.id === action.payload)?.parameters.push(newParameter());
    },
    removeParam(state, action: PayloadAction<{ toolId: string; paramId: string }>) {
      const tool = state.tools.find((t) => t.id === action.payload.toolId);
      if (tool) tool.parameters = tool.parameters.filter((p) => p.id !== action.payload.paramId);
    },
    updateParam(
      state,
      action: PayloadAction<{ toolId: string; paramId: string; changes: Partial<ToolParameter> }>,
    ) {
      const tool = state.tools.find((t) => t.id === action.payload.toolId);
      const param = tool?.parameters.find((p) => p.id === action.payload.paramId);
      if (param) Object.assign(param, action.payload.changes);
    },
    /** Replace all tools (e.g. from persisted state or a JSON import). */
    importTools(state, action: PayloadAction<ToolSchema[]>) {
      state.tools = action.payload;
      state.selectedId = action.payload[0]?.id ?? null;
    },
    /** Append imported tools to the existing set (merge, don't replace). */
    mergeTools(state, action: PayloadAction<ToolSchema[]>) {
      state.tools.push(...action.payload);
      state.selectedId = action.payload[0]?.id ?? state.selectedId;
    },
  },
});

export const {
  addTool,
  removeTool,
  duplicateTool,
  selectTool,
  updateTool,
  addParam,
  removeParam,
  updateParam,
  importTools,
  mergeTools,
} = toolSchemaSlice.actions;

export default toolSchemaSlice.reducer;

// ---- Selectors -----------------------------------------------------------

type WithToolSchemas = { toolSchemas: ToolSchemasState };

export const selectTools = (s: WithToolSchemas) => s.toolSchemas.tools;
export const selectSelectedId = (s: WithToolSchemas) => s.toolSchemas.selectedId;

export const selectSelectedTool = createSelector(
  [selectTools, selectSelectedId],
  (tools, id) => tools.find((t) => t.id === id) ?? null,
);

// ---- Export compilers (UI shape -> wire shape) ---------------------------

function coerceDefault(type: JSONType, raw: string | undefined): unknown {
  if (raw == null || raw === '') return undefined;
  switch (type) {
    case 'boolean':
      return raw === 'true';
    case 'number':
    case 'integer': {
      const n = Number(raw);
      return Number.isNaN(n) ? undefined : n;
    }
    case 'array':
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    default:
      return raw;
  }
}

/** The JSON-Schema body shared by OpenAI, Anthropic, and MCP. */
function buildObjectSchema(tool: ToolSchema): JSONSchemaObject {
  const properties: Record<string, JSONSchemaProperty> = {};
  const required: string[] = [];

  for (const p of tool.parameters) {
    if (!p.name.trim()) continue; // skip half-finished rows
    const prop: JSONSchemaProperty = { type: p.type };
    if (p.description.trim()) prop.description = p.description.trim();
    if (p.enumValues && p.enumValues.length) prop.enum = p.enumValues;
    if (p.type === 'array' && p.itemType) prop.items = { type: p.itemType };
    const def = coerceDefault(p.type, p.defaultValue);
    if (def !== undefined) prop.default = def;
    properties[p.name.trim()] = prop;
    if (p.required) required.push(p.name.trim());
  }

  const schema: JSONSchemaObject = {
    type: 'object',
    properties,
    additionalProperties: false,
  };
  if (required.length) schema.required = required;
  return schema;
}

export function toOpenAITool(tool: ToolSchema): OpenAIFunctionTool {
  return {
    type: 'function',
    function: {
      name: tool.name.trim(),
      description: tool.description.trim(),
      parameters: buildObjectSchema(tool),
    },
  };
}

export function toMCPTool(tool: ToolSchema): MCPTool {
  return {
    name: tool.name.trim(),
    description: tool.description.trim(),
    inputSchema: buildObjectSchema(tool),
  };
}

export function toAnthropicTool(tool: ToolSchema): AnthropicTool {
  return {
    name: tool.name.trim(),
    description: tool.description.trim(),
    input_schema: buildObjectSchema(tool),
  };
}

// ---- Gemini compiler ------------------------------------------------------

const GEMINI_TYPE: Record<JSONType, GeminiType> = {
  string: 'STRING',
  number: 'NUMBER',
  integer: 'INTEGER',
  boolean: 'BOOLEAN',
  array: 'ARRAY',
};

function buildGeminiSchema(tool: ToolSchema): GeminiSchema {
  const properties: Record<string, GeminiSchema> = {};
  const required: string[] = [];

  for (const p of tool.parameters) {
    if (!p.name.trim()) continue;
    const s: GeminiSchema = { type: GEMINI_TYPE[p.type] };
    if (p.description.trim()) s.description = p.description.trim();
    if (p.enumValues && p.enumValues.length) {
      s.format = 'enum';
      s.enum = p.enumValues;
    }
    if (p.type === 'array' && p.itemType) s.items = { type: GEMINI_TYPE[p.itemType] };
    properties[p.name.trim()] = s;
    if (p.required) required.push(p.name.trim());
  }

  const schema: GeminiSchema = { type: 'OBJECT', properties };
  if (required.length) schema.required = required;
  return schema; // Gemini omits additionalProperties + default
}

export function toGeminiFunctionDeclaration(tool: ToolSchema): GeminiFunctionDeclaration {
  return {
    name: tool.name.trim(),
    description: tool.description.trim(),
    parameters: buildGeminiSchema(tool),
  };
}

// ---- Selectors for each target -------------------------------------------

/** All tools as an OpenAI `tools` array — feed this straight to the LLM call. */
export const selectOpenAITools = createSelector([selectTools], (tools) =>
  tools.map(toOpenAITool),
);
export const selectMCPTools = createSelector([selectTools], (tools) =>
  tools.map(toMCPTool),
);
export const selectAnthropicTools = createSelector([selectTools], (tools) =>
  tools.map(toAnthropicTool),
);
/** Gemini wants a single block with a `functionDeclarations` array. */
export const selectGeminiToolBlock = createSelector(
  [selectTools],
  (tools): GeminiToolBlock => ({ functionDeclarations: tools.map(toGeminiFunctionDeclaration) }),
);

// ---- Round-trip import (wire shape -> UI shape) --------------------------
// Accepts pasted JSON in any supported format — an OpenAI `tools` array, a
// single function tool, MCP tool(s), Anthropic tool(s), or a Gemini block /
// functionDeclarations — and reverse-compiles it to the editable UI model.
//
// The UI model is intentionally flat, so a nested `object` parameter is coerced
// to `string` on import (the one lossy case); everything else round-trips.

type AnyObj = Record<string, unknown>;
const isObj = (v: unknown): v is AnyObj => typeof v === 'object' && v !== null;

function coerceType(raw: unknown): JSONType {
  const t = String(raw ?? '').toLowerCase();
  if (t === 'string' || t === 'number' || t === 'integer' || t === 'boolean' || t === 'array') {
    return t as JSONType;
  }
  return 'string'; // object / null / unknown -> flat-model fallback
}

function stringifyDefault(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v.map(String).join(', ');
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

function paramsFromSchemaBody(body: unknown): ToolParameter[] {
  if (!isObj(body)) return [];
  const props = isObj(body.properties) ? (body.properties as AnyObj) : {};
  const required = new Set(Array.isArray(body.required) ? (body.required as unknown[]).map(String) : []);

  return Object.entries(props).map(([name, rawProp]) => {
    const prop = isObj(rawProp) ? rawProp : {};
    const type = coerceType(prop.type);
    const itemsType = isObj(prop.items) ? coerceType((prop.items as AnyObj).type) : undefined;
    const enumValues = Array.isArray(prop.enum) ? (prop.enum as unknown[]).map(String) : undefined;
    return {
      id: nanoid(),
      name,
      type,
      description: typeof prop.description === 'string' ? prop.description : '',
      required: required.has(name),
      enumValues: enumValues && enumValues.length ? enumValues : undefined,
      itemType: type === 'array' ? itemsType ?? 'string' : undefined,
      defaultValue: stringifyDefault(prop.default),
    } as ToolParameter;
  });
}

/** Pull the {name, description, schema-body} out of any supported envelope. */
function toolFromObject(o: AnyObj): ToolSchema | null {
  let name: unknown;
  let description: unknown;
  let body: unknown;

  if (isObj(o.function)) {
    // OpenAI: { type:'function', function:{ name, description, parameters } }
    const fn = o.function as AnyObj;
    name = fn.name; description = fn.description; body = fn.parameters;
  } else if (o.input_schema !== undefined) {
    // Anthropic: { name, description, input_schema }
    name = o.name; description = o.description; body = o.input_schema;
  } else if (o.inputSchema !== undefined) {
    // MCP: { name, description, inputSchema }
    name = o.name; description = o.description; body = o.inputSchema;
  } else if (o.parameters !== undefined) {
    // Gemini functionDeclaration / bare function object
    name = o.name; description = o.description; body = o.parameters;
  } else {
    return null;
  }

  if (typeof name !== 'string' && body === undefined) return null;
  return {
    id: nanoid(),
    name: typeof name === 'string' ? name : '',
    description: typeof description === 'string' ? description : '',
    parameters: paramsFromSchemaBody(body),
  };
}

/** Flatten any container (array, {tools}, {functionDeclarations}) to tool objects. */
function extractToolObjects(input: unknown): AnyObj[] {
  if (Array.isArray(input)) return input.flatMap(extractToolObjects);
  if (isObj(input)) {
    if (Array.isArray(input.functionDeclarations)) {
      return (input.functionDeclarations as unknown[]).flatMap(extractToolObjects);
    }
    if (Array.isArray(input.tools)) return (input.tools as unknown[]).flatMap(extractToolObjects);
    return [input];
  }
  return [];
}

/** Reverse-compile already-parsed JSON into the editable UI model. */
export function fromWireTools(input: unknown): ToolSchema[] {
  return extractToolObjects(input)
    .map(toolFromObject)
    .filter((t): t is ToolSchema => t !== null);
}

/** Parse pasted JSON text into UI tools. Throws a readable error on bad input. */
export function parseToolsInput(text: string): ToolSchema[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`That isn't valid JSON: ${(e as Error).message}`);
  }
  const tools = fromWireTools(parsed);
  if (tools.length === 0) {
    throw new Error('No tools found. Paste an OpenAI/Anthropic/MCP tools array or a Gemini block.');
  }
  return tools;
}
