// Data-lineage map tooling (docs/data-map/SCHEMA.md and PLAN.md).
//
//   node scripts/data-map.mjs --write   merge docs/data-map/data/*.json, write
//                                       data-map.json and 04-externalities.md,
//                                       print counts and problems
//   node scripts/data-map.mjs --check   exit 1 on validation or coverage
//                                       problems, or when either generated file
//                                       differs from a fresh render
//
// Everything below is exported so tests/data-map.test.mjs can drive it with
// in-memory maps and throwaway directory trees. Plain ESM, node: built-ins only.
//
// Pipeline: loadFragments -> mergeFragments -> validate (the map agrees with
// itself and cites real code) -> coverage (the code has no object the map
// misses) -> render (the generated markdown). No function here touches the
// network or any state outside the files it is told to write.

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = 'docs/data-map/data';
export const JSON_OUTPUT = 'docs/data-map/data-map.json';
export const MARKDOWN_OUTPUT = 'docs/data-map/04-externalities.md';
export const EXPECTED_FRAGMENTS = ['db', 'db-logic', 'server', 'ui', 'external', 'frame'];

// SCHEMA.md "Node types" and "Edge kinds". Keep in step with that file.
export const NODE_TYPES = [
  'table', 'fn', 'trigger', 'bucket', 'realtime', 'cron', 'action', 'route', 'middleware',
  'page', 'component', 'lib', 'email', 'ext', 'env', 'cookie', 'storage', 'param',
  'workflow', 'script', 'singleton', 'input', 'actor', 'event',
];
export const EDGE_KINDS = [
  'submits', 'calls', 'inserts', 'updates', 'deletes', 'upserts', 'reads', 'fires', 'fk',
  'enqueues', 'drains', 'sends', 'broadcasts', 'delivers', 'uploads', 'signs-url',
  'redirects', 'sets', 'gets', 'configures', 'emits', 'writes', 'feeds',
];

// Node types whose id is `type:path` or `type:path#symbol`, so the id itself
// names a file that must exist.
const PATH_NODE_TYPES = new Set([
  'action', 'middleware', 'component', 'lib', 'email', 'workflow', 'script', 'actor',
]);

// Render: edge kinds followed forward from an entry node. `fk` is handled apart
// (only from a delete); `reads`, `gets`, `signs-url` and `configures` point at
// consumers rather than carry an input forward, so they are not followed.
export const FLOW_KINDS = new Set([
  'submits', 'calls', 'inserts', 'updates', 'deletes', 'upserts', 'enqueues', 'drains',
  'sends', 'broadcasts', 'delivers', 'uploads', 'fires', 'redirects', 'sets', 'emits',
  'writes', 'feeds',
]);
export const MAX_DEPTH = 8;

const ENTRY_TYPES = ['action', 'route', 'middleware', 'cron', 'workflow', 'script', 'page', 'component', 'input'];
const ALWAYS_ENTRY_TYPES = new Set(['action', 'route', 'middleware', 'cron', 'workflow', 'script', 'input']);
const UI_TYPES = new Set(['page', 'component']);
const DIRECT_WRITE_KINDS = new Set(['inserts', 'updates', 'deletes', 'upserts', 'uploads', 'enqueues', 'writes']);
const DATA_POINT_TYPES = ['table', 'bucket', 'realtime', 'email', 'ext', 'cookie', 'param', 'storage', 'event', 'singleton', 'actor'];
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const ENTRY_TITLES = {
  action: 'Server actions',
  route: 'Route handlers',
  middleware: 'Middleware',
  cron: 'Schedulers',
  workflow: 'CI workflows',
  script: 'Scripts',
  page: 'Pages that submit or write',
  component: 'Components that submit or write',
  input: 'Browser and environment inputs',
};
const DATA_POINT_TITLES = {
  table: 'Tables',
  bucket: 'Storage buckets',
  realtime: 'Realtime channels',
  email: 'Emails',
  ext: 'External services',
  cookie: 'Cookies',
  param: 'URL parameters',
  storage: 'Browser storage',
  event: 'Analytics events',
  singleton: 'Frame singletons',
  actor: 'Frame actors',
};

const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);
const JS_FILE = /\.(?:js|jsx|mjs|cjs|ts|tsx)$/;

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const toPosix = (value) => value.split(path.sep).join('/');
const prefixOf = (id) => (typeof id === 'string' && id.includes(':') ? id.slice(0, id.indexOf(':')) : '');
const uniqueSorted = (values) => [...new Set(values)].sort(cmp);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------------------
// Load and merge
// ---------------------------------------------------------------------------

/** Read and parse every `*.json` in `dir`, sorted by file name. A missing directory is an empty list. */
export function loadFragments(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const fragments = [];
  for (const name of names.filter((entry) => entry.endsWith('.json')).sort(cmp)) {
    let data;
    try {
      data = JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
    } catch (error) {
      throw new Error(`${name}: invalid JSON (${error.message})`);
    }
    if (!isObject(data)) throw new Error(`${name}: the top level must be a JSON object`);
    fragments.push({ ...data, file: name });
  }
  return fragments;
}

function fragmentName(fragment, index) {
  return fragment?.file ?? fragment?.domain ?? `fragment #${index + 1}`;
}

