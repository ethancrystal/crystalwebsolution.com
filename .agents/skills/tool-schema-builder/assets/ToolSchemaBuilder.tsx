// ToolSchemaBuilder.tsx — UI for users to define custom tool (function-call)
// schemas for the LLM agent. State lives in the Redux slice (toolSchemaSlice.ts);
// this component only renders it and dispatches edits. Styling is Tailwind.
//
// Wire-up:
//   1. register `toolSchemas` reducer in your store (see toolSchemaSlice.ts)
//   2. (optional) attachToolPersistence(store) to survive reloads (persistence.ts)
//   3. render <ToolSchemaBuilder /> anywhere inside your <Provider>
//   4. feed the agent: const tools = useSelector(selectOpenAITools)  // in your call
//      (or selectAnthropicTools / selectMCPTools / selectGeminiToolBlock)
//
// Swapping state libs: the only Redux-specific lines are the typed hook + the
// dispatch calls. To use Zustand instead, replace those with store hooks; the
// slice's reducer logic maps 1:1 to Zustand actions.

import { useMemo, useState } from 'react';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import {
  addTool, removeTool, duplicateTool, selectTool, updateTool,
  addParam, removeParam, updateParam, importTools, mergeTools,
  selectTools, selectSelectedTool,
  selectOpenAITools, selectAnthropicTools, selectMCPTools, selectGeminiToolBlock,
  toOpenAITool, toAnthropicTool, toMCPTool, toGeminiFunctionDeclaration,
  parseToolsInput,
  type ToolSchemasState,
} from './toolSchemaSlice';
import {
  JSON_TYPES, EXPORT_FORMATS,
  type JSONType, type ToolParameter, type ToolSchema, type ExportFormat,
} from './types';
import { validateAll, errorCount, type Finding } from './validateToolSchema';

const useTSSelector: TypedUseSelectorHook<{ toolSchemas: ToolSchemasState }> = useSelector;

const input = 'w-full rounded border border-neutral-300 px-2 py-1 text-sm focus:border-neutral-900 focus:outline-none';
const label = 'text-xs font-medium uppercase tracking-wide text-neutral-500';
const btn = 'rounded px-2 py-1 text-xs font-medium transition-colors';

const dot: Record<Finding['level'], string> = {
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-neutral-500',
};

/** One tool, compiled to the chosen provider shape. */
function compileOne(tool: ToolSchema, format: ExportFormat) {
  switch (format) {
    case 'anthropic': return toAnthropicTool(tool);
    case 'mcp': return toMCPTool(tool);
    case 'gemini': return toGeminiFunctionDeclaration(tool);
    default: return toOpenAITool(tool);
  }
}

