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
    /** Load a set of tools (e.g. from persisted state or an import). */
    importTools(state, action: PayloadAction<ToolSchema[]>) {
      state.tools = action.payload;
      state.selectedId = action.payload[0]?.id ?? null;
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

/** All tools as an OpenAI `tools` array — feed this straight to the LLM call. */
export const selectOpenAITools = createSelector([selectTools], (tools) =>
  tools.map(toOpenAITool),
);
