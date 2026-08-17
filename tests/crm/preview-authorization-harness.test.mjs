import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const scriptPath = 'scripts/verify-crm-preview-authorization.mjs';

async function readScript() {
  return readFile(scriptPath, 'utf8');
}

test('preview authorization harness requires explicit preview configuration instead of production defaults', async () => {
  const source = await readScript();
  assert.match(source, /SUPABASE_URL/);
  assert.match(source, /SUPABASE_ANON_KEY/);
  assert.match(source, /CRM_PREVIEW_CLIENT_A_EMAIL/);
  assert.match(source, /CRM_PREVIEW_CLIENT_B_EMAIL/);
  assert.match(source, /CRM_PREVIEW_EMPLOYEE_EMAIL/);
  assert.match(source, /CRM_PREVIEW_ADMIN_EMAIL/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /crystalwebsolution\.com/);
});

test('preview authorization harness checks cross-company client and unassigned employee denial', async () => {
  const source = await readScript();
  assert.match(source, /client A[\s\S]*cross-company/i);
  assert.match(source, /employee[\s\S]*unassigned/i);
  assert.match(source, /assert\.equal\(rows\.length,\s*0/);
  assert.match(source, /project_tasks/);
  assert.match(source, /client_visible/);
});

test('preview authorization harness checks admin visibility without service-role credentials', async () => {
  const source = await readScript();
  assert.match(source, /admin[\s\S]*project/i);
  assert.match(source, /signInWithPassword/);
  assert.match(source, /createClient/);
  assert.match(source, /for \(const/);
});
