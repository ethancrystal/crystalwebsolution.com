import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0009_project_workspace.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

// Capture a whole CREATE FUNCTION definition (header + body), from the
// `create ... function public.NAME` up to and including its closing `$$;`.
function functionDef(sql, name) {
  const match = sql.match(
    new RegExp(
      `create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${name}\\b[\\s\\S]*?\\$\\$[\\s\\S]*?\\$\\;`,
      'i',
    ),
  );
  assert.ok(match, `expected ${name} function definition`);
  return match[0];
}

const NEW_TABLES = [
  'projects',
  'project_members',
  'project_status_history',
  'project_tasks',
  'project_deliverables',
  'project_approvals',
  'notifications_outbox',
  'audit_events',
];

const COMMAND_RPCS = [
  'create_delivery_project',
  'transition_project_status',
  'record_project_approval',
  'publish_project_deliverable',
];

test('0009 creates the complete UUID project delivery aggregate', async () => {
  const sql = await readMigration();

  for (const table of NEW_TABLES) {
    assert.match(
      sql,
      new RegExp(
        `create table public\\.${table}\\s*\\([\\s\\S]*?\\bid uuid primary key default gen_random_uuid\\(\\)`,
        'i',
      ),
      `${table} must use a generated UUID primary key`,
    );
  }

  // Children cascade with their parent project.
  for (const child of [
    'project_members',
    'project_status_history',
    'project_tasks',
    'project_deliverables',
    'project_approvals',
  ]) {
    assert.match(
      sql,
      /project_id uuid not null references public\.projects\(id\) on delete cascade/i,
      `${child} must reference projects on delete cascade`,
    );
  }

  // source_deal_id is optional and unique (won deal -> one project).
  assert.match(
    sql,
    /source_deal_id uuid unique references public\.deals\(id\)/i,
    'projects.source_deal_id must be a unique optional reference to deals',
  );

  // project_members has a composite primary key (one role per user per project).
  assert.match(
    sql,
    /primary key\s*\(\s*project_id\s*,\s*user_id\s*\)/i,
    'project_members must have a (project_id, user_id) primary key',
  );

  // audit_events carries actor + project + company context.
  assert.match(sql, /actor_id uuid not null references auth\.users\(id\)/i);
  assert.match(sql, /company_id uuid references public\.companies\(id\)/i);
});