export default function ToolSchemaBuilder() {
  const dispatch = useDispatch();
  const tools = useTSSelector(selectTools);
  const selected = useTSSelector(selectSelectedTool);

  // every target, selected once at the top (hooks must be unconditional)
  const openAITools = useTSSelector(selectOpenAITools);
  const anthropicTools = useTSSelector(selectAnthropicTools);
  const mcpTools = useTSSelector(selectMCPTools);
  const geminiBlock = useTSSelector(selectGeminiToolBlock);

  const [strict, setStrict] = useState(true);
  const [format, setFormat] = useState<ExportFormat>('openai');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const findingsByTool = useMemo(() => validateAll(tools, strict), [tools, strict]);
  const selectedFindings = selected ? findingsByTool.get(selected.id) ?? [] : [];

  const allForFormat =
    format === 'anthropic' ? anthropicTools
    : format === 'mcp' ? mcpTools
    : format === 'gemini' ? geminiBlock     // single { functionDeclarations: [...] }
    : openAITools;

  const copy = (text: string) => {
    try { navigator.clipboard?.writeText(text); } catch { /* clipboard unavailable */ }
  };

  const runImport = (mode: 'replace' | 'merge') => {
    try {
      const parsed = parseToolsInput(importText);
      dispatch(mode === 'replace' ? importTools(parsed) : mergeTools(parsed));
      setImportText('');
      setImportError(null);
      setImportOpen(false);
    } catch (e) {
      setImportError((e as Error).message);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 text-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
        <div>
          <h2 className="text-base font-semibold">Tool Schema Builder</h2>
          <p className="text-xs text-neutral-500">{tools.length} tool{tools.length === 1 ? '' : 's'} defined</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-xs text-neutral-600">
            <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} />
            strict (small/open models)
          </label>
          <button className={`${btn} border border-neutral-300 hover:bg-neutral-50`} onClick={() => { setImportOpen((v) => !v); setImportError(null); }}>
            Import JSON
          </button>
          <button className={`${btn} bg-neutral-900 text-white hover:bg-neutral-700`} onClick={() => dispatch(addTool())}>
            + New tool
          </button>
        </div>
      </div>

      {/* Import panel */}
      {importOpen && (
        <div className="rounded border border-neutral-200 bg-neutral-50 p-3">
          <span className={label}>Paste tools JSON (OpenAI / Anthropic / MCP / Gemini)</span>
          <textarea
            className={`${input} mt-1 h-28 resize-y font-mono`}
            value={importText}
            placeholder='[{ "type": "function", "function": { "name": "repo_search", ... } }]'
            onChange={(e) => setImportText(e.target.value)}
          />
          {importError && <p className="mt-1 text-xs text-red-600">{importError}</p>}
          <div className="mt-2 flex gap-1">
            <button className={`${btn} bg-neutral-900 text-white hover:bg-neutral-700`} onClick={() => runImport('replace')}>Replace all</button>
            <button className={`${btn} border border-neutral-300 hover:bg-neutral-50`} onClick={() => runImport('merge')}>Add to set</button>
            <button className={`${btn} ml-auto text-neutral-500 hover:bg-neutral-100`} onClick={() => { setImportOpen(false); setImportError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="grid flex-1 grid-cols-[220px_1fr] gap-3 overflow-hidden">
        {/* Tool list */}
        <aside className="overflow-y-auto rounded border border-neutral-200">
          {tools.length === 0 && (
            <p className="p-3 text-xs text-neutral-400">No tools yet. Click “New tool” or import JSON.</p>
          )}
          {tools.map((t) => {
            const errs = errorCount(findingsByTool.get(t.id) ?? []);
            const active = selected?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => dispatch(selectTool(t.id))}
                className={`flex w-full items-center justify-between border-b border-neutral-100 px-3 py-2 text-left text-sm ${active ? 'bg-neutral-100 font-medium' : 'hover:bg-neutral-50'}`}
              >
                <span className="truncate font-mono">{t.name || '(unnamed)'}</span>
                {errs > 0 && <span className="ml-2 shrink-0 rounded-full bg-red-100 px-1.5 text-xs text-red-700">{errs}</span>}
              </button>
            );
          })}
        </aside>

        {/* Editor */}
        <section className="overflow-y-auto rounded border border-neutral-200 p-3">
          {!selected ? (
            <p className="text-sm text-neutral-400">Select a tool, or create one.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-3">
                  <div>
                    <span className={label}>Name</span>
                    <input
                      className={`${input} font-mono`}
                      value={selected.name}
                      placeholder="repo_search"
                      onChange={(e) => dispatch(updateTool({ id: selected.id, changes: { name: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <span className={label}>Description</span>
                    <textarea
                      className={`${input} h-16 resize-y`}
                      value={selected.description}
                      placeholder="What it does, and when the agent should use it (vs. similar tools)."
                      onChange={(e) => dispatch(updateTool({ id: selected.id, changes: { description: e.target.value } }))}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button className={`${btn} border border-neutral-300 hover:bg-neutral-50`} onClick={() => dispatch(duplicateTool(selected.id))}>Duplicate</button>
                  <button className={`${btn} border border-red-200 text-red-600 hover:bg-red-50`} onClick={() => dispatch(removeTool(selected.id))}>Delete</button>
                </div>
              </div>

              {/* Parameters */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className={label}>Parameters</span>
                  <button className={`${btn} border border-neutral-300 hover:bg-neutral-50`} onClick={() => dispatch(addParam(selected.id))}>+ Parameter</button>
                </div>
                {selected.parameters.length === 0 && <p className="text-xs text-neutral-400">No parameters.</p>}
                <div className="space-y-2">
                  {selected.parameters.map((p) => (
                    <ParamRow
                      key={p.id}
                      p={p}
                      onChange={(changes) => dispatch(updateParam({ toolId: selected.id, paramId: p.id, changes }))}
                      onRemove={() => dispatch(removeParam({ toolId: selected.id, paramId: p.id }))}
                    />
                  ))}
                </div>
              </div>

              {/* Validation */}
              <div>
                <span className={label}>Validation</span>
                {selectedFindings.length === 0 ? (
                  <p className="text-xs text-emerald-600">No issues. This schema is agent-ready.</p>
                ) : (
                  <ul className="space-y-0.5 text-xs">
                    {selectedFindings.map((f, i) => (
                      <li key={i} className={dot[f.level]}>
                        <span className="font-medium uppercase">{f.level}</span> {f.message}
                        {f.path && <span className="text-neutral-400"> ({f.path})</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Export preview */}
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {EXPORT_FORMATS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setFormat(opt.id)}
                        className={`${btn} ${format === opt.id ? 'bg-neutral-900 text-white' : 'border border-neutral-300 hover:bg-neutral-50'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button className={`${btn} border border-neutral-300 hover:bg-neutral-50`} onClick={() => copy(JSON.stringify(compileOne(selected, format), null, 2))}>Copy this</button>
                    <button className={`${btn} border border-neutral-300 hover:bg-neutral-50`} onClick={() => copy(JSON.stringify(allForFormat, null, 2))}>Copy all ({tools.length})</button>
                  </div>
                </div>
                <pre className="max-h-64 overflow-auto rounded bg-neutral-900 p-3 text-xs text-neutral-100">
{JSON.stringify(compileOne(selected, format), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ParamRow({
  p, onChange, onRemove,
}: {
  p: ToolParameter;
  onChange: (changes: Partial<ToolParameter>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded border border-neutral-200 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${input} max-w-[160px] font-mono`}
          value={p.name}
          placeholder="param_name"
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <select
          className={`${input} max-w-[110px]`}
          value={p.type}
          onChange={(e) => onChange({ type: e.target.value as JSONType })}
        >
          {JSON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {p.type === 'array' && (
          <select
            className={`${input} max-w-[110px]`}
            value={p.itemType ?? 'string'}
            onChange={(e) => onChange({ itemType: e.target.value as JSONType })}
          >
            {JSON_TYPES.filter((t) => t !== 'array').map((t) => <option key={t} value={t}>{t}[]</option>)}
          </select>
        )}
        <label className="flex items-center gap-1 text-xs text-neutral-600">
          <input type="checkbox" checked={p.required} onChange={(e) => onChange({ required: e.target.checked })} />
          required
        </label>
        <button className={`${btn} ml-auto text-red-600 hover:bg-red-50`} onClick={onRemove}>Remove</button>
      </div>
      <input
        className={`${input} mt-2`}
        value={p.description}
        placeholder="Description + example value, e.g. “Search text, e.g. 'auth middleware'”"
        onChange={(e) => onChange({ description: e.target.value })}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          className={`${input} flex-1`}
          value={(p.enumValues ?? []).join(', ')}
          placeholder="enum values (comma-separated) — leave blank for free text"
          onChange={(e) => {
            const vals = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
            onChange({ enumValues: vals.length ? vals : undefined });
          }}
        />
        <input
          className={`${input} max-w-[160px]`}
          value={p.defaultValue ?? ''}
          placeholder="default (optional)"
          onChange={(e) => onChange({ defaultValue: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
