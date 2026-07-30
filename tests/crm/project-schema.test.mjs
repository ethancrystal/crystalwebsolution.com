import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0009_project_realtime_crm.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

function functionBody(sql, name) {
  const match = sql.match(
    new RegExp(
      `create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public|private)\\.${name}\\b[\\s\\S]*?\\$function\\$([\\s\\S]*?)\\$function\\$`,
      'i',
    ),
  );

  assert.ok(match, `expected ${name} function`);
  return match[0];
}

test('0009 creates the complete UUID project aggregate and preserves guarded legacy rows', async () => {
  const sql = await readMigration();
  const tables = [
    'projects',
    'project_threads',
    'project_assignments',
    'project_messages',
    'project_attachments',
    'project_status_history',
    'audit_events',
  ];

  for (const table of tables) {
    assert.match(
      sql,
      new RegExp(`create table public\\.${table}\\s*\\([\\s\\S]*?\\bid uuid primary key default gen_random_uuid\\(\\)`, 'i'),
      `${table} must use a generated UUID primary key`,
    );
  }

  assert.match(
    sql,
    /project_id uuid not null unique references public\.projects\(id\) on delete cascade/i,
  );
  assert.match(sql, /unique\s*\(\s*project_id\s*,\s*user_id\s*\)/i);
  assert.match(sql, /unique\s*\(\s*sender_id\s*,\s*client_generated_id\s*\)/i);
  assert.match(sql, /source_deal_id uuid unique references public\.deals\(id\)/i);
  assert.match(
    sql,
    /if exists\s*\(\s*select 1 from public\.project_messages limit 1\s*\)[\s\S]*or exists\s*\(\s*select 1 from public\.project_files limit 1\s*\)[\s\S]*raise exception '0009 requires an explicit legacy project message\/file data migration'/i,
  );
  assert.match(sql, /alter table public\.project_messages rename to legacy_project_messages/i);
  assert.match(sql, /alter table public\.project_files rename to legacy_project_files/i);
  assert.doesNotMatch(sql, /drop table\s+(?:if exists\s+)?public\.(?:project_messages|project_files)/i);
});

test('0009 constrains canonical categories, statuses, visibility, and content bounds', async () => {
  const sql = await readMigration();

  for (const category of ['web_design', 'logo_creation', 'branding', 'marketing', 'ai_automation']) {
    assert.match(sql, new RegExp(`'${category}'`, 'i'));
  }

  for (const status of [
    'brief_submitted',
    'planned',
    'in_progress',
    'client_review',
    'changes_requested',
    'approved',
    'delivered',
    'on_hold',
    'cancelled',
  ]) {
    assert.match(sql, new RegExp(`'${status}'`, 'i'));
  }

  assert.match(sql, /check\s*\(\s*visibility in\s*\(\s*'shared'\s*,\s*'internal'\s*\)\s*\)/i);
  assert.match(sql, /char_length\(btrim\(title\)\) between 3 and 120/i);
  assert.match(sql, /char_length\(btrim\(brief\)\) between 1 and 10000/i);
  assert.match(sql, /char_length\(btrim\(body\)\) between 1 and 10000/i);
  assert.match(sql, /char_length\(btrim\(file_name\)\) between 1 and 255/i);
  assert.match(sql, /size_bytes > 0[\s\S]*size_bytes <= 52428800/i);
});

test('0009 creates every required helper and authenticated command with fixed search paths', async () => {
  const sql = await readMigration();
  const helpers = [
    'current_profile_role',
    'can_access_project',
    'can_view_internal',
    'can_subscribe_project_topic',
  ];
  const commands = [
    'create_project',
    'assign_project_user',
    'remove_project_assignment',
    'transition_project_status',
    'reserve_project_attachment',
    'post_project_message',
    'finalize_project_attachment',
  ];

  for (const helper of helpers) {
    assert.match(sql, new RegExp(`create or replace function private\\.${helper}\\b`, 'i'));
  }

  for (const command of commands) {
    const body = functionBody(sql, command);
    assert.match(body, /security definer/i);
    assert.match(body, /set search_path = pg_catalog, public, private, storage/i);
    assert.match(body, /auth\.uid\(\)/i);
    assert.match(body, /insert into public\.audit_events/i);
    assert.match(
      sql,
      new RegExp(`revoke all on function public\\.${command}\\([^;]*\\) from public\\s*;`, 'i'),
    );
    assert.match(
      sql,
      new RegExp(`revoke all on function public\\.${command}\\([^;]*\\) from anon\\s*;`, 'i'),
    );
    assert.match(
      sql,
      new RegExp(`grant execute on function public\\.${command}\\([^;]*\\) to authenticated\\s*;`, 'i'),
    );
  }

  assert.match(
    functionBody(sql, 'transition_project_status'),
    /from public\.projects[\s\S]*for update/i,
  );
  assert.match(
    functionBody(sql, 'assign_project_user'),
    /role::text in\s*\(\s*'project_manager'\s*,\s*'admin'\s*\)/i,
  );
  assert.match(
    functionBody(sql, 'post_project_message'),
    /status = 'ready'[\s\S]*uploaded_by = v_user_id[\s\S]*project_id = p_project_id/i,
  );
});