test('0009 constrains canonical statuses, project types, and content bounds', async () => {
  const sql = await readMigration();

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

  for (const type of ['web_design', 'logo_creation', 'branding', 'marketing', 'ai_automation']) {
    assert.match(sql, new RegExp(`'${type}'`, 'i'));
  }

  assert.match(sql, /check\s*\(\s*status in\s*\(/i, 'projects.status must be a checked enum');
  assert.match(sql, /char_length\(btrim\(name\)\) between 3 and 120/i);
  assert.match(sql, /char_length\(btrim\(summary\)\) between 0 and 10000/i);
  assert.match(sql, /budget_amount >= 0/i);
  assert.match(sql, /size_bytes > 0[\s\S]*size_bytes <= 52428800/i);
});

test('0009 encodes the allowed status-transition rules in transition_project_status', async () => {
  const def = functionDef(await readMigration(), 'transition_project_status');

  const allowed = [
    'brief_submitted:planned',
    'planned:in_progress',
    'in_progress:client_review',
    'client_review:changes_requested',
    'client_review:approved',
    'changes_requested:in_progress',
    'approved:delivered',
    'on_hold:in_progress',
  ];
  for (const pair of allowed) {
    assert.match(def, new RegExp(`'${pair}'`, 'i'), `transition ${pair} must be allowed`);
  }

  // Disallowed transitions must NOT appear as allowed pairs.
  const forbidden = ['delivered:in_progress', 'brief_submitted:in_progress', 'planned:client_review'];
  for (const pair of forbidden) {
    assert.doesNotMatch(def, new RegExp(`'${pair}'`, 'i'), `transition ${pair} must be rejected`);
  }

  assert.match(def, /for update/i, 'transition must lock the project row');
  assert.match(def, /illegal status transition/i, 'transition must raise on illegal moves');
});

test('0009 creates every required command RPC with fixed search paths and caller binding', async () => {
  const sql = await readMigration();

  for (const command of COMMAND_RPCS) {
    const def = functionDef(sql, command);
    assert.match(def, /security definer/i, `${command} must be SECURITY DEFINER`);
    assert.match(def, /set search_path = pg_catalog, public/i, `${command} must fix its search_path`);
    assert.match(def, /auth\.uid\(\)/i, `${command} must bind work to an authenticated caller`);
    assert.match(def, /insert into public\.audit_events/i, `${command} must write an audit event`);
  }

  // Commands that affect other members must enqueue notifications.
  for (const command of ['transition_project_status', 'record_project_approval', 'publish_project_deliverable']) {
    const def = functionDef(sql, command);
    assert.match(def, /insert into public\.notifications_outbox/i, `${command} must enqueue notifications`);
  }

  // create_delivery_project must require admin/PM and assign the creating PM.
  const createDef = functionDef(sql, 'create_delivery_project');
  assert.match(createDef, /insert into public\.project_members/i, 'create must assign the creating PM as a member');
  assert.match(
    createDef,
    /is distinct from 'admin' and[\s\S]*is distinct from 'project_manager'/i,
    'create must require admin or project_manager',
  );
});

test('0009 revokes public/anon execution and grants only to authenticated', async () => {
  const sql = await readMigration();
  const signatures = {
    create_delivery_project: 'uuid, text, text, text, uuid, date, numeric, text',
    transition_project_status: 'uuid, text, text',
    record_project_approval: 'uuid, uuid, text, text',
    publish_project_deliverable: 'uuid, uuid',
  };

  for (const [command, sig] of Object.entries(signatures)) {
    const argPattern = sig.split(',').map((a) => a.trim()).join('[\\s\\S]*?');
    const fnPattern = new RegExp(
      `function public\\.${command}\\s*\\([\\s\\S]*?${argPattern}[\\s\\S]*?\\)`,
      'i',
    );

    assert.match(
      sql,
      new RegExp(`${fnPattern.source}[\\s\\S]*?from[\\s\\S]*?public[\\s\\S]*?;`, 'i'),
      `${command} must revoke public execution`,
    );
    assert.match(
      sql,
      new RegExp(`${fnPattern.source}[\\s\\S]*?from[\\s\\S]*?anon[\\s\\S]*?;`, 'i'),
      `${command} must revoke anon execution`,
    );
    assert.match(
      sql,
      new RegExp(`${fnPattern.source}[\\s\\S]*?to[\\s\\S]*?authenticated[\\s\\S]*?;`, 'i'),
      `${command} must grant authenticated execution`,
    );
  }

  assert.doesNotMatch(sql, /\bprivate\./i, 'Task 3 aggregate must use the public schema, not a private one');
});

test('0009 enables and forces RLS with select-only domain policies', async () => {
  const sql = await readMigration();

  for (const table of NEW_TABLES) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
  }

  const domainPolicies = (sql.match(/create policy[\s\S]*?;/gi) ?? [])
    .filter((policy) =>
      NEW_TABLES.some((t) => new RegExp(`on public\\.${t}\\b`, 'i').test(policy)),
    )
    .join('\n');

  assert.match(domainPolicies, /to authenticated/i, 'domain policies must target authenticated');
  assert.match(domainPolicies, /public\.can_access_project/i, 'domain read must call can_access_project');
  assert.match(
    domainPolicies,
    /audit_events[\s\S]*for select[\s\S]*public\.current_profile_role\(\)\s*=\s*'admin'/i,
    'audit_events must be admin-read-only',
  );
  assert.doesNotMatch(domainPolicies, /\bfor\s+(?:insert|update|delete|all)\b/i,
    'no direct browser mutation policies on domain tables');
});

test('0009 rebinds legacy project_messages/project_files onto projects', async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /alter table public\.project_messages\s+add column if not exists project_id uuid references public\.projects\(id\) on delete cascade/i,
  );
  assert.match(
    sql,
    /alter table public\.project_files\s+add column if not exists project_id uuid references public\.projects\(id\) on delete cascade/i,
  );
  assert.match(sql, /idx_project_messages_project_id/i);
  assert.match(sql, /idx_project_files_project_id/i);

  // Rebinding keeps deal-based access AND adds project-based access.
  const messagePolicies = (sql.match(/create policy[\s\S]*?;/gi) ?? [])
    .filter((p) => /on public\.project_messages\b/i.test(p))
    .join('\n');
  assert.match(messagePolicies, /can_access_project\(project_id\)/i);
  assert.match(messagePolicies, /can_access_deal\(deal_id\)/i);
});

test('0009 supplies every foreign-key and list-filter index', async () => {
  const sql = await readMigration();
  const indexes = [
    'projects_company_created_idx',
    'projects_status_created_idx',
    'projects_source_deal_idx',
    'projects_created_by_idx',
    'project_members_user_project_idx',
    'project_members_project_idx',
    'project_members_assigned_by_idx',
    'project_status_history_project_created_idx',
    'project_status_history_changed_by_idx',
    'project_tasks_project_idx',
    'project_tasks_assignee_idx',
    'project_tasks_status_idx',
    'project_approvals_project_idx',
    'project_approvals_deliverable_idx',
    'project_approvals_decision_idx',
    'project_deliverables_project_idx',
    'project_deliverables_published_idx',
    'notifications_outbox_recipient_idx',
    'notifications_outbox_project_idx',
    'notifications_outbox_available_idx',
    'audit_events_project_created_idx',
    'audit_events_company_idx',
    'audit_events_actor_idx',
  ];

  for (const index of indexes) {
    assert.match(sql, new RegExp(`create index ${index}\\b`, 'i'), `missing index ${index}`);
  }
});
