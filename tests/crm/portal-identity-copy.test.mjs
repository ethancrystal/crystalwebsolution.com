import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// CLAUDE.md identity rule: the business is CD Sportswear INC. "Crystal Web
// Solution" is the repo's old name and must not reach a portal user. The
// onboarding form used to tell new clients to "keep conversations with the
// Crystal Web Solution team in one place".

const PORTAL_DIRS = [
  'components/crm',
  'components/auth',
  'app/dashboard',
  'app/team',
  'app/admin',
  'app/onboarding',
  'app/login',
  'app/signup',
  'app/auth',
  'app/forgot-password',
];
const SOURCE_FILE = /\.(jsx?|mjs|css)$/;

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (SOURCE_FILE.test(entry.name)) yield full;
  }
}

test('no portal file names "Crystal Web Solution"', async () => {
  const offenders = [];
  for (const dir of PORTAL_DIRS) {
    for await (const file of walk(dir)) {
      const source = await readFile(file, 'utf8');
      if (/crystal[\s-]*web[\s-]*solution/i.test(source)) offenders.push(file);
    }
  }
  assert.deepEqual(offenders, []);
});

test('the onboarding form takes the business name from SITE', async () => {
  const source = await readFile('components/crm/ClientOnboardingForm.jsx', 'utf8');
  assert.match(source, /import \{ SITE \} from '@\/lib\/site'/);
  assert.match(source, /\$\{SITE\.name\} team/);
});