function arrayField(fragment, key, name) {
  const value = fragment?.[key];
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${name}: "${key}" must be an array`);
  return value;
}

/** Merge fragments into `{ nodes, edges, dropped }`. Throws when one node id is defined twice. */
export function mergeFragments(fragments) {
  const nodes = [];
  const edges = [];
  const dropped = { tables: [], functions: [], triggers: [] };
  const owner = new Map();

  fragments.forEach((fragment, index) => {
    const name = fragmentName(fragment, index);
    for (const node of arrayField(fragment, 'nodes', name)) {
      const id = node?.id;
      if (typeof id === 'string') {
        if (owner.has(id)) {
          const first = owner.get(id);
          throw new Error(
            first === name
              ? `Node id "${id}" is defined twice in ${name}.`
              : `Node id "${id}" is defined in two fragments: ${first} and ${name}. Each node lives in exactly one fragment.`,
          );
        }
        owner.set(id, name);
      }
      nodes.push(node);
    }
    edges.push(...arrayField(fragment, 'edges', name));
    if (fragment?.dropped !== undefined && !isObject(fragment.dropped)) {
      throw new Error(`${name}: "dropped" must be an object with tables, functions and triggers`);
    }
    for (const key of Object.keys(dropped)) {
      const list = fragment?.dropped?.[key];
      if (list === undefined) continue;
      if (!Array.isArray(list)) throw new Error(`${name}: "dropped.${key}" must be an array`);
      dropped[key].push(...list);
    }
  });

  for (const key of Object.keys(dropped)) {
    dropped[key] = uniqueSorted(dropped[key].map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry))));
  }
  return { nodes, edges, dropped };
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

function makeReader(root) {
  const raw = new Map();
  const code = new Map();
  const reader = {
    root,
    resolve(rel) {
      const abs = path.resolve(root, rel);
      const inside = path.relative(root, abs);
      if (inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) return null;
      return abs;
    },
    /** File text, or null when the path is missing, a directory, or outside the root. */
    read(rel) {
      if (raw.has(rel)) return raw.get(rel);
      let text = null;
      const abs = reader.resolve(rel);
      if (abs) {
        try {
          if (statSync(abs).isFile()) text = readFileSync(abs, 'utf8');
        } catch {
          text = null;
        }
      }
      raw.set(rel, text);
      return text;
    },
    /** JavaScript with comments removed, so a mention in a comment is not a use. */
    code(rel) {
      if (!code.has(rel)) code.set(rel, stripJsComments(reader.read(rel) ?? ''));
      return code.get(rel);
    },
  };
  return reader;
}

function listFiles(root, relDir, accept) {
  const found = [];
  const walk = (rel) => {
    let entries;
    try {
      entries = readdirSync(path.join(root, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(childRel);
      else if (entry.isFile() && accept(entry.name, childRel)) found.push(childRel);
    }
  };
  walk(relDir);
  return found.sort(cmp);
}

function jsFilesUnder(root, dirs) {
  return dirs.flatMap((dir) => listFiles(root, dir, (name) => JS_FILE.test(name)));
}

// ---------------------------------------------------------------------------
// Source text helpers: comment stripping and SQL parsing
// ---------------------------------------------------------------------------

// A `/` after one of these characters starts a regular expression, after
// anything else it divides. `<` and `}` are left out on purpose: in JSX they
// open `</tag>` and close `{expr}` far more often than they precede a regex.
const REGEX_PRECEDERS = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', ';', '+', '-', '*', '%', '>', '~', '^']);
const REGEX_KEYWORDS = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'else', 'do', 'new', 'yield', 'await']);

/**
 * Remove `//` and block comments from JavaScript, keeping strings, templates
 * and regular expressions verbatim. Heuristic, not a parser; it errs towards
 * keeping text, and every string state ends at the line break.
 */
export function stripJsComments(source) {
  const n = source.length;
  const interpolations = []; // open `${` depth counters, innermost last
  let out = '';
  let last = '';
  let inTemplate = false;
  let i = 0;

  const emit = (text) => {
    out += text;
    const trimmed = text.trimEnd();
    if (trimmed) last = trimmed[trimmed.length - 1];
  };
  const regexAllowed = () => {
    if (REGEX_PRECEDERS.has(last)) return true;
    if (!/[\w$]/.test(last)) return false;
    const word = /([A-Za-z_$][\w$]*)$/.exec(out.trimEnd().slice(-24));
    return word ? REGEX_KEYWORDS.has(word[1]) : false;
  };

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    if (inTemplate) {
      if (ch === '\\') {
        emit(source.slice(i, i + 2));
        i += 2;
      } else if (ch === '`') {
        inTemplate = false;
        emit(ch);
        i += 1;
      } else if (ch === '$' && next === '{') {
        interpolations.push(0);
        inTemplate = false;
        emit('${');
        i += 2;
      } else {
        out += ch;
        i += 1;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      while (i < n && source[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      const close = source.indexOf('*/', i + 2);
      const stop = close < 0 ? n : close + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && source[j] !== ch && source[j] !== '\n') j += source[j] === '\\' ? 2 : 1;
      if (source[j] === ch) j += 1;
      emit(source.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      emit(ch);
      i += 1;
      continue;
    }
    if (ch === '/' && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < n && source[j] !== '\n') {
        const c = source[j];
        if (c === '\\') {
          j += 2;
          continue;
        }
        if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        else if (c === '/' && !inClass) {
          closed = true;
          j += 1;
          break;
        }
        j += 1;
      }
      if (closed) {
        while (j < n && /[a-z]/i.test(source[j])) j += 1;
        emit(source.slice(i, j));
        last = ')';
        i = j;
        continue;
      }
    }
    if (interpolations.length) {
      const top = interpolations.length - 1;
      if (ch === '{') interpolations[top] += 1;
      else if (ch === '}') {
        if (interpolations[top] === 0) {
          interpolations.pop();
          inTemplate = true;
          emit(ch);
          i += 1;
          continue;
        }
        interpolations[top] -= 1;
      }
    }
    emit(ch);
    i += 1;
  }
  return out;
}

/** Remove `--` and nested block comments from SQL, keeping string, quoted-identifier and dollar-quoted text. */
export function stripSqlComments(sql) {
  const n = sql.length;
  let out = '';
  let i = 0;
  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === '-' && next === '-') {
      while (i < n && sql[i] !== '\n') i += 1;
    } else if (ch === '/' && next === '*') {
      let depth = 1;
      let j = i + 2;
      while (j < n && depth > 0) {
        if (sql[j] === '/' && sql[j + 1] === '*') {
          depth += 1;
          j += 2;
        } else if (sql[j] === '*' && sql[j + 1] === '/') {
          depth -= 1;
          j += 2;
        } else {
          j += 1;
        }
      }
      out += sql.slice(i, j).replace(/[^\n]/g, ' ');
      i = j;
    } else if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === ch && sql[j + 1] === ch) j += 2;
        else if (sql[j] === ch) break;
        else j += 1;
      }
      out += sql.slice(i, j + 1);
      i = j + 1;
    } else if (ch === '$' && !/[\w$]/.test(sql[i - 1] ?? '')) {
      const tag = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 80));
      const close = tag ? sql.indexOf(tag[0], i + tag[0].length) : -1;
      if (tag && close >= 0) {
        out += sql.slice(i, close + tag[0].length);
        i = close + tag[0].length;
      } else {
        out += ch;
        i += 1;
      }
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

