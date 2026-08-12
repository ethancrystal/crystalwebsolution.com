// validateToolSchema.ts — live validation for the ToolSchemaBuilder.
//
// Mirrors scripts/validate_tool_schema.py (from the agent-engineering skill) but
// runs in the browser on the UI shape. By construction the editor can't produce
// $ref / oneOf / deep nesting, so this focuses on the issues a human author can
// still create: bad names, missing/oversized descriptions, closed sets left as
// free text, defaults that contradict their enum, and required-flag hygiene.
// `strict` = target small/open models (errors); otherwise those soften to warnings.

import type { ToolSchema } from './types';

export type Level = 'error' | 'warning' | 'info';

export interface Finding {
  level: Level;
  code: string;
  message: string;
  path?: string;
}

const NAME_RE = /^[a-z][a-z0-9_]*$/;
// OpenAI + Anthropic cap tool/function names at 64 chars.
const MAX_NAME_LEN = 64;
// Most providers truncate very long descriptions (~1024 chars is a safe ceiling).
const MAX_DESC_LEN = 1024;
// Large parameter sets degrade tool-call accuracy, especially on small models.
const MANY_PARAMS = 12;

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

  const toolName = tool.name.trim();
  if (!toolName) {
    f.push({ level: 'error', code: 'no_name', message: 'Tool has no name.' });
  } else {
    if (!NAME_RE.test(toolName)) {
      f.push({
        level: 'warning',
        code: 'name_style',
        message: `"${tool.name}": use snake_case, action-oriented (e.g. repo_search).`,
      });
    }
    if (toolName.length > MAX_NAME_LEN) {
      f.push({
        level: hard,
        code: 'name_too_long',
        message: `"${toolName}" is ${toolName.length} chars — OpenAI/Anthropic cap names at ${MAX_NAME_LEN}.`,
      });
    }
  }

  const desc = tool.description.trim();
  if (desc.length < 20) {
    f.push({
      level: 'warning',
      code: 'weak_desc',
      message: 'Description is missing or very short — say what it does and when to use it.',
    });
  } else if (desc.length > MAX_DESC_LEN) {
    f.push({
      level: 'info',
      code: 'desc_too_long',
      message: `Description is ${desc.length} chars — some providers truncate past ~${MAX_DESC_LEN}; tighten it.`,
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

    // enum hygiene
    if (hasEnum && p.type === 'array') {
      f.push({ level: 'warning', code: 'array_enum_misplaced', message: `"${nm}": enum on an array constrains the whole value, not its items — set the item type and list allowed values in the description.`, path });
    }
    if (hasEnum && p.type !== 'string' && p.type !== 'array') {
      f.push({ level: 'info', code: 'enum_non_string', message: `"${nm}": enum values are emitted as strings — for a numeric/boolean closed set keep the type 'string' or make sure the caller coerces.`, path });
    }
    if (hasEnum && p.defaultValue && !p.enumValues!.includes(p.defaultValue)) {
      f.push({ level: 'error', code: 'default_not_in_enum', message: `"${nm}": default "${p.defaultValue}" is not one of its enum values.`, path });
    }

    if (p.required) requiredCount += 1;
  }

  for (const [nm, count] of names) {
    if (count > 1) {
      f.push({ level: 'error', code: 'dup_param', message: `Duplicate parameter name "${nm}".`, path: `parameters.${nm}` });
    }
  }

  if (realParams.length > MANY_PARAMS) {
    f.push({ level: 'info', code: 'many_params', message: `${realParams.length} parameters — large parameter sets lower tool-call accuracy; consider splitting the tool.` });
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
export const warningCount = (f: Finding[]) => f.filter((x) => x.level === 'warning').length;
