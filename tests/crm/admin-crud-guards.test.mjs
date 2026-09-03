import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Phase 3 of docs/plans/refactor-architecture-cleanup-2.md recorded two gaps
// across the four admin CRUD entities and deliberately did not fix them (it
// was a no-behaviour-change refactor). Plan 3 Task 7 closed both; this test
// keeps all four entities symmetric so a fifth entity, or an edit to one of
// these, cannot quietly drop either guard again.
//
//  - edit pages: `.update(...).eq('id', id).select()` and a throw when zero
//    rows come back. RLS filters silently -- without the check a PM (or a
//    stale row) gets redirected to the detail page as if the save succeeded.
//  - new pages: the client-side admin redirect + skeleton gate. The server
//    layout already enforces the admin role; this is the render gate that
//    keeps the form from flashing for a non-admin while the role loads, and
//    it mirrors the RLS INSERT policies (0005:120 for tasks, 0006 for
//    companies/contacts, 0005:70 for deals).

const ENTITIES = ['companies', 'contacts', 'deals', 'tasks'];
const NO_ROWS_MESSAGE = 'Update failed - no rows changed (check permissions).';

for (const entity of ENTITIES) {
  test(`admin ${entity} edit page verifies the update touched a row`, async () => {
    const source = await readFile(`app/admin/${entity}/[id]/edit/page.jsx`, 'utf8');
    const table = entity;
    assert.match(
      source,
      new RegExp(String.raw`\.from\('${table}'\)\s*\.update\(payload\)\s*\.eq\('id', id\)\s*\.select\(\)`),
      `${entity} edit must select the updated row back`,
    );
    assert.ok(source.includes(NO_ROWS_MESSAGE), `${entity} edit must throw "${NO_ROWS_MESSAGE}"`);
    assert.match(source, /if \(!data \|\| data\.length === 0\)/);
  });

  test(`admin ${entity} new page gates rendering on the admin role`, async () => {
    const source = await readFile(`app/admin/${entity}/new/page.jsx`, 'utf8');
    assert.match(source, /import \{ useUserRole \} from '@\/lib\/useUserRole'/);
    assert.match(source, /const \{ isAdmin, isLoading: isRoleLoading \} = useUserRole\(\)/);
    assert.match(source, new RegExp(String.raw`router\.replace\('/admin/${entity}'\)`));
    assert.match(source, /loading=\{[^}]*isRoleLoading \|\| !isAdmin\}/, `${entity} new must hold the skeleton until the role resolves`);
  });
}