// A SQL identifier: double-quoted (with "" escapes) or bare.
const IDENT = String.raw`"(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*`;
const QUALIFIED = String.raw`(?:(${IDENT})\s*\.\s*)?(${IDENT})`;
const TABLE_SQL = new RegExp(String.raw`\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${QUALIFIED}`, 'gi');
const FUNCTION_SQL = new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?function\s+${QUALIFIED}\s*\(`, 'gi');
const TRIGGER_SQL = new RegExp(
  String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+(${IDENT})(?=\s)[^;]*?\bon\s+${QUALIFIED}`,
  'gi',
);

function sqlIdentifier(raw) {
  return raw.startsWith('"') ? raw.slice(1, -1).replace(/""/g, '"') : raw.toLowerCase();
}

/**
 * The objects a migration creates: `public.<table>`, `public|private.<function>`
 * and `<schema>.<table>.<trigger>`. Case-insensitive; tolerates quoted
 * identifiers, any whitespace, and comments. An unqualified name is `public`.
 */
export function parseSql(sql) {
  const text = stripSqlComments(sql);
  const tables = [];
  const functions = [];
  const triggers = [];
  for (const match of text.matchAll(TABLE_SQL)) {
    const schema = match[1] ? sqlIdentifier(match[1]) : 'public';
    if (schema === 'public') tables.push(`public.${sqlIdentifier(match[2])}`);
  }
  for (const match of text.matchAll(FUNCTION_SQL)) {
    const schema = match[1] ? sqlIdentifier(match[1]) : 'public';
    if (schema === 'public' || schema === 'private') functions.push(`${schema}.${sqlIdentifier(match[2])}`);
  }
  for (const match of text.matchAll(TRIGGER_SQL)) {
    const schema = match[2] ? sqlIdentifier(match[2]) : 'public';
    triggers.push(`${schema}.${sqlIdentifier(match[3])}.${sqlIdentifier(match[1])}`);
  }
  return { tables: uniqueSorted(tables), functions: uniqueSorted(functions), triggers: uniqueSorted(triggers) };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

/** Split a manifest `source` into its parts: `path#symbol`, `path:line`, or `path`. */
export function parseSource(source) {
  const hash = source.indexOf('#');
  if (hash >= 0) return { file: source.slice(0, hash), symbol: source.slice(hash + 1).trim() };
  const single = /^(.*):(\d+)$/.exec(source);
  if (single) return { file: single[1], line: Number(single[2]) };
  const range = /^(.*):\d+\s*[-,]\s*\d+$/.exec(source);
  if (range) return { file: range[1], rangeError: true };
  return { file: source };
}

function lineCount(text) {
  const lines = text.split('\n').length;
  return text.endsWith('\n') ? lines - 1 : lines;
}

/** Problems with one `path#symbol` / `path:line` / `path` reference; empty when it holds up. */
function checkReference(reference, reader, label) {
  const parts = parseSource(reference);
  if (!parts.file) return [`${label}: "${reference}" names no file`];
  if (parts.rangeError) return [`${label}: "${reference}" must cite one line (path:line), not a range`];
  if (reader.resolve(parts.file) === null) return [`${label}: "${reference}" points outside the repository`];
  const text = reader.read(parts.file);
  if (text === null) return [`${label}: file "${parts.file}" does not exist (from "${reference}")`];
  if (parts.symbol !== undefined) {
    if (!parts.symbol) return [`${label}: "${reference}" has an empty symbol after #`];
    if (!text.includes(parts.symbol)) return [`${label}: symbol "${parts.symbol}" does not appear in ${parts.file}`];
  }
  if (parts.line !== undefined) {
    const total = lineCount(text);
    if (parts.line < 1 || parts.line > total) {
      return [`${label}: line ${parts.line} is outside ${parts.file} (${total} lines)`];
    }
  }
  return [];
}

function nodeProblems(nodes, reader) {
  const problems = [];
  const seen = new Set();
  nodes.forEach((node, index) => {
    if (!isObject(node)) {
      problems.push(`nodes[${index}]: not an object`);
      return;
    }
    const where = `node ${isText(node.id) ? node.id : `#${index + 1}`}`;
    if (!isText(node.id)) problems.push(`${where}: missing id`);
    if (!isText(node.type)) problems.push(`${where}: missing type`);
    if (isText(node.id)) {
      if (seen.has(node.id)) problems.push(`${where}: id appears more than once`);
      seen.add(node.id);
    }
    if (isText(node.type) && !NODE_TYPES.includes(node.type)) {
      problems.push(`${where}: unknown type "${node.type}" (see SCHEMA.md node types)`);
    }
    if (isText(node.id) && isText(node.type) && NODE_TYPES.includes(node.type)) {
      const prefix = `${node.type}:`;
      if (!node.id.startsWith(prefix) || node.id.length === prefix.length) {
        problems.push(`${where}: id must start with "${prefix}" to match its type`);
      } else if (PATH_NODE_TYPES.has(node.type)) {
        problems.push(...checkReference(node.id.slice(prefix.length), reader, `${where} id`));
      }
    }
  });
  return problems;
}

function edgeProblems(edges, nodeIds, reader) {
  const problems = [];
  const seen = new Set();
  edges.forEach((edge, index) => {
    if (!isObject(edge)) {
      problems.push(`edges[${index}]: not an object`);
      return;
    }
    const where = `edge ${edge.from ?? '?'} -${edge.kind ?? '?'}-> ${edge.to ?? '?'}`;
    for (const field of ['from', 'to', 'kind', 'source']) {
      if (!isText(edge[field])) problems.push(`${where}: missing ${field}`);
    }
    if (isText(edge.kind) && !EDGE_KINDS.includes(edge.kind)) {
      problems.push(`${where}: unknown kind "${edge.kind}" (see SCHEMA.md edge kinds)`);
    }
    for (const end of ['from', 'to']) {
      if (isText(edge[end]) && !nodeIds.has(edge[end])) problems.push(`${where}: ${end} "${edge[end]}" is not a node`);
    }
    if (edge.fields !== undefined && !(Array.isArray(edge.fields) && edge.fields.every((field) => typeof field === 'string'))) {
      problems.push(`${where}: fields must be an array of strings`);
    }
    if (isText(edge.source)) problems.push(...checkReference(edge.source, reader, `${where} source`));
    if (isText(edge.from) && isText(edge.to) && isText(edge.kind) && isText(edge.source)) {
      const key = [edge.from, edge.to, edge.kind, edge.source].join('\u0000');
      if (seen.has(key)) problems.push(`${where}: duplicate edge (same from, to, kind and source)`);
      seen.add(key);
    }
  });
  return problems;
}

function droppedProblems(dropped) {
  if (dropped === undefined) return [];
  if (!isObject(dropped)) return ['dropped: must be an object with tables, functions and triggers'];
  const problems = [];
  for (const [key, list] of Object.entries(dropped)) {
    if (!['tables', 'functions', 'triggers'].includes(key)) problems.push(`dropped: unknown key "${key}"`);
    else if (!(Array.isArray(list) && list.every((entry) => typeof entry === 'string'))) {
      problems.push(`dropped.${key}: must be an array of strings`);
    }
  }
  return problems;
}

/** Check a merged map against SCHEMA.md and the code under `root`. Returns problems; never throws. */
export function validate(map, { root = REPO_ROOT } = {}) {
  try {
    if (!isObject(map)) return ['map: must be an object with nodes and edges'];
    const reader = makeReader(root);
    const problems = [];
    const nodes = Array.isArray(map.nodes) ? map.nodes : [];
    const edges = Array.isArray(map.edges) ? map.edges : [];
    if (map.nodes !== undefined && !Array.isArray(map.nodes)) problems.push('map: nodes must be an array');
    if (map.edges !== undefined && !Array.isArray(map.edges)) problems.push('map: edges must be an array');
    const nodeIds = new Set(nodes.filter((node) => isObject(node) && isText(node.id)).map((node) => node.id));
    problems.push(...nodeProblems(nodes, reader), ...edgeProblems(edges, nodeIds, reader), ...droppedProblems(map.dropped));
    return problems;
  } catch (error) {
    return [`validate: internal error: ${error?.message ?? error}`];
  }
}

// ---------------------------------------------------------------------------
// coverage: every code object has a node
// ---------------------------------------------------------------------------

/** URL a file under app/ serves: strips `app`, the file name, `(group)` and `@slot` segments. */
export function urlFromAppPath(rel) {
  const segments = toPosix(rel).split('/').slice(1, -1).filter((segment) => !/^\(.*\)$/.test(segment) && !segment.startsWith('@'));
  return `/${segments.join('/')}`;
}

/** Exported names in a JS source, with whether each is an async function (null when unknown). */
export function exportedNames(code) {
  const found = new Map();
  const declaredAsync = (local) =>
    new RegExp(String.raw`\basync\s+function\s*\*?\s*${escapeRegExp(local)}\b|\b(?:const|let|var)\s+${escapeRegExp(local)}\s*=\s*async\b`).test(code);
  for (const match of code.matchAll(/\bexport\s+(async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/g)) {
    found.set(match[2], Boolean(match[1]));
  }
  for (const match of code.matchAll(/\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\b)?/g)) {
    found.set(match[1], Boolean(match[2]));
  }
  for (const match of code.matchAll(/\bexport\s*\{([^}]*)\}(\s*from\b)?/g)) {
    for (const part of match[1].split(',')) {
      const [local, exported] = part.trim().split(/\s+as\s+/);
      if (!local) continue;
      found.set((exported ?? local).trim(), match[2] ? null : declaredAsync(local.trim()));
    }
  }
  return [...found].map(([name, isAsync]) => ({ name, isAsync }));
}

