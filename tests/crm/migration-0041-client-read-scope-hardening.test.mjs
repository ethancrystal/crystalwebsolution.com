import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0041_client_read_scope_hardening.sql';

// Source-contract checks for 0041 (docs/plans/audit-followups-crm-hardening-3.md
// Task 10). These pin the SQL text; whether the policies behave is proven by
// supabase/tests/0041_client_read_scope.test.sql under `pnpm test:db`, which
// this repo cannot run without a local Supabase stack -- see the plan and
// docs/CRM-OPERATIONS.md for the apply procedure.

test('0041 replaces the approvals SELECT policy with a deliverable-visibility-aware one', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /drop policy if exists "Project participants can view shared approvals"\s+on public\.project_approvals/i);
  assert.match(sql, /create policy "Project participants can view visible approvals"\s+on public\.project_approvals\s+for select\s+to authenticated/i);
  // The grant-audit regex in migration-0040's test only sees helpers that
  // directly follow `using (` -- keep can_access_project there.
  assert.match(sql, /using \(private\.can_access_project\(project_id\)/);
  assert.match(sql, /private\.can_view_internal\(project_id\)/);
  // NULL deliverable_id is a supported state (project-level approval, or a
  // deliverable that was deleted with ON DELETE SET NULL) and must stay
  // visible to clients.
  assert.match(sql, /or deliverable_id is null/);
  assert.match(sql, /deliverable\.visibility = 'shared'/);
});

test('0041 restricts outbox reads to the recipient\'s in_app rows', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /drop policy if exists "Project participants can view own notifications"\s+on public\.notifications_outbox/i);
  assert.match(sql, /create policy "Recipients can view own in-app notifications"\s+on public\.notifications_outbox\s+for select\s+to authenticated/i);
  assert.match(sql, /user_id = \(select auth\.uid\(\)\)\s+and channel = 'in_app'/);
  // No write policy is introduced: writes stay RPC-only.
  assert.doesNotMatch(sql, /for (insert|update|delete)/i);
});

test('0041 drops both client-facing deals policies and adds none', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /drop policy if exists "Company members can view deals" on public\.deals/);
  assert.match(sql, /drop policy if exists "Company members can submit a project brief" on public\.deals/);
  assert.doesNotMatch(sql, /create policy "[^"]*" *\n?on public\.deals/i);
});

test('0041 does not re-grant, revoke, or touch RLS enablement (already correct in 0009/0010/0040)', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  // The header comment explains why those are NOT here; check statements only.
  const statements = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  assert.doesNotMatch(statements, /^\s*(grant|revoke)\s/im);
  assert.doesNotMatch(statements, /row level security/i);
});

test('NotificationsPanel no longer branches on channel (every row is in_app after 0041)', async () => {
  const panel = await readFile('components/crm/NotificationsPanel.jsx', 'utf8');
  assert.doesNotMatch(panel, /notification\.channel/);
  assert.match(panel, /!notification\.read_at/);
});

test('listNotifications still exists and reads notifications_outbox for the viewer only', async () => {
  const source = await readFile('lib/crm/projects.js', 'utf8');
  assert.match(source, /export async function listNotifications\(/);
  assert.match(source, /\.from\('notifications_outbox'\)[\s\S]*?\.eq\('user_id', viewer\.id\)/);
});
