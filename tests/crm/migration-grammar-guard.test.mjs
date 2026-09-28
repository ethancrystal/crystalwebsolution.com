import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

// COALESCE, NULLIF, GREATEST and LEAST are SQL grammar, not functions in
// pg_catalog, so `pg_catalog.coalesce(...)` fails with 42883 when it runs.
// plpgsql resolves calls only when a statement first executes, so CREATE
// accepts the body and the function breaks on every call. That shipped
// twice: 0009/0015 (fixed by 0016) and 0033's outbox mark RPCs (fixed by
// 0045). This guard replays every migration in order and checks the latest
// definition of each function, keyed by schema, name and argument types
// with DROP FUNCTION applied, so a superseded broken body does not fail it.

const MIGRATIONS = 'supabase/migrations';
const GRAMMAR_CALL = /"?pg_catalog"?\s*\.\s*"?(coalesce|nullif|greatest|least)"?\s*\(/i;

// Removes -- and /* */ comments outside single-quoted strings, including
// inside dollar-quoted bodies. E'' strings honour backslash escapes.
function stripComments(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    if (sql.startsWith('--', i)) {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? sql.length : end;
    } else if (sql.startsWith('/*', i)) {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
    } else if (sql[i] === "'") {
      const escapes = /[eE]/.test(sql[i - 1] ?? '') && !/\w/.test(sql[i - 2] ?? '');
      let j = i + 1;
      while (j < sql.length) {
        if (escapes && sql[j] === '\\') j += 2;
        else if (sql[j] === "'" && sql[j + 1] === "'") j += 2;
        else if (sql[j] === "'") break;
        else j += 1;
      }
      out += sql.slice(i, j + 1);
      i = j + 1;
    } else {
      out += sql[i];
      i += 1;
    }
  }
  return out;
}

// Index of the quote that closes the string opened at `open`.
function stringEnd(text, open) {
  const end = text.indexOf("'", open + 1);
  if (end === -1) throw new Error(`unterminated string at offset ${open}`);
  return end;
}

// Index just past the ")" that closes the "(" at `open`.
function closeParen(sql, open) {
  let depth = 0;
  for (let i = open; i < sql.length; i += 1) {
    if (sql[i] === "'") i = stringEnd(sql, i);
    else if (sql[i] === '(') depth += 1;
    else if (sql[i] === ')' && --depth === 0) return i + 1;
  }
  throw new Error(`unbalanced parameter list at offset ${open}`);
}