// `uses` maps a required node id to where the code needs it: [{ label, file }].
function addUse(uses, id, label, file) {
  if (!uses.has(id)) uses.set(id, []);
  uses.get(id).push({ label, file });
}

function reasonsFrom(uses) {
  const reasons = new Map();
  for (const [id, list] of uses) {
    const files = uniqueSorted(list.map((use) => use.file));
    reasons.set(id, `${list[0].label} in ${files[0]}${files.length > 1 ? ` (+${files.length - 1} more)` : ''}`);
  }
  return reasons;
}

function startsWithUseServer(code) {
  return /^\s*(['"])use server\1\s*;?/.test(code);
}

// Each coverage rule returns the nodes the code requires as a Map of id -> why.

/** Every exported async function in a 'use server' file needs `action:<path>#<name>`. */
export function serverActionNodes(ctx) {
  const required = new Map();
  for (const file of jsFilesUnder(ctx.reader.root, ['app', 'components', 'lib'])) {
    const code = ctx.reader.code(file);
    if (!startsWithUseServer(code)) continue;
    for (const { name, isAsync } of exportedNames(code)) {
      if (isAsync) required.set(`action:${file}#${name}`, `exported server action in ${file}`);
    }
  }
  return required;
}

/** Every exported GET/POST/PUT/PATCH/DELETE in app/.../route.js needs `route:<METHOD> <url>`. */
export function routeNodes(ctx) {
  const required = new Map();
  for (const file of listFiles(ctx.reader.root, 'app', (name) => /^route\.(?:js|mjs|ts)$/.test(name))) {
    const url = urlFromAppPath(file);
    for (const { name } of exportedNames(ctx.reader.code(file))) {
      if (HTTP_METHODS.includes(name)) required.set(`route:${name} ${url}`, `exported ${name} handler in ${file}`);
    }
  }
  return required;
}

/** Every app/.../page.jsx needs `page:<url>`; the root page is `page:/`. */
export function pageNodes(ctx) {
  const required = new Map();
  for (const file of listFiles(ctx.reader.root, 'app', (name) => /^page\.(?:jsx|js)$/.test(name))) {
    required.set(`page:${urlFromAppPath(file)}`, `served by ${file}`);
  }
  return required;
}

function migrationObjects(ctx) {
  if (!ctx.migrations) {
    const found = { tables: new Map(), functions: new Map(), triggers: new Map() };
    const files = listFiles(ctx.reader.root, 'supabase/migrations', (name) => name.endsWith('.sql'));
    for (const file of files) {
      const parsed = parseSql(ctx.reader.read(file) ?? '');
      for (const key of Object.keys(found)) {
        for (const name of parsed[key]) if (!found[key].has(name)) found[key].set(name, file);
      }
    }
    ctx.migrations = found;
  }
  return ctx.migrations;
}

function droppedSet(list, type) {
  return new Set(
    (Array.isArray(list) ? list : [])
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.trim().replace(new RegExp(`^${type}:`), '').replace(/\s*\(.*\)\s*$/, '')),
  );
}

function sqlNodes(ctx, key, type, droppedKey) {
  const dropped = droppedSet(ctx.dropped?.[droppedKey], type);
  const required = new Map();
  for (const [name, file] of migrationObjects(ctx)[key]) {
    if (!dropped.has(name)) {
      required.set(`${type}:${name}`, `created in ${file} (list it under dropped.${droppedKey} if a later migration removed it)`);
    }
  }
  return required;
}

/** Every `create table public.<name>` needs `table:public.<name>` unless dropped. */
export function tableNodes(ctx) {
  return sqlNodes(ctx, 'tables', 'table', 'tables');
}

/** Every `create function public|private.<name>` needs `fn:<schema>.<name>` unless dropped. */
export function functionNodes(ctx) {
  return sqlNodes(ctx, 'functions', 'fn', 'functions');
}

/** Every `create trigger <name> ... on <schema>.<table>` needs `trigger:<schema>.<table>.<name>` unless dropped. */
export function triggerNodes(ctx) {
  return sqlNodes(ctx, 'triggers', 'trigger', 'triggers');
}

/** Names read off `process.env`: `.NAME`, `?.NAME` and `['NAME']`. */
export function envNamesIn(code) {
  const names = [];
  for (const match of code.matchAll(/\bprocess\.env\s*\??\.\s*([A-Za-z_][A-Za-z0-9_]*)/g)) names.push(match[1]);
  for (const match of code.matchAll(/\bprocess\.env\s*\[\s*(['"])([A-Za-z_][A-Za-z0-9_]*)\1\s*\]/g)) names.push(match[2]);
  return names;
}

function envScanFiles(root) {
  const rootFiles = readdirSync(root)
    .filter((name) => /^(?:middleware|next\.config|instrumentation[\w.-]*|sentry\.[\w.-]*\.config)\.(?:js|mjs|cjs|ts)$/.test(name))
    .filter((name) => statSync(path.join(root, name)).isFile());
  return [...jsFilesUnder(root, ['app', 'components', 'lib', 'scripts']), ...rootFiles.sort(cmp)];
}

/** Every `process.env.<NAME>` needs `env:<NAME>`, NODE_ENV included. */
export function envNodes(ctx) {
  const uses = new Map();
  for (const file of envScanFiles(ctx.reader.root)) {
    for (const name of envNamesIn(ctx.reader.code(file))) addUse(uses, `env:${name}`, `process.env.${name}`, file);
  }
  return reasonsFrom(uses);
}

const NATIVE_FROM = /\b(?:Array|Buffer|Object|String|Symbol|Set|Map|WeakSet|WeakMap|Promise|ArrayBuffer|JSON|(?:Big)?(?:Ui|I)nt(?:8|16|32|64)(?:Clamped)?Array|Float(?:32|64)Array)\s*$/;

/** Each `.from('<literal>')` call in app code: a Storage bucket, a native `Array.from`, or a table. */
export function fromCalls(code) {
  const calls = [];
  for (const match of code.matchAll(/\.from\(\s*(['"`])([A-Za-z_][\w-]*)\1/g)) {
    const before = code.slice(Math.max(0, match.index - 60), match.index);
    if (/\.storage\s*$/.test(before)) calls.push({ kind: 'bucket', name: match[2] });
    else if (!NATIVE_FROM.test(before)) calls.push({ kind: 'table', name: match[2] });
  }
  return calls;
}

function appCallNodes(ctx, collect) {
  const uses = new Map();
  for (const file of jsFilesUnder(ctx.reader.root, ['app', 'components', 'lib'])) {
    for (const [id, label] of collect(ctx.reader.code(file))) addUse(uses, id, label, file);
  }
  return reasonsFrom(uses);
}

/** Every `.from('<x>')` needs `table:public.<x>`; `.storage.from('<x>')` needs `bucket:<x>`. */
export function fromNodes(ctx) {
  return appCallNodes(ctx, (code) =>
    fromCalls(code).map(({ kind, name }) =>
      kind === 'bucket' ? [`bucket:${name}`, `.storage.from('${name}')`] : [`table:public.${name}`, `.from('${name}')`],
    ),
  );
}

/** Every `.rpc('<x>')` needs `fn:public.<x>`. */
export function rpcNodes(ctx) {
  return appCallNodes(ctx, (code) =>
    [...code.matchAll(/\.rpc\(\s*(['"`])([A-Za-z_]\w*)\1/g)].map((match) => [`fn:public.${match[2]}`, `.rpc('${match[2]}')`]),
  );
}

/** Code objects the map is missing, one problem per missing node id. Empty when the map covers the repo. */
export function coverage(map, { root = REPO_ROOT } = {}) {
  const ids = new Set((Array.isArray(map?.nodes) ? map.nodes : []).filter((node) => isObject(node) && isText(node.id)).map((node) => node.id));
  const ctx = { reader: makeReader(root), dropped: map?.dropped ?? {}, migrations: null };
  const rules = [
    serverActionNodes, routeNodes, pageNodes, tableNodes, functionNodes,
    triggerNodes, envNodes, fromNodes, rpcNodes,
  ];
  const missing = new Map();
  for (const rule of rules) {
    for (const [id, why] of [...rule(ctx)].sort((a, b) => cmp(a[0], b[0]))) {
      if (ids.has(id)) continue;
      missing.set(id, [...(missing.get(id) ?? []), why]);
    }
  }
  return [...missing].map(([id, reasons]) => `missing node ${id}: ${reasons.join('; ')}`);
}

// ---------------------------------------------------------------------------
// Graph traversal
// ---------------------------------------------------------------------------

function compareEdges(a, b) {
  return cmp(a.from, b.from) || cmp(a.to, b.to) || cmp(a.kind, b.kind) || cmp(a.source ?? '', b.source ?? '');
}

export function buildGraph(map) {
  const nodes = new Map();
  for (const node of Array.isArray(map?.nodes) ? map.nodes : []) {
    if (isObject(node) && isText(node.id)) nodes.set(node.id, node);
  }
  const edges = (Array.isArray(map?.edges) ? map.edges : [])
    .filter((edge) => isObject(edge) && isText(edge.from) && isText(edge.to) && isText(edge.kind))
    .sort(compareEdges);
  const out = new Map();
  for (const edge of edges) {
    if (!out.has(edge.from)) out.set(edge.from, []);
    out.get(edge.from).push(edge);
  }
  return { nodes, edges, out, typeOf: (id) => nodes.get(id)?.type ?? prefixOf(id) };
}

const fieldsOf = (edge) => (Array.isArray(edge.fields) ? edge.fields.filter((field) => typeof field === 'string') : []);

// The SQL event a write edge causes on its target table.
function eventsOf(kind) {
  if (kind === 'inserts' || kind === 'enqueues') return ['insert'];
  if (kind === 'updates') return ['update'];
  if (kind === 'upserts') return ['insert', 'update'];
  if (kind === 'deletes') return ['delete'];
  return [null];
}

/**
 * Does a `fires` edge's `when` ("AFTER UPDATE OF status") allow the write
 * that reached the table? A `when` naming no event always allows it, and
 * `UPDATE OF <columns>` only blocks when the writer lists the columns it sets.
 */
export function triggerWhenAllows(when, event, fields = []) {
  const text = String(when ?? '').toLowerCase();
  const named = ['insert', 'update', 'delete'].filter((name) => new RegExp(`\\b${name}\\b`).test(text));
  if (named.length === 0 || event === null) return true;
  if (!named.includes(event)) return false;
  if (event === 'update' && fields.length > 0 && !fields.includes('*')) {
    const columns = /\bupdate\s+of\s+([^\n]*?)(?:\s+or\b|\s+on\b|$)/.exec(text);
    if (columns) {
      const listed = columns[1].split(',').map((column) => column.trim().replace(/^"|"$/g, ''));
      return fields.some((field) => listed.includes(field.toLowerCase()));
    }
  }
  return true;
}

// Follow one edge from a visited state. Returns { effect, next } or null.
function step(edge, state) {
  const fields = fieldsOf(edge);
  if (edge.kind === 'fk') {
    if (state.event !== 'delete') return null;
    const onDelete = String(edge.attrs?.onDelete ?? '').toLowerCase().replace(/[\s_-]+/g, ' ').trim();
    if (onDelete === 'restrict' || onDelete === 'no action') return null;
    if (onDelete === 'set null' || onDelete === 'set default') {
      return { effect: 'set-null', next: [{ id: edge.to, event: 'update', fields: [] }] };
    }
    return { effect: 'cascade', next: [{ id: edge.to, event: 'delete', fields: [] }] };
  }
  if (!FLOW_KINDS.has(edge.kind)) return null;
  if (edge.kind === 'fires' && !triggerWhenAllows(edge.when, state.event, state.fields)) return null;
  return { effect: edge.kind, next: eventsOf(edge.kind).map((event) => ({ id: edge.to, event, fields })) };
}

const stateKey = (state) => `${state.id}\u0000${state.event ?? ''}\u0000${state.event === 'update' ? state.fields.join(',') : ''}`;

/**
 * Everything reachable forward from `startId`, breadth first, at most
 * `maxDepth` edges deep. Returns `{ depths, edges }`: the depth each node was
 * first reached at (start included, at 0) and the edges followed, each with its
 * effect on the target (the edge kind, or `cascade` / `set-null` for foreign
 * keys). Foreign keys are followed only from a node reached by a delete, and
 * only where on delete cascades or resets. A page or component reached partway
 * is a stop, not a pass-through: its own forms are separate entry nodes.
 */
export function traverse(graph, startId, { maxDepth = MAX_DEPTH } = {}) {
  const depths = new Map([[startId, 0]]);
  const followed = new Map();
  const start = { id: startId, event: null, fields: [] };
  const seen = new Set([stateKey(start)]);
  let frontier = [start];
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
    const next = [];
    for (const state of frontier) {
      if (depth > 0 && UI_TYPES.has(graph.typeOf(state.id))) continue;
      for (const edge of graph.out.get(state.id) ?? []) {
        const taken = step(edge, state);
        if (!taken) continue;
        followed.set(edge, taken.effect);
        for (const target of taken.next) {
          if (!depths.has(target.id)) depths.set(target.id, depth + 1);
          const key = stateKey(target);
          if (seen.has(key)) continue;
          seen.add(key);
          next.push(target);
        }
      }
    }
    frontier = next;
  }
  return { depths, edges: [...followed].map(([edge, effect]) => ({ edge, effect })) };
}

/** Entry nodes: where data enters. UI nodes only count when they submit or write directly. */
export function entryNodes(graph) {
  return [...graph.nodes.values()]
    .filter((node) => {
      if (ALWAYS_ENTRY_TYPES.has(node.type)) return true;
      if (!UI_TYPES.has(node.type)) return false;
      return (graph.out.get(node.id) ?? []).some((edge) => edge.kind === 'submits' || DIRECT_WRITE_KINDS.has(edge.kind));
    })
    .sort((a, b) => cmp(a.id, b.id));
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

const code = (text) => `\`${String(text).replace(/`/g, "'")}\``;
const EFFECT_ORDER = ['inserts', 'upserts', 'updates', 'enqueues', 'deletes', 'cascade', 'set-null'];
const EFFECT_LABEL = { cascade: 'deleted by fk cascade', 'set-null': 'reset by fk (set null or default)' };

function describeEffects(arrivals) {
  const byEffect = new Map();
  for (const { edge, effect } of arrivals) {
    if (!byEffect.has(effect)) byEffect.set(effect, new Set());
    for (const field of fieldsOf(edge)) byEffect.get(effect).add(field);
  }
  const order = (effect) => (EFFECT_ORDER.includes(effect) ? EFFECT_ORDER.indexOf(effect) : EFFECT_ORDER.length);
  return [...byEffect]
    .sort((a, b) => order(a[0]) - order(b[0]) || cmp(a[0], b[0]))
    .map(([effect, fields]) => {
      const label = EFFECT_LABEL[effect] ?? effect;
      return fields.size ? `${label} ${[...fields].sort(cmp).map(code).join(', ')}` : label;
    })
    .join('; ');
}

function reachOf(graph, entry) {
  const { depths, edges } = traverse(graph, entry.id);
  const into = new Map();
  for (const arrival of edges) {
    if (!into.has(arrival.edge.to)) into.set(arrival.edge.to, []);
    into.get(arrival.edge.to).push(arrival);
  }
  return { depths, into };
}

function groupReached(graph, entryId, reach) {
  const groups = { dataPoints: new Map(), screens: [], code: [] };
  for (const id of [...reach.depths.keys()].sort(cmp)) {
    if (id === entryId) continue;
    const type = graph.typeOf(id);
    if (DATA_POINT_TYPES.includes(type)) {
      if (!groups.dataPoints.has(type)) groups.dataPoints.set(type, []);
      groups.dataPoints.get(type).push(id);
    } else if (UI_TYPES.has(type)) groups.screens.push(id);
    else groups.code.push(id);
  }
  return groups;
}

function renderEntry(graph, entry, reach) {
  const lines = [`#### ${code(entry.id)}`, ''];
  const groups = groupReached(graph, entry.id, reach);
  const sections = [];
  for (const type of DATA_POINT_TYPES) {
    const ids = groups.dataPoints.get(type);
    if (!ids) continue;
    sections.push(`- ${DATA_POINT_TITLES[type]}`);
    for (const id of ids) {
      const effects = describeEffects(reach.into.get(id) ?? []);
      sections.push(`  - ${code(id)}${effects ? `: ${effects}` : ''}`);
    }
  }
  if (groups.screens.length) sections.push(`- Screens and components reached: ${groups.screens.map(code).join(', ')}`);
  if (groups.code.length) sections.push(`- Code on the way: ${groups.code.map(code).join(', ')}`);
  lines.push(...(sections.length ? sections : ['- Reaches nothing else in the map.']), '');
  return lines;
}

function renderInverse(graph, reaches) {
  const lines = [];
  const points = [...graph.nodes.values()].filter((node) => DATA_POINT_TYPES.includes(node.type));
  let unreached = 0;
  for (const type of DATA_POINT_TYPES) {
    const ofType = points.filter((node) => node.type === type).sort((a, b) => cmp(a.id, b.id));
    if (!ofType.length) continue;
    lines.push(`### ${DATA_POINT_TITLES[type]}`, '');
    for (const point of ofType) {
      lines.push(`#### ${code(point.id)}`, '');
      const rows = [];
      for (const [entryId, reach] of reaches) {
        const arrivals = reach.into.get(point.id);
        if (!arrivals || entryId === point.id) continue;
        const byWriter = new Map();
        for (const arrival of arrivals) {
          if (!byWriter.has(arrival.edge.from)) byWriter.set(arrival.edge.from, []);
          byWriter.get(arrival.edge.from).push(arrival);
        }
        for (const [writer, writes] of byWriter) {
          const via = uniqueSorted(writes.map(({ edge }) => edge.via).filter((value) => typeof value === 'string' && value));
          const effects = describeEffects(writes);
          const direct = writer === entryId;
          rows.push({
            order: `${entryId}\u0000${direct ? '' : writer}`,
            text: `- ${code(entryId)}: ${direct ? 'directly' : `by ${code(writer)}`}${effects ? `: ${effects}` : ''}${via.length ? ` [${via.join(', ')}]` : ''}`,
          });
        }
      }
      rows.sort((a, b) => cmp(a.order, b.order));
      if (!rows.length) unreached += 1;
      lines.push(...(rows.length ? rows.map((row) => row.text) : ['- No entry node reaches this.']), '');
    }
  }
  return { lines, unreached, total: points.length };
}

/** Markdown for docs/data-map/04-externalities.md. Deterministic: same map in any order, same text out. */
export function render(map) {
  const graph = buildGraph(map);
  const entries = entryNodes(graph);
  const reaches = new Map(entries.map((entry) => [entry.id, reachOf(graph, entry)]));
  const inverse = renderInverse(graph, reaches);

  const lines = [
    '# 04. Externalities: what each input reaches',
    '',
    '<!-- Generated by `node scripts/data-map.mjs --write` from docs/data-map/data/*.json. Do not edit by hand. -->',
    '',
    'This file is generated, not hand-edited. To change it, fix the manifest fragments in `docs/data-map/data/`',
    'and run `node scripts/data-map.mjs --write`. `pnpm test` fails when it is stale.',
    '',
    '## How to read this',
    '',
    '- An **entry node** is where data enters the system: a server action, route handler, middleware, scheduler, CI workflow, script,',
    '  or browser input, plus any page or component that submits a form or writes to a table, bucket or singleton directly.',
    '- **Part 1** follows edges forward from each entry node (`submits`, `calls`, `inserts`, `updates`, `deletes`, `upserts`, `enqueues`, `drains`,',
    '  `sends`, `broadcasts`, `delivers`, `uploads`, `fires`, `redirects`, `sets`, `emits`, `writes`, `feeds`), at most 8 edges deep, and lists',
    '  the data points it reaches. Written columns appear where an edge records them.',
    '- Foreign keys count only from a delete: deleting a parent reaches a child where `on delete` cascades or resets the column.',
    '- A trigger counts only when its `when` names the kind of write that reached the table (`UPDATE OF col` also needs a written column in common',
    '  when the writer lists its columns). A `when` that names no event always counts.',
    '- A page or component reached partway is shown as a stop and not followed further: its own forms are separate entry nodes.',
    '- **Part 2** inverts Part 1: for each data point, the entry nodes that reach it and the direct writer. A bracket holds who performs the',
    '  write (`user` is subject to RLS, `service_role` and `definer` are not).',
    '- Reaching a data point means it can be reached, not that every call does: conditions live on the edges in `data-map.json`.',
    '',
    `Counts: ${entries.length} entry nodes, ${inverse.total} data points, ${inverse.unreached} data points no entry node reaches.`,
    '',
    '## Part 1: What each input reaches',
    '',
  ];

  for (const type of ENTRY_TYPES) {
    const ofType = entries.filter((entry) => entry.type === type);
    if (!ofType.length) continue;
    lines.push(`### ${ENTRY_TITLES[type]}`, '');
    for (const entry of ofType) lines.push(...renderEntry(graph, entry, reaches.get(entry.id)));
  }

  lines.push('## Part 2: What reaches each data point', '', ...inverse.lines);
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

// ---------------------------------------------------------------------------
// Outputs and CLI
// ---------------------------------------------------------------------------

function sortedDropped(dropped) {
  return {
    tables: uniqueSorted(dropped?.tables ?? []),
    functions: uniqueSorted(dropped?.functions ?? []),
    triggers: uniqueSorted(dropped?.triggers ?? []),
  };
}

/** data-map.json text: nodes sorted by id, edges by from, to, kind, source. */
export function renderJson(map) {
  const nodes = [...(map.nodes ?? [])].sort((a, b) => cmp(a?.id ?? '', b?.id ?? ''));
  const edges = [...(map.edges ?? [])].sort(compareEdges);
  return `${JSON.stringify({ nodes, edges, dropped: sortedDropped(map.dropped) }, null, 2)}\n`;
}

/** Load, merge and render without writing. */
export function buildOutputs(root = REPO_ROOT) {
  const fragments = loadFragments(path.join(root, DATA_DIR));
  const map = mergeFragments(fragments);
  return { fragments, map, json: renderJson(map), markdown: render(map) };
}

/** Write data-map.json and 04-externalities.md under `root`. */
export function writeOutputs(root = REPO_ROOT) {
  const outputs = buildOutputs(root);
  mkdirSync(path.dirname(path.join(root, JSON_OUTPUT)), { recursive: true });
  writeFileSync(path.join(root, JSON_OUTPUT), outputs.json);
  writeFileSync(path.join(root, MARKDOWN_OUTPUT), outputs.markdown);
  return outputs;
}

const normalizeNewlines = (text) => text.replace(/\r\n/g, '\n');

/** Everything `--check` enforces, as a list of problems. */
export function check(root = REPO_ROOT) {
  const { fragments, map, json, markdown } = buildOutputs(root);
  const problems = [];
  const have = new Set(fragments.map((fragment) => fragment.file));
  for (const name of EXPECTED_FRAGMENTS) {
    if (!have.has(`${name}.json`)) problems.push(`missing fragment ${DATA_DIR}/${name}.json`);
  }
  problems.push(...validate(map, { root }), ...coverage(map, { root }));
  for (const [file, fresh] of [[JSON_OUTPUT, json], [MARKDOWN_OUTPUT, markdown]]) {
    let committed = null;
    try {
      committed = readFileSync(path.join(root, file), 'utf8');
    } catch {
      problems.push(`${file} is missing; run \`node scripts/data-map.mjs --write\``);
      continue;
    }
    if (normalizeNewlines(committed) !== fresh) {
      problems.push(`${file} is out of date; run \`node scripts/data-map.mjs --write\` and commit the result`);
    }
  }
  return problems;
}

function printProblems(problems) {
  const shown = problems.slice(0, 200);
  for (const problem of shown) console.log(`  - ${problem}`);
  if (problems.length > shown.length) console.log(`  ... and ${problems.length - shown.length} more`);
}

function runWrite(root) {
  const { fragments, map } = writeOutputs(root);
  console.log(`Merged ${fragments.length} fragments: ${map.nodes.length} nodes, ${map.edges.length} edges.`);
  console.log(`Wrote ${JSON_OUTPUT} and ${MARKDOWN_OUTPUT}.`);
  const have = new Set(fragments.map((fragment) => fragment.file));
  const missing = EXPECTED_FRAGMENTS.filter((name) => !have.has(`${name}.json`));
  if (missing.length) console.log(`Missing fragments: ${missing.join(', ')}`);
  const problems = [...validate(map, { root }), ...coverage(map, { root })];
  console.log(problems.length ? `${problems.length} problems:` : 'No validation or coverage problems.');
  printProblems(problems);
  return 0;
}

function runCheck(root) {
  const problems = check(root);
  if (!problems.length) {
    console.log('Data map is valid, covers the code, and the generated files are current.');
    return 0;
  }
  console.log(`Data map check failed with ${problems.length} problems:`);
  printProblems(problems);
  return 1;
}

export function main(argv, root = REPO_ROOT) {
  try {
    if (argv.includes('--write')) return runWrite(root);
    if (argv.includes('--check')) return runCheck(root);
    console.error('Usage: node scripts/data-map.mjs --write | --check');
    return 2;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