test('0009 gives every security-definer function a fixed path and caller identity check', async () => {
  const sql = await readMigration();
  const securityDefiners = [
    'current_profile_role',
    'can_access_project',
    'can_view_internal',
    'can_subscribe_project_topic',
    'create_project',
    'assign_project_user',
    'remove_project_assignment',
    'transition_project_status',
    'reserve_project_attachment',
    'post_project_message',
    'finalize_project_attachment',
    'broadcast_project_message',
  ];

  for (const name of securityDefiners) {
    const body = functionBody(sql, name);
    assert.match(body, /security definer/i);
    assert.match(body, /set search_path = pg_catalog, public, private, storage/i);
    assert.match(body, /auth\.uid\(\)/i, `${name} must bind work to an authenticated caller`);
  }
});

test('0009 enables and forces RLS without direct browser mutation policies', async () => {
  const sql = await readMigration();
  const tables = [
    'projects',
    'project_threads',
    'project_assignments',
    'project_messages',
    'project_attachments',
    'project_status_history',
    'audit_events',
  ];

  for (const table of tables) {
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} enable row level security`, 'i'),
    );
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} force row level security`, 'i'),
    );
  }

  const createdDomainPolicies = (sql.match(/create policy[\s\S]*?;/gi) ?? [])
    .filter((policy) => /on public\.(?:projects|project_threads|project_assignments|project_messages|project_attachments|project_status_history|audit_events)\b/i.test(policy))
    .join('\n');

  assert.match(createdDomainPolicies, /to authenticated/i);
  assert.match(createdDomainPolicies, /private\.can_access_project/i);
  assert.match(createdDomainPolicies, /private\.can_view_internal/i);
  assert.match(
    createdDomainPolicies,
    /audit_events[\s\S]*for select[\s\S]*private\.current_profile_role\(\)\s*=\s*'admin'/i,
  );
  assert.doesNotMatch(createdDomainPolicies, /\bfor\s+(?:insert|update|delete|all)\b/i);
  assert.match(sql, /\(\s*select auth\.uid\(\)\s*\)/i);
});

test('0009 supplies every foreign-key and list-filter index', async () => {
  const sql = await readMigration();
  const indexes = [
    'projects_company_created_idx',
    'projects_status_created_idx',
    'projects_source_deal_idx',
    'projects_created_by_idx',
    'project_assignments_user_project_idx',
    'project_assignments_project_idx',
    'project_assignments_assigned_by_idx',
    'project_messages_thread_created_idx',
    'project_messages_sender_idx',
    'project_attachments_project_status_idx',
    'project_attachments_message_idx',
    'project_attachments_uploaded_by_idx',
    'project_status_history_project_created_idx',
    'project_status_history_changed_by_idx',
    'audit_events_project_created_idx',
    'audit_events_company_idx',
    'audit_events_actor_idx',
  ];

  for (const index of indexes) {
    assert.match(sql, new RegExp(`create index ${index}\\b`, 'i'));
  }
});

test('0009 restricts private Storage paths to owned reservations without overwrite', async () => {
  const sql = await readMigration();
  const storagePolicies = (sql.match(/create policy[\s\S]*?;/gi) ?? [])
    .filter((policy) => /on storage\.objects\b/i.test(policy))
    .join('\n');

  assert.match(sql, /values\s*\(\s*'project-files'\s*,\s*'project-files'\s*,\s*false\s*\)/i);
  assert.match(storagePolicies, /bucket_id\s*=\s*'project-files'/i);
  assert.match(storagePolicies, /storage\.foldername\(name\)/i);
  assert.match(storagePolicies, /storage_path\s*=\s*name/i);
  assert.match(storagePolicies, /uploaded_by\s*=\s*\(\s*select auth\.uid\(\)\s*\)/i);
  assert.match(storagePolicies, /status\s*=\s*'pending'/i);
  assert.match(storagePolicies, /status\s*=\s*'ready'/i);
  assert.doesNotMatch(storagePolicies, /\bfor\s+update\b/i);
  assert.match(
    sql,
    /drop policy if exists "Deal participants can upload project files" on storage\.objects/i,
  );
});

test('0009 authorizes exact private Realtime topics and broadcasts identifiers only', async () => {
  const sql = await readMigration();
  const broadcaster = functionBody(sql, 'broadcast_project_message');
  const realtimePolicies = (sql.match(/create policy[\s\S]*?;/gi) ?? [])
    .filter((policy) => /on realtime\.messages\b/i.test(policy))
    .join('\n');

  assert.match(sql, /\^project:\[0-9a-f\]\{8\}-/i);
  assert.match(sql, /project:'\s*\|\|\s*v_project_id::text\s*\|\|\s*':'\s*\|\|\s*new\.visibility/i);
  assert.match(realtimePolicies, /for select\s+to authenticated/i);
  assert.match(realtimePolicies, /realtime\.topic\(\)/i);
  assert.match(realtimePolicies, /private\.can_subscribe_project_topic/i);
  assert.match(broadcaster, /realtime\.send/i);
  assert.match(broadcaster, /'message_id'/i);
  assert.match(broadcaster, /'project_id'/i);
  assert.match(broadcaster, /'visibility'/i);
  assert.match(broadcaster, /'created_at'/i);
  assert.doesNotMatch(broadcaster, /new\.body|\bbody\b/i);
});