function splitTopLevel(list) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i += 1) {
    if (list[i] === "'") i = stringEnd(list, i);
    else if (list[i] === '(' || list[i] === '[') depth += 1;
    else if (list[i] === ')' || list[i] === ']') depth -= 1;
    else if (list[i] === ',' && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

// Words that start a multi-word type, so an unnamed `timestamp with time
// zone` parameter is not mistaken for a parameter named "timestamp".
const TYPE_WORDS = new Set(['timestamp', 'time', 'double', 'character', 'char', 'bit', 'interval', 'national', 'varchar', 'numeric', 'decimal']);
const TYPE_ALIASES = [
  [/^timestamp with time zone$/, 'timestamptz'],
  [/^timestamp without time zone$/, 'timestamp'],
  [/^time with time zone$/, 'timetz'],
  [/^character varying$/, 'varchar'],
  [/^double precision$/, 'float8'],
  [/^(integer|int4)$/, 'int'],
  [/^bigint$/, 'int8'],
  [/^smallint$/, 'int2'],
  [/^boolean$/, 'bool'],
];

// Argument types only: parameter names, defaults, typmods and OUT
// parameters are not part of a function's identity.
function argumentTypes(list) {
  return splitTopLevel(list)
    .map((param) => param.replace(/\s+(default\b|=)[\s\S]*$/i, '').toLowerCase().replace(/\s+/g, ' ').trim())
    .filter((param) => !/^out\s/.test(param))
    .map((param) => param.replace(/^(in|inout|variadic)\s+/, ''))
    .map((param) => {
      const words = param.split(' ');
      let type = words.length === 1 || TYPE_WORDS.has(words[0]) ? param : words.slice(1).join(' ');
      type = type
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s+\[/g, '[')
        .replace(/^"?(pg_catalog|public)"?\./, '')
        .replaceAll('"', '');
      for (const [pattern, alias] of TYPE_ALIASES) type = type.replace(pattern, alias);
      return type;
    })
    .join(',');
}

function qualifiedName(raw) {
  const name = raw.replaceAll('"', '').replace(/\s+/g, '').toLowerCase();
  return name.includes('.') ? name : `public.${name}`;
}

const NAME = String.raw`((?:"[^"]+"|[a-z_][a-z0-9_$]*)(?:\s*\.\s*(?:"[^"]+"|[a-z_][a-z0-9_$]*))?)`;
const STATEMENT = new RegExp(
  String.raw`\b(create\s+(?:or\s+replace\s+)?function|drop\s+function\s+(?:if\s+exists\s+)?)\s*${NAME}\s*(\()?`,
  'gi',
);

// Creates and drops in textual order. Bodies are skipped once read, and
// anything the scanner cannot parse throws instead of being ignored.
function scanMigration(file, sql) {
  const events = [];
  const statement = new RegExp(STATEMENT);
  let match;
  while ((match = statement.exec(sql))) {
    const name = qualifiedName(match[2]);
    const open = match[3] ? match.index + match[0].length - 1 : -1;

    if (/^drop/i.test(match[1])) {
      const key = open === -1 ? null : `${name}(${argumentTypes(sql.slice(open + 1, closeParen(sql, open) - 1))})`;
      events.push({ kind: 'drop', file, name, key });
      continue;
    }

    if (open === -1) throw new Error(`${file}: no parameter list after create function ${name}`);
    const close = closeParen(sql, open);
    const key = `${name}(${argumentTypes(sql.slice(open + 1, close - 1))})`;
    const quote = /\$([a-z_][a-z0-9_]*)?\$/i.exec(sql.slice(close));
    if (!quote || sql.slice(close, close + quote.index).includes(';')) {
      throw new Error(`${file}: no dollar-quoted body for ${key}`);
    }
    const bodyStart = close + quote.index + quote[0].length;
    const bodyEnd = sql.indexOf(quote[0], bodyStart);
    if (bodyEnd === -1) throw new Error(`${file}: unterminated body for ${key}`);
    events.push({ kind: 'create', file, name, key, body: sql.slice(bodyStart, bodyEnd) });
    statement.lastIndex = bodyEnd + quote[0].length;
  }
  return events;
}

async function replayMigrations() {
  const files = (await readdir(MIGRATIONS)).filter((name) => name.endsWith('.sql')).sort();
  const history = [];
  const latest = new Map();
  const headerCounts = new Map();

  for (const file of files) {
    const sql = stripComments((await readFile(`${MIGRATIONS}/${file}`, 'utf8')).replace(/\r\n/g, '\n'));
    headerCounts.set(file, (sql.match(/\bcreate\s+(?:or\s+replace\s+)?function\b/gi) ?? []).length);

    for (const event of scanMigration(file, sql)) {
      if (event.kind === 'create') {
        history.push(event);
        latest.set(event.key, event);
        continue;
      }
      for (const key of [...latest.keys()]) {
        if (event.key ? key === event.key : key.startsWith(`${event.name}(`)) latest.delete(key);
      }
    }
  }
  return { history, latest, headerCounts };
}

test('the migration replay parses every function definition', async () => {
  const { history, headerCounts } = await replayMigrations();

  for (const [file, headers] of headerCounts) {
    const parsed = history.filter((definition) => definition.file === file).length;
    assert.equal(parsed, headers, `${file}: ${headers} create function statements, ${parsed} parsed`);
  }
  assert.ok(history.length > 0);
});

// Proves the detector can fail: each known broken body is still in the
// history, just no longer the latest definition.
test('the replay recognises every historical grammar-qualified definition', async () => {
  const { history } = await replayMigrations();
  const flagged = history
    .filter((definition) => GRAMMAR_CALL.test(definition.body))
    .map((definition) => `${definition.file} ${definition.key}`);

  for (const known of [
    '0008_auth_rbac_repair.sql public.onboard_client_company(text,text)',
    '0009_project_realtime_crm.sql public.post_project_message(uuid,text,text,uuid,uuid[])',
    '0015_project_notifications_and_message_editing.sql public.post_project_message(uuid,text,text,uuid,uuid[])',
    '0033_notification_claim_leases.sql public.mark_notification_email_sent(uuid,uuid)',
    '0033_notification_claim_leases.sql public.mark_notification_email_failed(uuid,uuid,bool,text,text,timestamptz)',
  ]) {
    assert.ok(flagged.includes(known), `expected the replay to flag ${known}`);
  }
});

test('no latest function definition schema-qualifies COALESCE, NULLIF, GREATEST or LEAST', async () => {
  const { latest } = await replayMigrations();
  const broken = [...latest.values()]
    .filter((definition) => GRAMMAR_CALL.test(definition.body))
    .map((definition) => `${definition.key} (latest in ${definition.file})`);

  assert.deepEqual(
    broken,
    [],
    'these are SQL grammar, not pg_catalog functions: write coalesce(...), not pg_catalog.coalesce(...)',
  );
});
