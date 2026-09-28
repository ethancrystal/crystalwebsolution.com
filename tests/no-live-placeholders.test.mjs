import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// Guards against shipping editorial placeholders to production (CRY-30).
// v1.15 shipped literal `PLACEHOLDER — confirm …` strings and v1.21 fixed
// them; a second batch of `[CONFIRM: …]` strings in lib/servicePages.mjs
// went live on every /services/[slug] page after that. This test scans the
// SOURCE of the marketing content module and every App Router page so the
// next batch fails CI instead of reaching visitors.
//
// The markers are matched case-sensitively on purpose: several admin/auth
// pages use the lowercase `placeholder=` input attribute, which is fine.

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MARKERS = ['[CONFIRM', 'PLACEHOLDER'];

function walkPages(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPages(full, found);
    else if (entry.name === 'page.jsx') found.push(full);
  }
  return found;
}

function offendingLines(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    for (const marker of MARKERS) {
      if (line.includes(marker)) hits.push(`${path.relative(ROOT, file)}:${i + 1} contains ${marker}`);
    }
  });
  return hits;
}

test('lib/servicePages.mjs ships no [CONFIRM or PLACEHOLDER markers', () => {
  const hits = offendingLines(path.join(ROOT, 'lib/servicePages.mjs'));
  assert.deepEqual(hits, [], `live placeholder text found:\n${hits.join('\n')}`);
});

test('no app/**/page.jsx ships [CONFIRM or PLACEHOLDER markers', () => {
  const pages = walkPages(path.join(ROOT, 'app'));
  assert.ok(pages.length > 0, 'expected to find App Router page.jsx files');
  const hits = pages.flatMap(offendingLines);
  assert.deepEqual(hits, [], `live placeholder text found:\n${hits.join('\n')}`);
});
