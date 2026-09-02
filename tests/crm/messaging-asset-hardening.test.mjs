import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const actionsPath = 'app/actions/project-actions.js';
const threadPath = 'components/crm/ProjectThread.jsx';
// The thread's data half (state, load, Realtime, mutations) lives in the hook;
// reading threadPath returns component + hook so these assertions cover both.
const threadHookPath = 'components/crm/useProjectThread.js';
const filesPath = 'components/crm/ProjectFiles.jsx';
const cronPath = 'app/api/cron/crm-notifications/route.js';
const readModelPath = 'lib/crm/projects.js';

async function read(path) {
  if (path === threadPath) {
    const [component, hook] = await Promise.all([readFile(threadPath, 'utf8'), readFile(threadHookPath, 'utf8')]);
    return `${component}\n${hook}`;
  }
  return readFile(path, 'utf8');
}

test('browser-facing read fields omit private storage paths', async () => {
  const source = await read(readModelPath);
  assert.match(source, /const ATTACHMENT_FIELDS =/);
  assert.match(source, /const DELIVERABLE_FIELDS =/);
  assert.doesNotMatch(source, /ATTACHMENT_FIELDS[\s\S]*?storage_path/);
  assert.doesNotMatch(source, /DELIVERABLE_FIELDS[\s\S]*?storage_path/);
});

test('protected download action is exported and signs only after an authorized record lookup', async () => {
  const source = await read(actionsPath);
  assert.match(source, /export async function createAttachmentDownloadUrl\(formData\)/);
  assert.match(source, /kind.*attachment|kind.*deliverable/);
  assert.match(source, /from\(['"]project_attachments['"]\)/);
  assert.match(source, /from\(['"]project_deliverables['"]\)/);
  assert.match(source, /createSignedUrl\([^,]+,\s*60\)/);
});

test('browser components never create signed URLs directly', async () => {
  const [thread, files] = await Promise.all([read(threadPath), read(filesPath)]);
  assert.doesNotMatch(thread, /createSignedUrl/);
  assert.doesNotMatch(files, /createSignedUrl/);
  assert.match(thread, /createAttachmentDownloadUrl/);
  assert.match(files, /createAttachmentDownloadUrl/);
});

test('deliverable upload retains the browser storage client', async () => {
  const source = await read(filesPath);
  assert.match(source, /import \{ createClient \} from ['"]@\/lib\/supabase\/browser['"]/);
  assert.match(source, /createClient\(\)/);
});

test('file downloads prevent duplicate signed-url requests while opening', async () => {
  const source = await read(filesPath);
  assert.match(source, /downloadingId/);
  assert.match(source, /disabled=\{[^}]*downloadingId/);
});

test('message composer preserves one idempotency key and stages attachment IDs through the atomic post', async () => {
  const source = await read(threadPath);
  assert.match(source, /messageAttemptIdRef/);
  assert.match(source, /crypto\.randomUUID\(\)|globalThis\.crypto\.randomUUID\(\)/);
  assert.match(source, /clientGeneratedId/);
  assert.match(source, /attachmentIds/);
  assert.match(source, /upsert:\s*false/);
  assert.match(source, /staged|pending/i);
  assert.match(source, /Load older messages|loadOlder/i);
});

test('project changes clear the draft and staged attachment state', async () => {
  const source = await read(threadPath);
  assert.match(source, /useEffect\(\(\) => \{[\s\S]*?setStagedAttachments\(\[\]\);[\s\S]*?messageAttemptIdRef\.current = null;[\s\S]*?\}, \[projectId\]\)/);
});

test('project switches guard stale asynchronous reads and uploads', async () => {
  const source = await read(threadPath);
  assert.match(source, /projectGenerationRef/);
  assert.match(source, /generation\s*!==\s*projectGenerationRef\.current/);
});

test('failed staged attachments expose a retry path without losing the draft', async () => {
  const source = await read(threadPath);
  assert.match(source, /retryStagedAttachment/);
  assert.match(source, /Retry upload/);
  assert.match(source, /sourceFile/);
  assert.match(source, /status === 'failed'|status: 'failed'/);
});

test('realtime refreshes through the authorized read model and does not append raw payload bodies', async () => {
  const source = await read(threadPath);
  assert.match(source, /project_message_created|broadcast/);
  assert.match(source, /listProjectMessages/);
  assert.match(source, /load\(|refresh|reload/);
  assert.doesNotMatch(source, /payload\.body|new\.body|payload\.message/);
});

test('cron worker invokes stale attachment cleanup through the protected RPC', async () => {
  const source = await read(cronPath);
  assert.match(source, /cleanup_stale_project_attachments/);
  assert.match(source, /24/);
});
