// Tests for scripts/data-map.mjs, the data-lineage map tooling described in
// docs/data-map/SCHEMA.md.
//
// Part 1 drives every rule with small in-memory maps and throwaway directory
// trees. Part 2 ("the committed data map") is the drift gate: it runs the same
// loader, validator, coverage check and renderer over the real repo, so a new
// table, action, route, page, env var or migration with no map entry fails
// `pnpm test`, and so does a data-map.json or 04-externalities.md that no
// longer matches the fragments in docs/data-map/data/.

import test, { after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  EDGE_KINDS,
  EXPECTED_FRAGMENTS,
  JSON_OUTPUT,
  MARKDOWN_OUTPUT,
  NODE_TYPES,
  REPO_ROOT,
  buildGraph,
  buildOutputs,
  check,
  coverage,
  entryNodes,
  envNamesIn,
  exportedNames,
  fromCalls,
  loadFragments,
  main,
  mergeFragments,
  parseSource,
  parseSql,
  render,
  renderJson,
  stripJsComments,
  stripSqlComments,
  traverse,
  triggerWhenAllows,
  urlFromAppPath,
  validate,
  writeOutputs,
} from '../scripts/data-map.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const tempRoots = [];
after(() => {
  for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway directory tree: { 'relative/path': 'file text' }. */
function makeTree(files = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'data-map-test-'));
  tempRoots.push(root);
  for (const [rel, text] of Object.entries(files)) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, text);
  }
  return root;
}

const typeOf = (id) => id.slice(0, id.indexOf(':'));
const node = (id, extra = {}) => ({ id, type: typeOf(id), ...extra });
const edge = (from, to, kind, extra = {}) => ({ from, to, kind, source: 'src/file.js', ...extra });

/** A map whose nodes are inferred from the edge endpoints plus any extra ids. */
function mapOf(edges, extraIds = [], dropped = {}) {
  const ids = new Set(extraIds);
  for (const { from, to } of edges) ids.add(from).add(to);
  return { nodes: [...ids].map((id) => node(id)), edges, dropped };
}

const reachedIds = (map, start, options) => {
  const { depths } = traverse(buildGraph(map), start, options);
  depths.delete(start);
  return [...depths.keys()].sort();
};

const FULL = (problems) => problems.join('\n');
const idOfProblem = (problem) => /^missing node (.+?): /.exec(problem)?.[1];

// ---------------------------------------------------------------------------
// loadFragments and mergeFragments
// ---------------------------------------------------------------------------

test('loadFragments reads every .json in name order and ignores other files', () => {
  const root = makeTree({
    'data/b.json': JSON.stringify({ domain: 'b', nodes: [], edges: [] }),
    'data/a.json': JSON.stringify({ domain: 'a', nodes: [], edges: [] }),
    'data/notes.txt': 'not a fragment',
  });
  const fragments = loadFragments(path.join(root, 'data'));
  assert.deepEqual(fragments.map((fragment) => fragment.file), ['a.json', 'b.json']);
  assert.equal(fragments[0].domain, 'a');
});

test('loadFragments names the file when the JSON is bad or not an object', () => {
  const bad = makeTree({ 'data/broken.json': '{ "nodes": [ ' });
  assert.throws(() => loadFragments(path.join(bad, 'data')), /broken\.json: invalid JSON/);
  const list = makeTree({ 'data/list.json': '[]' });
  assert.throws(() => loadFragments(path.join(list, 'data')), /list\.json: the top level must be a JSON object/);
});

test('loadFragments treats a missing directory as no fragments', () => {
  assert.deepEqual(loadFragments(path.join(makeTree(), 'absent')), []);
});

test('mergeFragments combines nodes, edges and dropped lists from every fragment', () => {
  const merged = mergeFragments([
    { file: 'db.json', nodes: [node('table:public.a')], edges: [edge('table:public.a', 'table:public.b', 'fk')], dropped: { tables: ['public.old'] } },
    { file: 'server.json', nodes: [node('route:GET /x')], dropped: { tables: ['public.old', 'public.older'], functions: ['public.f'] } },
    { file: 'empty.json' },
  ]);
  assert.deepEqual(merged.nodes.map((entry) => entry.id), ['table:public.a', 'route:GET /x']);
  assert.equal(merged.edges.length, 1);
  assert.deepEqual(merged.dropped, { tables: ['public.old', 'public.older'], functions: ['public.f'], triggers: [] });
});

test('mergeFragments errors on a node id defined in two fragments and names both', () => {
  assert.throws(
    () =>
      mergeFragments([
        { file: 'db.json', nodes: [node('table:public.a')] },
        { file: 'ui.json', nodes: [node('table:public.a')] },
      ]),
    (error) => /table:public\.a/.test(error.message) && /db\.json/.test(error.message) && /ui\.json/.test(error.message),
  );
});

