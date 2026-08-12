// validateToolSchema.ts — live validation for the ToolSchemaBuilder.
//
// Mirrors scripts/validate_tool_schema.py (from the llm-agent-engineering skill) but
// runs in the browser on the UI shape. By construction the editor can't produce
// $ref / oneOf / deep nesting, so this focuses on the issues a human author can
// still create: bad names, missing descriptions, closed sets left as free text,
// and required-flag hygiene. `strict` = target small/open models (errors);
// otherwise those soften to warnings.

import type { ToolSchema } from './types';

export type Level = 'error' | 'warning' | 'info';

export interface Finding {
  level: Level;
  code: string;
  message: string;
  path?: string;
}

const NAME_RE = /^[a-z][a-z0-9_]*$/;

const ENUM_CANDIDATE_NAMES = new Set([
  'mode', 'type', 'status', 'format', 'order', 'direction', 'sort', 'kind',
  'state', 'severity', 'role', 'method', 'strategy', 'action', 'operation',
  'level', 'scope', 'visibility', 'category', 'priority',
]);
const FREE_TEXT_NAMES = new Set([
  'query', 'text', 'content', 'message', 'prompt', 'path', 'url', 'name',
  'title', 'description', 'pattern', 'body', 'code', 'input', 'value', 'q',
]);

export function validateTool(tool: ToolSchema, strict = true): Finding[] {
  const f: Finding[] = [];
  const hard: Level = strict ? 'error' : 'warning';

  if (!tool.name.trim()) {
    f.push({ level: 'error', code: 'no_name', message: 'Tool has no name.' });
  } else if (!NAME_RE.test(tool.name.trim())) {
    f.push({
      level: 'warning',
      code: 'name_style',
      message: `"${tool.name}": use snake_case, action-oriented (e.g. repo_search).`,
    });
  }

  if (tool.description.trim().length < 20) {
    f.push({
      level: 'warning',
      code: 'weak_desc',
      message: 'Description is missing or very short — say what it does and when to use it.',
    });
  }

  const names = new Map<string, number>();
  let requiredCount = 0;
  const realParams = tool.parameters.filter((p) => p.name.trim());

  for (const p of tool.parameters) {
    const path = `parameters.${p.name || '(unnamed)'}`;
    const nm = p.name.trim();
    if (!nm) {
      f.push({ level: 'warning', code: 'unnamed_param', message: 'A parameter has no name (it will be dropped on export).', path });
      continue;
    }
    if (!NAME_RE.test(nm)) {
      f.push({ level: 'warning', code: 'param_name_style', message: `"${nm}": prefer snake_case.`, path });
    }
    names.set(nm, (names.get(nm) ?? 0) + 1);

    if (!p.description.trim()) {
      f.push({ level: hard, code: 'no_param_desc', message: `"${nm}" has no description — describe it and give an example value.`, path });
    }
    const low = nm.toLowerCase();
    const hasEnum = !!(p.enumValues && p.enumValues.length);
    if (!hasEnum && p.type === 'string' && ENUM_CANDIDATE_NAMES.has(low) && !FREE_TEXT_NAMES.has(low)) {
      f.push({ level: 'warning', code: 'enum_candidate', message: `"${nm}" looks like a closed set — add enum values instead of free text.`, path });
    }
    if (p.type === 'array' && !p.itemType) {
      f.push({ level: 'warning', code: 'array_no_items', message: `"${nm}" is an array with no item type — set one.`, path });
    }
    if (p.required) requiredCount += 1;
  }

  for (const [nm, count] of names) {
    if (count > 1) {
      f.push({ level: 'error', code: 'dup_param', message: `Duplicate parameter name "${nm}".`, path: `parameters.${nm}` });
    }
  }

  if (realParams.length > 1 && requiredCount === realParams.length) {
    f.push({ level: 'warning', code: 'all_required', message: 'Every parameter is required — usually too broad; give defaults where you can.' });
  }
  if (realParams.length > 0 && requiredCount === 0) {
    f.push({ level: 'warning', code: 'no_required', message: 'No parameter is required — is that intentional?' });
  }

  return f;
}

/** Validate the whole set: per-tool issues plus cross-tool ones. */
export function validateAll(tools: ToolSchema[], strict = true, maxTools = 15): Map<string, Finding[]> {
  const byTool = new Map<string, Finding[]>();
  const seen = new Map<string, number>();

  for (const t of tools) {
    byTool.set(t.id, validateTool(t, strict));
    const nm = t.name.trim();
    if (nm) seen.set(nm, (seen.get(nm) ?? 0) + 1);
  }
  for (const t of tools) {
    const nm = t.name.trim();
    if (nm && (seen.get(nm) ?? 0) > 1) {
      byTool.get(t.id)!.push({ level: 'error', code: 'dup_tool', message: `Another tool is also named "${nm}".` });
    }
  }
  if (tools.length > maxTools) {
    // surface against the first tool as a set-level note
    const first = tools[0];
    byTool.get(first.id)?.push({
      level: 'warning',
      code: 'too_many_tools',
      message: `${tools.length} tools defined (> ${maxTools}) — small models pick worse with large tool sets; hide or group rarely-used ones.`,
    });
  }
  return byTool;
}

export const errorCount = (f: Finding[]) => f.filter((x) => x.level === 'error').length;
