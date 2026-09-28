import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('load() useCallback depends on stable profile primitives, not the whole profile object', async () => {
  const source = await readFile('components/crm/useProjectThread.js', 'utf8');
  const loadCallbackMatch = source.match(/const load = useCallback\(async \(\) => \{[\s\S]*?\}, \[([^\]]*)\]\);/);
  assert.ok(loadCallbackMatch, 'load useCallback must exist with a dependency array');
  const deps = loadCallbackMatch[1];
  assert.doesNotMatch(
    deps,
    /(?<!\?\.\w+,?\s*)\bprofile\b(?!\?\.)/,
    'must not depend on the whole profile object -- use profile?.id / profile?.role / profile?.company_id instead',
  );
  assert.match(deps, /profile\?\.id/, 'must depend on the stable profile.id primitive');
  assert.match(deps, /profile\?\.role/, 'must depend on the stable profile.role primitive');
});
