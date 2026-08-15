import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const actionsPath = 'app/actions/project-actions.js';

async function readActions() {
  return readFile(actionsPath, 'utf8');
}

test('exports the seven bounded server actions with the shared result contract', async () => {
  const source = await readActions();
  const actions = [
    'createProject',
    'assignProject',
    'removeProjectAssignment',
    'transitionProject',
    'reserveAttachment',
    'postProjectMessage',
    'finalizeAttachment',
  ];

  assert.match(source, /^['"]use server['"];/);
  for (const action of actions) {
    assert.match(source, new RegExp(`export async function ${action}\\(formData\\)`));
  }
  assert.match(source, /return \{ ok: true, data(?:[:,])/);
  assert.match(source, /return \{ ok: false, error:/);
  assert.match(source, /requestId/);
});

test('authenticates every command and validates the complete application contract', async () => {
  const source = await readActions();

  assert.match(source, /getAuthenticatedProfile/);
  assert.match(source, /profile\.role/);
  assert.match(source, /profile\.company_id/);
  assert.match(source, /isCanonicalUuid/);
  assert.match(source, /isProjectCategory/);
  assert.match(source, /normalizeProjectTitle/);
  assert.match(source, /PROJECT_STATUSES/);
  assert.match(source, /MESSAGE_VISIBILITIES/);
  assert.match(source, /canTransition/);
  assert.match(source, /canPostVisibility/);
  assert.match(source, /MAX_BRIEF_LENGTH\s*=\s*5000/);
  assert.match(source, /MAX_MESSAGE_LENGTH\s*=\s*10000/);
  assert.match(source, /MAX_FILE_SIZE_BYTES\s*=\s*10\s*\*\s*1024\s*\*\s*1024/);
  assert.match(source, /application\/pdf/);
  assert.match(source, /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/);
  assert.match(source, /image\/png/);
  assert.match(source, /image\/jpeg/);
  assert.match(source, /text\/plain/);
});

test('calls only Task 3 RPCs for protected writes with exact argument names', async () => {
  const source = await readActions();
  const rpcNames = [
    'create_project',
    'assign_project_user',
    'remove_project_assignment',
    'transition_project_status',
    'reserve_project_attachment',
    'post_project_message',
    'finalize_project_attachment',
  ];

  for (const rpcName of rpcNames) {
    assert.match(source, new RegExp(`\\.rpc\\(['"]${rpcName}['"]`));
  }

  for (const argumentName of [
    'p_company_id',
    'p_category',
    'p_title',
    'p_brief',
    'p_target_date',
    'p_source_deal_id',
    'p_project_id',
    'p_user_id',
    'p_to_status',
    'p_note',
    'p_visibility',
    'p_file_name',
    'p_mime_type',
    'p_size_bytes',
    'p_body',
    'p_client_generated_id',
    'p_attachment_ids',
    'p_attachment_id',
  ]) {
    assert.match(source, new RegExp(`\\b${argumentName}\\b`));
  }

  assert.doesNotMatch(source, /\.from\([^)]*\)\s*\.(?:insert|update|delete)\(/);
  assert.doesNotMatch(source, /formData\.get\(['"](?:company_id|companyId|status|created_by|assignments)['"]\)/);
});

test('uses generic errors, safe logs, server idempotency ids, and role-correct revalidation', async () => {
  const source = await readActions();

  assert.match(source, /randomUUID\(\)/);
  assert.match(source, /safeDatabaseCode/);
  assert.match(source, /console\.error\(\{\s*requestId,\s*code:/);
  assert.doesNotMatch(source, /error\.message|error\.details|error\.hint/);
  assert.match(source, /revalidatePath\(['"]\/dashboard['"]\)/);
  assert.match(source, /revalidatePath\(['"]\/team['"]\)/);
  assert.match(source, /revalidatePath\(['"]\/admin\/projects['"]\)/);
  assert.match(source, /\/dashboard\/projects\/\$\{projectId\}/);
  assert.match(source, /\/team\/projects\/\$\{projectId\}/);
  assert.match(source, /\/admin\/projects\/\$\{projectId\}/);
});

test('optional notification recipient is UUID-validated before the RPC', async () => {
  const source = await readActions();
  assert.match(source, /userId !== null && !isCanonicalUuid\(userId\)/);
});