test('mergeFragments errors on a node id repeated inside one fragment, and on a malformed fragment', () => {
  assert.throws(() => mergeFragments([{ file: 'db.json', nodes: [node('table:public.a'), node('table:public.a')] }]), /defined twice in db\.json/);
  assert.throws(() => mergeFragments([{ file: 'db.json', nodes: {} }]), /db\.json: "nodes" must be an array/);
  assert.throws(() => mergeFragments([{ file: 'db.json', dropped: { tables: 'public.a' } }]), /dropped\.tables" must be an array/);
});

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

const VALIDATE_TREE = {
  'src/file.js': 'export function realSymbol() {}\nconst second = 2;\nconst third = 3;\n',
  'db/0001_init.sql': 'create table public.t (id int);\nselect 1;\n',
};

function validMap() {
  return {
    nodes: [
      node('table:public.t'),
      node('fn:public.f'),
      node('action:src/file.js#realSymbol'),
      node('component:src/file.js'),
    ],
    edges: [
      edge('action:src/file.js#realSymbol', 'fn:public.f', 'calls', { source: 'src/file.js#realSymbol' }),
      edge('fn:public.f', 'table:public.t', 'inserts', { source: 'db/0001_init.sql:2' }),
      edge('component:src/file.js', 'action:src/file.js#realSymbol', 'submits', { source: 'src/file.js' }),
    ],
  };
}

function validateWith(change) {
  const root = makeTree(VALIDATE_TREE);
  const map = validMap();
  change(map);
  return validate(map, { root });
}

const hasProblem = (problems, pattern) => problems.some((problem) => pattern.test(problem));

test('validate accepts a consistent map', () => {
  assert.deepEqual(validate(validMap(), { root: makeTree(VALIDATE_TREE) }), []);
});

test('validate requires a node id and type', () => {
  const problems = validateWith((map) => map.nodes.push({ type: 'table' }, { id: 'table:public.x' }));
  assert.ok(hasProblem(problems, /missing id/), FULL(problems));
  assert.ok(hasProblem(problems, /node table:public\.x: missing type/), FULL(problems));
});

test('validate requires an id prefix that matches the type, and a known type', () => {
  const problems = validateWith((map) => map.nodes.push({ id: 'fn:public.g', type: 'table' }, { id: 'table:', type: 'table' }, { id: 'widget:x', type: 'widget' }));
  assert.ok(hasProblem(problems, /node fn:public\.g: id must start with "table:"/), FULL(problems));
  assert.ok(hasProblem(problems, /node table:: id must start with "table:"/), FULL(problems));
  assert.ok(hasProblem(problems, /unknown type "widget"/), FULL(problems));
});

test('validate accepts every type and edge kind listed in SCHEMA.md and nothing else', () => {
  assert.equal(NODE_TYPES.length, 24);
  assert.equal(EDGE_KINDS.length, 23);
  for (const type of ['table', 'fn', 'trigger', 'bucket', 'realtime', 'cron', 'ext', 'env', 'cookie', 'storage', 'param', 'singleton', 'input', 'event']) {
    assert.ok(NODE_TYPES.includes(type), type);
  }
  const problems = validateWith((map) => map.edges.push(edge('fn:public.f', 'table:public.t', 'mutates')));
  assert.ok(hasProblem(problems, /unknown kind "mutates"/), FULL(problems));
});

test('validate requires from, to, kind and source on every edge', () => {
  const problems = validateWith((map) => map.edges.push({ from: 'fn:public.f', to: 'table:public.t' }, { kind: 'calls' }));
  for (const field of ['kind', 'source', 'from', 'to']) {
    assert.ok(hasProblem(problems, new RegExp(`missing ${field}`)), `${field}: ${FULL(problems)}`);
  }
});

test('validate requires every edge endpoint to be a node', () => {
  const problems = validateWith((map) => map.edges.push(edge('fn:public.ghost', 'table:public.t', 'inserts'), edge('fn:public.f', 'table:public.ghost', 'inserts')));
  assert.ok(hasProblem(problems, /from "fn:public\.ghost" is not a node/), FULL(problems));
  assert.ok(hasProblem(problems, /to "table:public\.ghost" is not a node/), FULL(problems));
});

test('validate checks that a source file exists under the root', () => {
  const problems = validateWith((map) => {
    map.edges.push(edge('fn:public.f', 'table:public.t', 'updates', { source: 'src/missing.js#thing' }));
    map.edges.push(edge('fn:public.f', 'table:public.t', 'deletes', { source: '../outside.js' }));
    map.edges.push(edge('fn:public.f', 'table:public.t', 'upserts', { source: 'src' }));
  });
  assert.ok(hasProblem(problems, /file "src\/missing\.js" does not exist/), FULL(problems));
  assert.ok(hasProblem(problems, /points outside the repository/), FULL(problems));
  assert.ok(hasProblem(problems, /file "src" does not exist/), 'a directory is not a source file');
});

test('validate checks that a path#symbol source names text that is in the file', () => {
  const problems = validateWith((map) => {
    map.edges.push(edge('fn:public.f', 'table:public.t', 'updates', { source: 'src/file.js#notThere' }));
    map.edges.push(edge('fn:public.f', 'table:public.t', 'deletes', { source: 'src/file.js#' }));
  });
  assert.ok(hasProblem(problems, /symbol "notThere" does not appear in src\/file\.js/), FULL(problems));
  assert.ok(hasProblem(problems, /empty symbol/), FULL(problems));
});

test('validate checks that a path:line source is within the file', () => {
  const problems = validateWith((map) => {
    map.edges.push(edge('fn:public.f', 'table:public.t', 'updates', { source: 'db/0001_init.sql:3' }));
    map.edges.push(edge('fn:public.f', 'table:public.t', 'deletes', { source: 'db/0001_init.sql:0' }));
    map.edges.push(edge('fn:public.f', 'table:public.t', 'upserts', { source: 'db/0001_init.sql:1-2' }));
    map.edges.push(edge('fn:public.f', 'table:public.t', 'enqueues', { source: 'db/0001_init.sql:2' }));
  });
  assert.ok(hasProblem(problems, /line 3 is outside db\/0001_init\.sql \(2 lines\)/), FULL(problems));
  assert.ok(hasProblem(problems, /line 0 is outside/), FULL(problems));
  assert.ok(hasProblem(problems, /must cite one line \(path:line\), not a range/), FULL(problems));
  assert.ok(!hasProblem(problems, /enqueues/), 'the last line of the file is in range');
});

test('validate counts lines without the trailing newline and allows a file without one', () => {
  const root = makeTree({ 'a.sql': 'one\ntwo', 'b.sql': 'one\ntwo\n' });
  const map = {
    nodes: [node('fn:public.f'), node('table:public.t')],
    edges: [
      edge('fn:public.f', 'table:public.t', 'inserts', { source: 'a.sql:2' }),
      edge('fn:public.f', 'table:public.t', 'updates', { source: 'b.sql:2' }),
      edge('fn:public.f', 'table:public.t', 'deletes', { source: 'b.sql:3' }),
    ],
  };
  assert.deepEqual(validate(map, { root }).map((problem) => problem.replace(/^.*source: /, '')), ['line 3 is outside b.sql (2 lines)']);
});

test('validate flags a duplicate edge but allows the same pair with a different source or kind', () => {
  const problems = validateWith((map) => {
    map.edges.push({ ...map.edges[0] });
    map.edges.push({ ...map.edges[0], source: 'src/file.js' });
    map.edges.push({ ...map.edges[0], kind: 'enqueues' });
  });
  assert.equal(problems.filter((problem) => /duplicate edge/.test(problem)).length, 1, FULL(problems));
});

test('validate checks that a node id naming a file points at one', () => {
  const problems = validateWith((map) => map.nodes.push(node('lib:src/gone.js#fn'), node('script:src/file.js#nothing'), node('middleware:src/file.js')));
  assert.ok(hasProblem(problems, /node lib:src\/gone\.js#fn id: file "src\/gone\.js" does not exist/), FULL(problems));
  assert.ok(hasProblem(problems, /node script:src\/file\.js#nothing id: symbol "nothing"/), FULL(problems));
  assert.ok(!hasProblem(problems, /middleware:src\/file\.js/), 'an existing file is fine');
});

test('validate reports duplicate node ids and a malformed fields list', () => {
  const problems = validateWith((map) => {
    map.nodes.push(node('table:public.t'));
    map.edges.push(edge('fn:public.f', 'table:public.t', 'inserts', { fields: 'title' }));
  });
  assert.ok(hasProblem(problems, /node table:public\.t: id appears more than once/), FULL(problems));
  assert.ok(hasProblem(problems, /fields must be an array of strings/), FULL(problems));
});

test('validate never throws, whatever it is given', () => {
  const root = makeTree(VALIDATE_TREE);
  for (const map of [null, undefined, 7, 'text', [], {}, { nodes: 'x', edges: 5 }, { nodes: [null, 3, []], edges: [null, 'x', {}] }, { nodes: [], edges: [], dropped: 4 }]) {
    const problems = validate(map, { root });
    assert.ok(Array.isArray(problems));
  }
  assert.ok(validate({ nodes: [], edges: [], dropped: { tables: 'x', extra: [] } }, { root }).length >= 2);
});

test('parseSource splits path#symbol, path:line, and a bare path', () => {
  assert.deepEqual(parseSource('app/a.js#doIt'), { file: 'app/a.js', symbol: 'doIt' });
  assert.deepEqual(parseSource('supabase/migrations/0009_x.sql:120'), { file: 'supabase/migrations/0009_x.sql', line: 120 });
  assert.deepEqual(parseSource('lib/x.mjs'), { file: 'lib/x.mjs' });
  assert.deepEqual(parseSource('app/admin/[id]/page.jsx#Page'), { file: 'app/admin/[id]/page.jsx', symbol: 'Page' });
  assert.equal(parseSource('a.sql:1-4').rangeError, true);
});

// ---------------------------------------------------------------------------
// Path derivation for route and page ids
// ---------------------------------------------------------------------------

test('urlFromAppPath derives the URL a file under app/ serves', () => {
  assert.equal(urlFromAppPath('app/page.jsx'), '/');
  assert.equal(urlFromAppPath('app/about/page.jsx'), '/about');
  assert.equal(urlFromAppPath('app/api/contact/route.js'), '/api/contact');
  assert.equal(urlFromAppPath('app/admin/deals/[id]/page.jsx'), '/admin/deals/[id]');
  assert.equal(urlFromAppPath('app/(marketing)/pricing/page.jsx'), '/pricing');
  assert.equal(urlFromAppPath('app/(a)/(b)/page.jsx'), '/');
  assert.equal(urlFromAppPath('app/blog/[...slug]/page.jsx'), '/blog/[...slug]');
  assert.equal(urlFromAppPath('app/@modal/photo/page.jsx'), '/photo');
});

// ---------------------------------------------------------------------------
// Source text helpers
// ---------------------------------------------------------------------------

test('stripJsComments removes comments and keeps strings, templates and regexes', () => {
  const source = [
    "const a = 'x // not a comment'; // line comment process.env.NO_A",
    '/* block\n process.env.NO_B */ const b = "y /* nor this */";',
    'const c = `tpl ${ fn(/* in */ 1) } // inside template`;',
    'const d = /https?:\\/\\//.test(url); // trailing',
    'const e = a / b / c;',
    'const f = process.env.KEEP;',
  ].join('\n');
  const out = stripJsComments(source);
  assert.ok(!out.includes('NO_A') && !out.includes('NO_B') && !out.includes('line comment') && !out.includes('trailing'));
  for (const kept of ["'x // not a comment'", '"y /* nor this */"', '// inside template', '/https?:\\/\\//.test(url)', 'a / b / c', 'process.env.KEEP']) {
    assert.ok(out.includes(kept), kept);
  }
  assert.equal(out.split('\n').length, source.split('\n').length, 'line breaks are kept');
});

test('stripJsComments leaves JSX closing tags alone, and a stray apostrophe only costs its own line', () => {
  const closing = stripJsComments('<p>Done <b>stop</b></p> // gone\n<i>x</i>');
  assert.ok(closing.includes('<p>Done <b>stop</b></p>') && closing.includes('<i>x</i>') && !closing.includes('gone'));
  const apostrophe = stripJsComments("<p>Don't</p>\n// process.env.GONE\nconst v = process.env.KEPT;");
  assert.ok(!apostrophe.includes('GONE') && apostrophe.includes('process.env.KEPT'));
});

test('stripSqlComments removes line and nested block comments but not strings or dollar quotes', () => {
  const sql = "select 1; -- gone\n/* a /* nested */ still */ select '-- kept', $$ -- kept too $$, $f$ /* kept */ $f$;";
  const out = stripSqlComments(sql);
  assert.ok(!out.includes('gone') && !out.includes('nested') && !out.includes('still'));
  assert.ok(out.includes("'-- kept'") && out.includes('$$ -- kept too $$') && out.includes('$f$ /* kept */ $f$'));
});

test('exportedNames reports declarations, const arrows and export lists with async-ness', () => {
  const found = Object.fromEntries(
    exportedNames(
      [
        'export async function a() {}',
        'export function b() {}',
        'export const c = async () => {};',
        'export const d = 5;',
        'async function e() {}',
        'function f() {}',
        'export { e, f as g, e as h };',
        "export { x } from './y';",
      ].join('\n'),
    ).map(({ name, isAsync }) => [name, isAsync]),
  );
  assert.deepEqual(found, { a: true, b: false, c: true, d: false, e: true, g: false, h: true, x: null });
});

test('envNamesIn reads dotted, optional-chained and bracketed names, but not dynamic ones', () => {
  assert.deepEqual(
    envNamesIn("process.env.A; process.env?.B; process.env['C']; process.env[name]; process.env . D; const env = process.env;"),
    ['A', 'B', 'D', 'C'],
  );
});

test('fromCalls separates Storage buckets and native from() calls from table reads', () => {
  const code = [
    "supabase.from('things').select();",
    "supabase\n  .from(\"thing_events\")\n  .insert({});",
    "await client.storage\n  .from('uploads')\n  .upload(p, f);",
    "Array.from('abc'); Buffer.from('hi', 'utf8'); Uint8Array.from('zz');",
    'supabase.from(`tpl`); supabase.from(dynamic); supabase.from(`a${b}`);',
  ].join('\n');
  assert.deepEqual(fromCalls(code), [
    { kind: 'table', name: 'things' },
    { kind: 'table', name: 'thing_events' },
    { kind: 'bucket', name: 'uploads' },
    { kind: 'table', name: 'tpl' },
  ]);
});

// ---------------------------------------------------------------------------
// SQL parsing for coverage
// ---------------------------------------------------------------------------

test('parseSql finds public tables whatever the case, quoting and whitespace', () => {
  const parsed = parseSql(`
    CREATE TABLE public.A (id int);
    create table if not exists
      public.b (id int);
    create   table   "public"."Quoted_Name" (id int);
    create unlogged table public.c (id int);
    create table private.hidden (id int);
    create table other.elsewhere (id int);
    create temp table scratch (id int);
    create table plain (id int);
  `);
  assert.deepEqual(parsed.tables, ['public.Quoted_Name', 'public.a', 'public.b', 'public.c', 'public.plain']);
});

test('parseSql ignores objects that only appear in comments', () => {
  const parsed = parseSql(`
    -- create table public.line_commented (id int);
    /* create function public.block_commented() returns void as $$ $$ language sql;
       create trigger t after insert on public.x for each row execute function f(); */
    create table public.real_one (id int);
  `);
  assert.deepEqual(parsed, { tables: ['public.real_one'], functions: [], triggers: [] });
});

test('parseSql finds public and private functions, once each, and no other schemas', () => {
  const parsed = parseSql(`
    create function public.one(a int) returns int as $$ select 1 $$ language sql;
    CREATE OR REPLACE FUNCTION public.one(a int, b int) RETURNS int AS $$ select 2 $$ LANGUAGE sql;
    create or replace function
      private."Two"()
      returns void as $$ begin end $$ language plpgsql;
    create function extensions.nope() returns void as $$ $$ language sql;
    create function auth.also_no() returns void as $$ $$ language sql;
    create function bare_name() returns void as $$ $$ language sql;
  `);
  assert.deepEqual(parsed.functions, ['private.Two', 'public.bare_name', 'public.one']);
});

test('parseSql finds triggers with their table and schema, across lines and options', () => {
  const parsed = parseSql(`
    create trigger on_a_updated
      before update of status, title on public.things
      for each row execute function public.touch();
    CREATE OR REPLACE TRIGGER "Quoted Trigger" AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.h();
    create constraint trigger deferred_one after insert on public.things deferrable initially deferred for each row execute function public.k();
    create trigger no_schema after delete on loose for each row execute function public.k();
  `);
  assert.deepEqual(parsed.triggers, [
    'auth.users.Quoted Trigger',
    'public.loose.no_schema',
    'public.things.deferred_one',
    'public.things.on_a_updated',
  ]);
});

// ---------------------------------------------------------------------------
// coverage
// ---------------------------------------------------------------------------

const COVERAGE_TREE = {
  'app/page.jsx': 'export default function Home() { return null; }\n',
  'app/about/page.jsx': 'export default function About() { return null; }\n',
  'app/(marketing)/pricing/page.jsx': 'export default function Pricing() { return null; }\n',
  'app/admin/deals/[id]/page.jsx': 'export default function Deal() { return null; }\n',
  'app/api/contact/route.js': "export const runtime = 'nodejs';\nexport async function POST(request) {}\nexport async function OPTIONS() {}\n",
  'app/api/health/route.js': 'export async function GET() {}\n',
  'app/api/cron/route.js': 'export const GET = async () => {};\nexport { handle as POST };\nasync function handle() {}\n',
  'app/actions/thing-actions.js':
    "'use server';\n\nimport x from 'y';\nexport async function createThing(formData) {}\nexport async function removeThing() {}\nfunction helper() {}\n",
  'app/auth/actions.js': "// header comment\n/* more */\n'use server'\nexport const signIn = async () => {};\nexport function syncOne() {}\n",
  'app/other/helpers.js': "export async function notAnAction() {}\nconst text = \"'use server'\";\n",
  'lib/db.js': [
    "import { createClient } from './client';",
    'export async function load(supabase) {',
    "  await supabase.from('things').select('*');",
    "  await supabase\n    .from('thing_events')\n    .insert({});",
    "  await supabase.from('orphan_table').select();",
    "  await supabase.rpc('make_thing', {});",
    "  await supabase.rpc('orphan_rpc');",
    "  const files = await supabase.storage\n    .from('uploads')\n    .list();",
    "  const arr = Array.from('abc');",
    "  const buf = Buffer.from('hello', 'utf8');",
    "  // supabase.from('commented_out')",
    "  /* supabase.rpc('commented_rpc') */",
    '}',
  ].join('\n'),
  'lib/env.js': [
    'const a = process.env.NODE_ENV;',
    'const b = process.env?.OPTIONAL_VAR;',
    "const c = process.env['BRACKET_VAR'];",
    '// process.env.IN_COMMENT',
    'const d = process.env[dynamic];',
  ].join('\n'),
  'components/Widget.jsx': 'export default function W() { return <p>{process.env.NEXT_PUBLIC_KEY}</p>; }\n',
  'middleware.js': 'export default function m() { return process.env.EDGE_VAR; }\n',
  'next.config.js': 'module.exports = { x: process.env.NEXT_CONFIG_VAR };\n',
  'sentry.server.config.js': 'init(process.env.SENTRY_DSN);\n',
  'instrumentation-client.js': 'init(process.env.CLIENT_VAR);\n',
  'scripts/tool.mjs': 'const v = process.env.SCRIPT_VAR;\n',
  'scripts/seo/deep.mjs': 'const v = process.env.DEEP_SCRIPT_VAR;\n',
  'tests/ignored.test.mjs': 'process.env.IGNORED_IN_TESTS; supabase.from("ignored_table");\n',
  'docs/ignored.js': 'process.env.IGNORED_IN_DOCS;\n',
  'node_modules/pkg/index.js': 'process.env.IGNORED_IN_MODULES;\n',
  'supabase/migrations/0001_init.sql': [
    '-- 0001',
    'create table public.things (id uuid);',
    'CREATE TABLE IF NOT EXISTS public.thing_events (',
    '  id uuid',
    ');',
    'create table "public"."Quoted_Table" (id int);',
    'create table private.hidden (id int);',
    '-- create table public.commented (id int);',
    'create table public.dropped_table (id int);',
    'create or replace function public.make_thing(p_x int) returns void as $$ begin end $$ language plpgsql;',
    'create function private.is_thing(p int) returns boolean as $$ select true $$ language sql;',
    'create function other.nope() returns void as $$ $$ language sql;',
    'create function public.dropped_fn() returns void as $$ $$ language sql;',
    'create trigger on_thing_updated',
    '  before update on public.things',
    '  for each row execute function public.touch();',
    'create or replace trigger "Quoted Trigger" after insert on auth.users for each row execute function public.h();',
    'create trigger dropped_trigger after insert on public.things for each row execute function public.touch();',
  ].join('\n'),
  'supabase/migrations/0002_more.sql': 'create table public.things_two (id uuid);\ncreate or replace function public.make_thing(p_x int, p_y int) returns void as $$ begin end $$ language plpgsql;\n',
};

const COVERAGE_DROPPED = {
  tables: ['public.dropped_table'],
  functions: ['fn:public.dropped_fn()'],
  triggers: ['trigger:public.things.dropped_trigger'],
};

const COVERAGE_IDS = [
  'page:/', 'page:/about', 'page:/pricing', 'page:/admin/deals/[id]',
  'route:POST /api/contact', 'route:GET /api/health', 'route:GET /api/cron', 'route:POST /api/cron',
  'action:app/actions/thing-actions.js#createThing', 'action:app/actions/thing-actions.js#removeThing', 'action:app/auth/actions.js#signIn',
  'table:public.things', 'table:public.thing_events', 'table:public.Quoted_Table', 'table:public.things_two',
  'table:public.orphan_table',
  'fn:public.make_thing', 'fn:private.is_thing', 'fn:public.orphan_rpc',
  'trigger:public.things.on_thing_updated', 'trigger:auth.users.Quoted Trigger',
  'bucket:uploads',
  'env:NODE_ENV', 'env:OPTIONAL_VAR', 'env:BRACKET_VAR', 'env:NEXT_PUBLIC_KEY', 'env:EDGE_VAR', 'env:NEXT_CONFIG_VAR',
  'env:SENTRY_DSN', 'env:CLIENT_VAR', 'env:SCRIPT_VAR', 'env:DEEP_SCRIPT_VAR',
];

const coverageMap = (ids, dropped = COVERAGE_DROPPED) => ({ nodes: ids.map((id) => node(id)), edges: [], dropped });

test('coverage is empty when the map has a node for every code object', () => {
  const problems = coverage(coverageMap(COVERAGE_IDS), { root: makeTree(COVERAGE_TREE) });
  assert.deepEqual(problems, []);
});

test('coverage names each missing node exactly once, whichever rule found it', () => {
  const root = makeTree(COVERAGE_TREE);
  for (const id of COVERAGE_IDS) {
    const problems = coverage(coverageMap(COVERAGE_IDS.filter((other) => other !== id)), { root });
    assert.equal(problems.length, 1, `without ${id}: ${FULL(problems)}`);
    assert.ok(problems[0].startsWith(`missing node ${id}:`), problems[0]);
  }
});

test('coverage with an empty map lists every code object, with where it was found', () => {
  const problems = coverage({ nodes: [], edges: [], dropped: COVERAGE_DROPPED }, { root: makeTree(COVERAGE_TREE) });
  assert.equal(problems.length, COVERAGE_IDS.length);
  assert.ok(problems.includes('missing node route:POST /api/contact: exported POST handler in app/api/contact/route.js'));
  assert.ok(problems.includes('missing node action:app/auth/actions.js#signIn: exported server action in app/auth/actions.js'));
  assert.ok(problems.some((problem) => /^missing node table:public\.things: created in supabase\/migrations\/0001_init\.sql/.test(problem)));
  assert.ok(problems.some((problem) => /^missing node env:NODE_ENV: process\.env\.NODE_ENV in lib\/env\.js/.test(problem)));
});

test('coverage ignores what the rules exclude', () => {
  const text = coverage({ nodes: [], edges: [] }, { root: makeTree(COVERAGE_TREE) }).map(idOfProblem).join('\n');
  for (const absent of [
    'notAnAction', 'syncOne', 'OPTIONS', 'IN_COMMENT', 'IGNORED_IN_TESTS', 'IGNORED_IN_DOCS', 'IGNORED_IN_MODULES', 'ignored_table',
    'commented_out', 'commented_rpc', 'private.hidden', 'public.commented', 'other.nope', 'abc', 'hello',
  ]) {
    assert.ok(!text.includes(absent), `${absent} should not be required`);
  }
});

test('coverage lets dropped objects through in either id form, and requires them without a dropped entry', () => {
  const root = makeTree(COVERAGE_TREE);
  const without = coverage(coverageMap(COVERAGE_IDS, {}), { root });
  assert.deepEqual(
    without.map(idOfProblem).sort(),
    ['fn:public.dropped_fn', 'table:public.dropped_table', 'trigger:public.things.dropped_trigger'],
  );
  const bare = coverage(coverageMap(COVERAGE_IDS, { tables: ['public.dropped_table'], functions: ['public.dropped_fn'], triggers: ['public.things.dropped_trigger'] }), { root });
  assert.deepEqual(bare, []);
});

test('coverage reads an `export { name as GET }` list and a const arrow as route handlers', () => {
  const root = makeTree({ 'app/api/cron/route.js': COVERAGE_TREE['app/api/cron/route.js'] });
  assert.deepEqual(coverage({ nodes: [], edges: [] }, { root }).map(idOfProblem), ['route:GET /api/cron', 'route:POST /api/cron']);
});

test('coverage only counts a file as a server action file when the directive comes first', () => {
  const root = makeTree({
    'app/a/actions.js': "import x from 'y';\n'use server';\nexport async function late() {}\n",
    'app/b/actions.js': "'use server';\nexport async function first() {}\n",
  });
  assert.deepEqual(coverage({ nodes: [], edges: [] }, { root }), ['missing node action:app/b/actions.js#first: exported server action in app/b/actions.js']);
});

test('coverage copes with an empty tree and a map with no arrays', () => {
  assert.deepEqual(coverage({}, { root: makeTree() }), []);
  assert.deepEqual(coverage(null, { root: makeTree() }), []);
});

// ---------------------------------------------------------------------------
// traverse
// ---------------------------------------------------------------------------

test('traverse follows every flow kind forward', () => {
  const kinds = ['submits', 'calls', 'inserts', 'updates', 'deletes', 'upserts', 'enqueues', 'drains', 'sends', 'broadcasts', 'delivers', 'uploads', 'fires', 'redirects', 'sets', 'emits', 'writes', 'feeds'];
  for (const kind of kinds) {
    const map = mapOf([edge('lib:src/a.js', 'ext:target', kind)]);
    assert.deepEqual(reachedIds(map, 'lib:src/a.js'), ['ext:target'], kind);
  }
});

test('traverse does not follow reads, gets, signs-url, configures or fk (without a delete)', () => {
  for (const kind of ['reads', 'gets', 'signs-url', 'configures', 'fk']) {
    const map = mapOf([edge('lib:src/a.js', 'ext:target', kind)]);
    assert.deepEqual(reachedIds(map, 'lib:src/a.js'), [], kind);
  }
});

const fkMap = (action, onDelete) =>
  mapOf([
    edge('action:src/a.js#go', 'table:public.parent', action),
    edge('table:public.parent', 'table:public.child', 'fk', onDelete ? { attrs: { onDelete } } : {}),
    edge('table:public.child', 'table:public.grandchild', 'fk', { attrs: { onDelete: 'cascade' } }),
  ]);

test('traverse follows a foreign key only when the table was reached by a delete', () => {
  assert.deepEqual(reachedIds(fkMap('deletes', 'cascade'), 'action:src/a.js#go'), ['table:public.child', 'table:public.grandchild', 'table:public.parent']);
  for (const action of ['inserts', 'updates', 'upserts', 'enqueues']) {
    assert.deepEqual(reachedIds(fkMap(action, 'cascade'), 'action:src/a.js#go'), ['table:public.parent'], action);
  }
});

test('traverse treats a missing onDelete as a cascade, and restrict or no action as blocking', () => {
  assert.deepEqual(reachedIds(fkMap('deletes', undefined), 'action:src/a.js#go'), ['table:public.child', 'table:public.grandchild', 'table:public.parent']);
  assert.deepEqual(reachedIds(fkMap('deletes', 'restrict'), 'action:src/a.js#go'), ['table:public.parent']);
  assert.deepEqual(reachedIds(fkMap('deletes', 'no action'), 'action:src/a.js#go'), ['table:public.parent']);
});

test('traverse reaches a set-null child but does not cascade a delete through it', () => {
  const map = fkMap('deletes', 'set null');
  assert.deepEqual(reachedIds(map, 'action:src/a.js#go'), ['table:public.child', 'table:public.parent']);
  const { edges } = traverse(buildGraph(map), 'action:src/a.js#go');
  assert.deepEqual(edges.map(({ effect }) => effect), ['deletes', 'set-null']);
});

test('traverse stops at a cycle and still reaches every node on it', () => {
  const map = mapOf([
    edge('fn:public.a', 'fn:public.b', 'calls'),
    edge('fn:public.b', 'fn:public.c', 'calls'),
    edge('fn:public.c', 'fn:public.a', 'calls'),
    edge('fn:public.c', 'fn:public.c', 'calls'),
    edge('fn:public.c', 'table:public.t', 'inserts'),
    edge('table:public.t', 'fn:public.a', 'drains'),
  ]);
  assert.deepEqual(reachedIds(map, 'fn:public.a'), ['fn:public.b', 'fn:public.c', 'table:public.t']);
  const { depths } = traverse(buildGraph(map), 'fn:public.a');
  assert.equal(depths.get('fn:public.a'), 0, 'the start keeps depth 0');
});

test('traverse caps depth at 8 edges', () => {
  const chain = Array.from({ length: 10 }, (_, index) => edge(`fn:public.n${index}`, `fn:public.n${index + 1}`, 'calls'));
  const map = mapOf(chain);
  const reached = reachedIds(map, 'fn:public.n0');
  assert.equal(reached.length, 8);
  assert.ok(reached.includes('fn:public.n8') && !reached.includes('fn:public.n9'));
  assert.equal(reachedIds(map, 'fn:public.n0', { maxDepth: 3 }).length, 3);
});

test('traverse keeps the shortest depth when two paths reach a node', () => {
  const map = mapOf([
    edge('fn:public.a', 'fn:public.b', 'calls'),
    edge('fn:public.b', 'fn:public.c', 'calls'),
    edge('fn:public.a', 'fn:public.c', 'calls'),
  ]);
  assert.equal(traverse(buildGraph(map), 'fn:public.a').depths.get('fn:public.c'), 1);
});

test('traverse treats a page or component reached partway as a stop, not a pass-through', () => {
  const map = mapOf([
    edge('action:src/a.js#go', 'page:/dashboard', 'redirects'),
    edge('page:/dashboard', 'action:src/a.js#other', 'submits'),
    edge('action:src/a.js#other', 'table:public.t', 'inserts'),
  ]);
  assert.deepEqual(reachedIds(map, 'action:src/a.js#go'), ['page:/dashboard']);
  assert.deepEqual(reachedIds(map, 'page:/dashboard'), ['action:src/a.js#other', 'table:public.t']);
});

test('triggerWhenAllows matches the write event and, for UPDATE OF, a written column', () => {
  assert.equal(triggerWhenAllows('AFTER INSERT', 'insert'), true);
  assert.equal(triggerWhenAllows('AFTER INSERT', 'update'), false);
  assert.equal(triggerWhenAllows('AFTER INSERT OR UPDATE', 'update'), true);
  assert.equal(triggerWhenAllows('AFTER DELETE', 'delete'), true);
  assert.equal(triggerWhenAllows('BEFORE UPDATE', 'delete'), false);
  assert.equal(triggerWhenAllows('', 'update'), true, 'a when naming no event always counts');
  assert.equal(triggerWhenAllows('on every change', 'insert'), true);
  assert.equal(triggerWhenAllows('AFTER UPDATE OF status', 'update', ['status', 'title']), true);
  assert.equal(triggerWhenAllows('AFTER UPDATE OF status, title', 'update', ['title']), true);
  assert.equal(triggerWhenAllows('AFTER UPDATE OF status', 'update', ['title']), false);
  assert.equal(triggerWhenAllows('AFTER UPDATE OF status', 'update', []), true, 'unknown columns: assume it fires');
  assert.equal(triggerWhenAllows('AFTER UPDATE OF status', 'update', ['*']), true);
  assert.equal(triggerWhenAllows('AFTER UPDATE OF Status', 'update', ['status']), true);
  assert.equal(triggerWhenAllows('AFTER UPDATE OF status', null), true);
});

test('traverse follows a fires edge only when its when matches the write that reached the table', () => {
  const onUpdate = edge('table:public.t', 'trigger:public.t.on_update', 'fires', { when: 'AFTER UPDATE OF status' });
  const onInsert = edge('table:public.t', 'trigger:public.t.on_insert', 'fires', { when: 'AFTER INSERT' });
  const always = edge('table:public.t', 'trigger:public.t.always', 'fires');
  const withWriter = (kind, fields) => mapOf([edge('action:src/a.js#go', 'table:public.t', kind, { fields }), onUpdate, onInsert, always]);
  assert.deepEqual(reachedIds(withWriter('inserts', ['title']), 'action:src/a.js#go').filter((id) => id.startsWith('trigger')), ['trigger:public.t.always', 'trigger:public.t.on_insert']);
  assert.deepEqual(reachedIds(withWriter('updates', ['status']), 'action:src/a.js#go').filter((id) => id.startsWith('trigger')), ['trigger:public.t.always', 'trigger:public.t.on_update']);
  assert.deepEqual(reachedIds(withWriter('updates', ['title']), 'action:src/a.js#go').filter((id) => id.startsWith('trigger')), ['trigger:public.t.always']);
  assert.equal(reachedIds(withWriter('upserts', ['status']), 'action:src/a.js#go').filter((id) => id.startsWith('trigger')).length, 3, 'an upsert is an insert and an update');
  assert.deepEqual(reachedIds(withWriter('deletes', []), 'action:src/a.js#go').filter((id) => id.startsWith('trigger')), ['trigger:public.t.always']);
});

test('entryNodes lists action, route, middleware, cron, workflow, script and input nodes, and UI nodes that submit or write', () => {
  const map = mapOf(
    [
      edge('component:src/form.jsx', 'action:src/a.js#go', 'submits'),
      edge('page:/writes', 'table:public.t', 'inserts'),
      edge('component:src/reader.jsx', 'table:public.t', 'reads'),
      edge('component:src/looker.jsx', 'action:src/a.js#go', 'calls'),
      edge('component:src/uploader.jsx', 'bucket:files', 'uploads'),
    ],
    ['route:GET /x', 'middleware:src/m.js', 'cron:vercel.job', 'workflow:src/w.yml', 'script:src/s.mjs', 'input:browser.scroll', 'fn:public.f', 'page:/plain'],
  );
  assert.deepEqual(
    entryNodes(buildGraph(map)).map((entry) => entry.id),
    [
      'action:src/a.js#go', 'component:src/form.jsx', 'component:src/uploader.jsx', 'cron:vercel.job', 'input:browser.scroll',
      'middleware:src/m.js', 'page:/writes', 'route:GET /x', 'script:src/s.mjs', 'workflow:src/w.yml',
    ],
  );
});

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

function renderFixture() {
  const nodes = [
    node('component:components/Form.jsx'),
    node('page:/readonly'),
    node('action:app/actions/a.js#createThing'),
    node('fn:public.create_thing'),
    node('table:public.things'),
    node('table:public.audit'),
    node('table:public.orphan'),
    node('trigger:public.things.audit_insert'),
    node('table:public.outbox'),
    node('route:POST /api/cron'),
    node('email:lib/email.js#thingEmail'),
    node('ext:resend'),
    node('realtime:thing:{id}'),
    node('table:public.parent'),
    node('table:public.child'),
    node('action:app/actions/a.js#removeParent'),
    node('bucket:files'),
    node('cookie:session'),
    node('input:browser.scroll'),
    node('singleton:scrollState.progress'),
    node('actor:components/three/Rig.jsx'),
  ];
  const edges = [
    edge('component:components/Form.jsx', 'action:app/actions/a.js#createThing', 'submits', { fields: ['title'] }),
    edge('page:/readonly', 'table:public.things', 'reads'),
    edge('action:app/actions/a.js#createThing', 'fn:public.create_thing', 'calls', { via: 'user' }),
    edge('fn:public.create_thing', 'table:public.things', 'inserts', { fields: ['title', 'status'], via: 'definer' }),
    edge('fn:public.create_thing', 'table:public.things', 'updates', { fields: ['status'], via: 'definer' }),
    edge('fn:public.create_thing', 'table:public.outbox', 'enqueues', { fields: ['kind'], via: 'definer' }),
    edge('table:public.things', 'trigger:public.things.audit_insert', 'fires', { when: 'AFTER INSERT' }),
    edge('trigger:public.things.audit_insert', 'table:public.audit', 'inserts', { fields: ['event_type'] }),
    edge('fn:public.create_thing', 'realtime:thing:{id}', 'broadcasts'),
    edge('table:public.outbox', 'route:POST /api/cron', 'drains'),
    edge('route:POST /api/cron', 'email:lib/email.js#thingEmail', 'sends', { via: 'service_role' }),
    edge('email:lib/email.js#thingEmail', 'ext:resend', 'sends'),
    edge('route:POST /api/cron', 'table:public.outbox', 'updates', { fields: ['status'], via: 'service_role' }),
    edge('table:public.parent', 'table:public.child', 'fk', { attrs: { onDelete: 'cascade' } }),
    edge('action:app/actions/a.js#removeParent', 'table:public.parent', 'deletes'),
    edge('action:app/actions/a.js#removeParent', 'bucket:files', 'uploads'),
    edge('route:POST /api/cron', 'cookie:session', 'sets'),
    edge('input:browser.scroll', 'singleton:scrollState.progress', 'writes'),
    edge('singleton:scrollState.progress', 'actor:components/three/Rig.jsx', 'feeds'),
  ];
  return { nodes, edges, dropped: {} };
}

const sectionOf = (markdown, heading) => {
  const start = markdown.indexOf(`#### \`${heading}\``);
  assert.ok(start >= 0, `no section for ${heading}`);
  const end = markdown.indexOf('\n#', start + 5);
  return markdown.slice(start, end < 0 ? undefined : end);
};

test('render explains that it is generated and how to regenerate it', () => {
  const markdown = render(renderFixture());
  assert.match(markdown, /^# 04\. Externalities/);
  assert.match(markdown, /Generated by `node scripts\/data-map\.mjs --write`/);
  assert.match(markdown, /not hand-edited/);
  assert.match(markdown, /## How to read this/);
  assert.match(markdown, /## Part 1: What each input reaches/);
  assert.match(markdown, /## Part 2: What reaches each data point/);
  assert.ok(markdown.endsWith('\n') && !markdown.endsWith('\n\n'));
  assert.ok(!markdown.includes('\r'));
});

test('render Part 1 groups what an entry reaches by type, with columns written', () => {
  const markdown = render(renderFixture());
  const entry = sectionOf(markdown, 'component:components/Form.jsx');
  assert.match(entry, /- Tables\n {2}- `table:public\.audit`: inserts `event_type`\n {2}- `table:public\.outbox`: updates `status`; enqueues `kind`\n {2}- `table:public\.things`: inserts `status`, `title`; updates `status`/);
  assert.match(entry, /- Realtime channels\n {2}- `realtime:thing:\{id\}`: broadcasts/);
  assert.match(entry, /- Emails\n {2}- `email:lib\/email\.js#thingEmail`: sends/);
  assert.match(entry, /- External services\n {2}- `ext:resend`: sends/);
  assert.match(entry, /- Cookies\n {2}- `cookie:session`: sets/);
  assert.match(entry, /- Code on the way: .*`action:app\/actions\/a\.js#createThing`.*`fn:public\.create_thing`.*`route:POST \/api\/cron`.*`trigger:public\.things\.audit_insert`/);
  assert.ok(!entry.includes('table:public.orphan'), 'unreached tables are not listed');
});

test('render Part 1 shows a foreign-key cascade only from a delete', () => {
  const markdown = render(renderFixture());
  const remove = sectionOf(markdown, 'action:app/actions/a.js#removeParent');
  assert.match(remove, /`table:public\.child`: deleted by fk cascade/);
  assert.match(remove, /`table:public\.parent`: deletes/);
  assert.match(remove, /- Storage buckets\n {2}- `bucket:files`: uploads/);
  assert.ok(!sectionOf(markdown, 'action:app/actions/a.js#createThing').includes('table:public.child'));
});

test('render Part 1 includes input-to-actor flows and leaves out pages that neither submit nor write', () => {
  const markdown = render(renderFixture());
  const input = sectionOf(markdown, 'input:browser.scroll');
  assert.match(input, /- Frame singletons\n {2}- `singleton:scrollState\.progress`: writes/);
  assert.match(input, /- Frame actors\n {2}- `actor:components\/three\/Rig\.jsx`: feeds/);
  assert.ok(!markdown.includes('#### `page:/readonly`'));
});

test('render Part 2 lists each entry that reaches a data point and its direct writer', () => {
  const markdown = render(renderFixture());
  const things = sectionOf(markdown, 'table:public.things');
  assert.match(things, /- `action:app\/actions\/a\.js#createThing`: by `fn:public\.create_thing`: inserts `status`, `title`; updates `status` \[definer\]/);
  assert.match(things, /- `component:components\/Form\.jsx`: by `fn:public\.create_thing`/);
  const outbox = sectionOf(markdown, 'table:public.outbox');
  assert.match(outbox, /- `route:POST \/api\/cron`: directly: updates `status` \[service_role\]/);
  assert.match(sectionOf(markdown, 'ext:resend'), /- `route:POST \/api\/cron`: by `email:lib\/email\.js#thingEmail`: sends/);
  assert.match(sectionOf(markdown, 'cookie:session'), /- `route:POST \/api\/cron`: directly: sets/);
});

test('render Part 2 sorts rows by entry, with the entry\'s own writes before the writes it makes through others', () => {
  const markdown = render(
    mapOf([
      edge('route:POST /b', 'fn:public.helper', 'calls'),
      edge('route:POST /b', 'table:public.t', 'inserts', { fields: ['x'] }),
      edge('fn:public.helper', 'table:public.t', 'updates', { fields: ['y'] }),
      edge('action:src/a.js#go', 'fn:public.helper', 'calls'),
    ]),
  );
  assert.deepEqual(
    sectionOf(markdown, 'table:public.t').split('\n').filter((line) => line.startsWith('- ')),
    [
      '- `action:src/a.js#go`: by `fn:public.helper`: updates `y`',
      '- `route:POST /b`: directly: inserts `x`',
      '- `route:POST /b`: by `fn:public.helper`: updates `y`',
    ],
  );
});

test('render Part 2 says so when no entry reaches a data point, and counts them', () => {
  const markdown = render(renderFixture());
  assert.match(sectionOf(markdown, 'table:public.orphan'), /- No entry node reaches this\./);
  assert.match(markdown, /Counts: \d+ entry nodes, \d+ data points, 1 data points no entry node reaches\./);
});

test('render is deterministic: input order does not change the output', () => {
  const map = renderFixture();
  const shuffled = { nodes: [...map.nodes].reverse(), edges: [...map.edges].reverse(), dropped: {} };
  const rotated = { nodes: [...map.nodes.slice(5), ...map.nodes.slice(0, 5)], edges: [...map.edges.slice(7), ...map.edges.slice(0, 7)], dropped: {} };
  const first = render(map);
  assert.equal(render(map), first);
  assert.equal(render(shuffled), first);
  assert.equal(render(rotated), first);
  assert.equal(renderJson(shuffled), renderJson(map));
  assert.equal(renderJson(rotated), renderJson(map));
});

test('render copes with an empty map and with edges that name unknown nodes', () => {
  assert.match(render({ nodes: [], edges: [] }), /Counts: 0 entry nodes, 0 data points, 0 data points no entry node reaches\./);
  const markdown = render({ nodes: [node('action:a.js#x')], edges: [edge('action:a.js#x', 'table:public.ghost', 'inserts'), { bad: true }], dropped: {} });
  assert.match(markdown, /`table:public\.ghost`: inserts/);
  assert.match(render({ nodes: [node('route:GET /x')], edges: [] }), /- Reaches nothing else in the map\./);
});

test('renderJson sorts nodes by id and edges by from, to, kind and source, and always writes dropped', () => {
  const json = JSON.parse(
    renderJson({
      nodes: [node('table:public.b'), node('table:public.a')],
      edges: [edge('table:public.b', 'table:public.a', 'fk', { source: 'z' }), edge('table:public.a', 'table:public.b', 'fk'), edge('table:public.b', 'table:public.a', 'fk', { source: 'a' })],
      dropped: { tables: ['public.z', 'public.y', 'public.z'] },
    }),
  );
  assert.deepEqual(json.nodes.map((entry) => entry.id), ['table:public.a', 'table:public.b']);
  assert.deepEqual(json.edges.map((entry) => `${entry.from}>${entry.source}`), ['table:public.a>src/file.js', 'table:public.b>a', 'table:public.b>z']);
  assert.deepEqual(json.dropped, { tables: ['public.y', 'public.z'], functions: [], triggers: [] });
});

// ---------------------------------------------------------------------------
// writeOutputs, check and the CLI
// ---------------------------------------------------------------------------

function outputTree() {
  const fragment = { domain: 'db', nodes: [node('table:public.t'), node('fn:public.f')], edges: [edge('fn:public.f', 'table:public.t', 'inserts', { source: 'src/file.js#realSymbol' })] };
  return makeTree({ ...VALIDATE_TREE, 'docs/data-map/data/db.json': JSON.stringify(fragment) });
}

const driftProblems = (problems) => problems.filter((problem) => /out of date|is missing; run/.test(problem));

test('writeOutputs writes data-map.json and 04-externalities.md from the fragments', () => {
  const root = outputTree();
  const outputs = writeOutputs(root);
  assert.equal(readFileSync(path.join(root, JSON_OUTPUT), 'utf8'), outputs.json);
  assert.equal(readFileSync(path.join(root, MARKDOWN_OUTPUT), 'utf8'), outputs.markdown);
  assert.equal(JSON.parse(outputs.json).nodes.length, 2);
  assert.equal(outputs.markdown, render(outputs.map));
});

test('check reports missing fragments, missing generated files, and nothing about drift right after --write', () => {
  const root = outputTree();
  const before = check(root);
  assert.equal(driftProblems(before).length, 2, 'both generated files are missing');
  for (const name of EXPECTED_FRAGMENTS.filter((fragment) => fragment !== 'db')) {
    assert.ok(before.includes(`missing fragment docs/data-map/data/${name}.json`), name);
  }
  writeOutputs(root);
  assert.deepEqual(driftProblems(check(root)), []);
});

test('check detects a stale generated file, tolerates CRLF, and reports validation problems', () => {
  const root = outputTree();
  writeOutputs(root);
  const jsonPath = path.join(root, JSON_OUTPUT);
  const markdownPath = path.join(root, MARKDOWN_OUTPUT);
  writeFileSync(markdownPath, readFileSync(markdownPath, 'utf8').replace(/\n/g, '\r\n'));
  assert.deepEqual(driftProblems(check(root)), []);
  writeFileSync(jsonPath, readFileSync(jsonPath, 'utf8').replace('"table:public.t"', '"table:public.renamed"'));
  assert.deepEqual(driftProblems(check(root)), [`${JSON_OUTPUT} is out of date; run \`node scripts/data-map.mjs --write\` and commit the result`]);
  writeFileSync(path.join(root, 'docs/data-map/data/db.json'), JSON.stringify({ nodes: [node('table:public.t')], edges: [edge('fn:public.nowhere', 'table:public.t', 'inserts')] }));
  assert.ok(hasProblem(check(root), /from "fn:public\.nowhere" is not a node/));
});

test('buildOutputs throws a clear error for duplicate nodes across fragments', () => {
  const root = makeTree({
    'docs/data-map/data/db.json': JSON.stringify({ nodes: [node('table:public.t')] }),
    'docs/data-map/data/ui.json': JSON.stringify({ nodes: [node('table:public.t')] }),
  });
  assert.throws(() => buildOutputs(root), /db\.json and ui\.json/);
});

test('the CLI writes, checks and prints usage with the right exit codes', () => {
  const root = outputTree();
  const log = mock.method(console, 'log', () => {});
  const error = mock.method(console, 'error', () => {});
  try {
    assert.equal(main(['--write'], root), 0);
    assert.ok(log.mock.calls.some((call) => /Merged 1 fragments: 2 nodes, 1 edges\./.test(call.arguments[0])));
    assert.ok(log.mock.calls.some((call) => /Missing fragments: db-logic, server, ui, external, frame/.test(call.arguments[0])));
    assert.equal(main(['--check'], root), 1, 'fragments are missing, so the check fails');
    assert.equal(main([], root), 2);
    assert.match(error.mock.calls.at(-1).arguments[0], /Usage: node scripts\/data-map\.mjs --write \| --check/);
    const broken = makeTree({ 'docs/data-map/data/db.json': '{' });
    assert.equal(main(['--check'], broken), 1);
    assert.match(error.mock.calls.at(-1).arguments[0], /db\.json: invalid JSON/);
  } finally {
    log.mock.restore();
    error.mock.restore();
  }
});

// ---------------------------------------------------------------------------
// The committed data map: the drift gate for the real repo
// ---------------------------------------------------------------------------
//
// These fail until every fragment in docs/data-map/data/ exists and the two
// generated files have been written with `node scripts/data-map.mjs --write`.
// The failure message lists the first 40 problems and a count.

const LIMIT = 40;

function explain(title, problems) {
  const shown = problems.slice(0, LIMIT).map((problem) => `  - ${problem}`).join('\n');
  const more = problems.length > LIMIT ? `\n  ... and ${problems.length - LIMIT} more` : '';
  return `${title}: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n${shown}${more}`;
}

function assertNone(title, problems) {
  assert.ok(problems.length === 0, explain(title, problems));
}

let committed;
try {
  const fragments = loadFragments(path.join(REPO_ROOT, 'docs/data-map/data'));
  committed = { fragments, map: mergeFragments(fragments) };
} catch (error) {
  committed = { error };
}

function committedMap() {
  if (committed.error) assert.fail(`The manifest fragments do not load: ${committed.error.message}`);
  return committed.map;
}

function firstDifference(expected, actual) {
  const a = expected.split('\n');
  const b = actual.split('\n');
  const index = a.findIndex((line, i) => line !== b[i]);
  const at = index < 0 ? Math.min(a.length, b.length) : index;
  return `first difference at line ${at + 1}:\n    committed: ${JSON.stringify(b[at] ?? '(end of file)')}\n    fresh:     ${JSON.stringify(a[at] ?? '(end of file)')}`;
}

function assertCurrent(file, fresh) {
  let text;
  try {
    text = readFileSync(path.join(REPO_ROOT, file), 'utf8');
  } catch {
    assert.fail(`${file} does not exist. Run \`node scripts/data-map.mjs --write\` and commit it.`);
  }
  assert.ok(
    text.replace(/\r\n/g, '\n') === fresh,
    `${file} is out of date with docs/data-map/data/*.json (${firstDifference(fresh, text.replace(/\r\n/g, '\n'))}).\nRun \`node scripts/data-map.mjs --write\` and commit the result.`,
  );
}

test('committed data map: every manifest fragment is present', () => {
  if (committed.error) assert.fail(`The manifest fragments do not load: ${committed.error.message}`);
  const have = new Set(committed.fragments.map((fragment) => fragment.file));
  const missing = EXPECTED_FRAGMENTS.filter((name) => !have.has(`${name}.json`)).map((name) => `docs/data-map/data/${name}.json`);
  assertNone('Missing manifest fragments', missing);
});

test('committed data map: the fragments merge with no node defined twice', () => {
  const map = committedMap();
  assert.ok(Array.isArray(map.nodes) && Array.isArray(map.edges));
});

test('committed data map: validate() reports no problems', () => {
  assertNone('Manifest validation', validate(committedMap(), { root: REPO_ROOT }));
});

test('committed data map: coverage() finds no code object missing from the map', () => {
  assertNone('Objects in the code with no node in the map', coverage(committedMap(), { root: REPO_ROOT }));
});

test('committed data map: docs/data-map/data-map.json matches a fresh render', () => {
  assertCurrent(JSON_OUTPUT, renderJson(committedMap()));
});

test('committed data map: docs/data-map/04-externalities.md matches a fresh render', () => {
  assertCurrent(MARKDOWN_OUTPUT, render(committedMap()));
});
