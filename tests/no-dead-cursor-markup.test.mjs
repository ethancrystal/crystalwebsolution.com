import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// The dot+ring custom cursor (components/Cursor.jsx) shipped in the initial
// commit and was removed in PR #10 (1a2807c, 2026-07-13) after design review
// said it cluttered the page. That removal left 51 inert `data-cursor`
// attributes, one `data-hover`, the `.cursor-*` rules in what was
// app/styles/cursor-loader.css, and an `html.has-cursor` rule in reset.css
// behind -- which three later audits misread as an unbuilt feature. v1.28
// removed the leftovers (docs/plans/audit-followups-crm-hardening-3.md,
// Task 5). This test keeps them from creeping back: if a cursor is wanted
// again, restore the component from git and delete this file in the same PR.

async function walk(dir, exts) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      out.push(...(await walk(full, exts)));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

test('no data-cursor / data-hover attributes remain in app/ or components/', async () => {
  const files = [...(await walk('app', ['.jsx', '.js'])), ...(await walk('components', ['.jsx', '.js']))];
  const hits = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/data-(cursor|hover)\b/g)) {
      const line = source.slice(0, match.index).split('\n').length;
      hits.push(`${file}:${line}`);
    }
  }
  assert.deepEqual(hits, [], `dead cursor attributes found:\n${hits.join('\n')}`);
});

test('no custom-cursor CSS or stale stylesheet references remain', async () => {
  const files = [
    ...(await walk('app/styles', ['.css'])),
    'app/globals.css',
    ...(await walk('lib', ['.js', '.mjs'])),
    'app/layout.jsx',
  ];
  const hits = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/\.cursor-(dot|ring|label)\b|has-cursor|cursor-loader\.css/g)) {
      const line = source.slice(0, match.index).split('\n').length;
      hits.push(`${file}:${line} ${match[0]}`);
    }
  }
  assert.deepEqual(hits, [], `dead cursor CSS found:\n${hits.join('\n')}`);
});
