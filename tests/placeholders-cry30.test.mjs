import { readFileSync } from 'node:fs';
import { globSync } from 'glob';
import { describe, it } from 'node:test';
import assert from 'node:assert';

const BAD_PATTERNS = ['[CONFIRM', 'PLACEHOLDER'];

function checkFile(path) {
  const content = readFileSync(path, 'utf8');
  const hits = [];
  for (const pattern of BAD_PATTERNS) {
    const idx = content.indexOf(pattern);
    if (idx !== -1) {
      const line = content.slice(0, idx).split('\n').length;
      hits.push(`${pattern} at line ${line}`);
    }
  }
  return hits;
}

describe('No live placeholder text (CRY-30)', () => {
  it('lib/servicePages.mjs must not contain [CONFIRM or PLACEHOLDER', () => {
    const hits = checkFile('lib/servicePages.mjs');
    assert.deepStrictEqual(hits, [], `Found placeholders in lib/servicePages.mjs: ${hits.join(', ')}`);
  });

  it('app/**/page.jsx must not contain [CONFIRM or PLACEHOLDER', () => {
    const files = globSync('app/**/page.jsx');
    const allHits = [];
    for (const f of files) {
      const hits = checkFile(f);
      for (const h of hits) allHits.push(`${f}: ${h}`);
    }
    assert.deepStrictEqual(allHits, [], `Found placeholders in page files: ${allHits.join('; ')}`);
  });
});
