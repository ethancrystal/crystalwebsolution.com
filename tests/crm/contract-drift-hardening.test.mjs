import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  ALLOWED_TRANSITIONS,
  APPROVAL_DECISION_STATUSES,
  APPROVAL_STATUSES,
  DELIVERABLE_PUBLISH_STATUSES,
  DELIVERABLE_STATUSES,
  PROJECT_STATUSES,
  RECORD_VISIBILITIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TERMINAL_PROJECT_STATUSES,
} from '../../lib/crm/project-contract.mjs';

// ---------------------------------------------------------------------------
// Source-pin hardening for the CRM status domains.
//
// The 2026-09 drift audit found the contract domains re-hardcoded as inline
// literals in server actions, admin pages and SQL RPC guards. Every call site
// now imports the contract constants; these tests pin the remaining literals
// (the SQL guards, which live in applied migrations and must not be edited)
// to those constants, so either side can never move without this suite
// failing.
// ---------------------------------------------------------------------------

async function readSource(path) {
  return readFile(path, 'utf8');
}

function functionBlock(sql, name) {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0, `public.${name} is defined`);
  const end = sql.indexOf('$function$;', start);
  assert.ok(end > start, `public.${name} has a closed body`);
  return sql.slice(start, end + '$function$;'.length);
}

/** Pull the quoted values out of a `p_x is null or p_x not in (...)` guard. */
function guardValues(block, column, description) {
  const pattern = new RegExp(`${column} is null or ${column} not in \\(([^)]*)\\)`);
  const match = block.match(pattern);
  assert.ok(match, `could not locate the ${column} guard: ${description}`);
  return [...match[1].matchAll(/'([a-z_]+)'/g)].map((entry) => entry[1]);
}

function sorted(values) {
  return [...values].sort();
}

// ---------------------------------------------------------------------------
// (a) The SQL RPC guards in migration 0047 stay pinned to the contract.
// The migration itself is applied history and is never edited; if the
// contract ever changes, a new migration restates the guards and these pins
// are updated together with it.
// ---------------------------------------------------------------------------

const MIGRATION_0047 = 'supabase/migrations/0047_staff_only_task_and_deliverable_rpcs.sql';

test('0047 create_project_task guards exactly the TASK_STATUSES domain', async () => {
  const block = functionBlock(await readSource(MIGRATION_0047), 'create_project_task');
  assert.deepStrictEqual(
    sorted(guardValues(block, 'p_status', 'create_project_task')),
    sorted(TASK_STATUSES),
  );
});

test('0047 create_project_task guards exactly the TASK_PRIORITIES domain', async () => {
  const block = functionBlock(await readSource(MIGRATION_0047), 'create_project_task');
  assert.deepStrictEqual(
    sorted(guardValues(block, 'p_priority', 'create_project_task')),
    sorted(TASK_PRIORITIES),
  );
});

test('0047 create_project_deliverable guards exactly the record visibility domain', async () => {
  const block = functionBlock(await readSource(MIGRATION_0047), 'create_project_deliverable');
  const match = block.match(/p_visibility not in \(([^)]*)\)/);
  assert.ok(match, 'create_project_deliverable has a visibility guard');
  const values = [...match[1].matchAll(/'([a-z_]+)'/g)].map((entry) => entry[1]);
  assert.deepStrictEqual(sorted(values), sorted(RECORD_VISIBILITIES));
});

test('0047 publish_project_deliverable guard equals DELIVERABLE_PUBLISH_STATUSES', async () => {
  const block = functionBlock(await readSource(MIGRATION_0047), 'publish_project_deliverable');
  assert.deepStrictEqual(
    sorted(guardValues(block, 'p_status', 'publish_project_deliverable')),
    sorted(DELIVERABLE_PUBLISH_STATUSES),
  );
});

test('0011 update_project_approval guard equals APPROVAL_DECISION_STATUSES', async () => {
  const block = functionBlock(
    await readSource('supabase/migrations/0011_workspace_hardening_from_main.sql'),
    'update_project_approval',
  );
  assert.deepStrictEqual(
    sorted(guardValues(block, 'p_status', 'update_project_approval')),
    sorted(APPROVAL_DECISION_STATUSES),
  );
});

// ---------------------------------------------------------------------------
// The new contract constants are deliberate subsets, not copies.
// ---------------------------------------------------------------------------

test('APPROVAL_DECISION_STATUSES is APPROVAL_STATUSES minus pending', () => {
  assert.ok(APPROVAL_DECISION_STATUSES.length > 0);
  for (const value of APPROVAL_DECISION_STATUSES) {
    assert.ok(APPROVAL_STATUSES.includes(value), `${value} is a real approval status`);
  }
  assert.ok(!APPROVAL_DECISION_STATUSES.includes('pending'),
    'a reviewer decision can never put an approval back to pending');
  assert.deepStrictEqual(sorted(APPROVAL_DECISION_STATUSES), ['approved', 'rejected']);
});

test('DELIVERABLE_PUBLISH_STATUSES is DELIVERABLE_STATUSES minus draft', () => {
  assert.ok(DELIVERABLE_PUBLISH_STATUSES.length > 0);
  for (const value of DELIVERABLE_PUBLISH_STATUSES) {
    assert.ok(DELIVERABLE_STATUSES.includes(value), `${value} is a real deliverable status`);
  }
  assert.ok(!DELIVERABLE_PUBLISH_STATUSES.includes('draft'),
    'publishing can never put a deliverable back into draft');
  assert.deepStrictEqual(sorted(DELIVERABLE_PUBLISH_STATUSES), ['approved', 'rejected', 'submitted']);
});

test('TERMINAL_PROJECT_STATUSES is exactly the statuses with no outgoing transition', () => {
  const terminalFromMatrix = Object.entries(ALLOWED_TRANSITIONS)
    .filter(([, allowed]) => allowed.length === 0)
    .map(([from]) => from);

  assert.deepStrictEqual(sorted(TERMINAL_PROJECT_STATUSES), sorted(terminalFromMatrix));
  for (const status of TERMINAL_PROJECT_STATUSES) {
    assert.ok(PROJECT_STATUSES.includes(status), `${status} is a real project status`);
  }
});

// ---------------------------------------------------------------------------
// (b) app/actions/project-actions.js validates through the contract.
// ---------------------------------------------------------------------------

const PROJECT_ACTIONS = 'app/actions/project-actions.js';

test('project-actions has no literal task-status array; createProjectTask uses TASK_STATUSES', async () => {
  const source = await readSource(PROJECT_ACTIONS);

  assert.doesNotMatch(source, /'todo'\s*,\s*'in_progress'\s*,\s*'review'/,
    'the task-status domain must come from TASK_STATUSES, not a literal');

  const createTask = source.slice(
    source.indexOf('export async function createProjectTask(formData) {'),
    source.indexOf('export async function updateProjectTask(formData) {'),
  );
  assert.match(createTask, /!TASK_STATUSES\.includes\(status\)/,
    'createProjectTask validates the task status through the contract');
});

test('project-actions decides approvals through APPROVAL_DECISION_STATUSES', async () => {
  const source = await readSource(PROJECT_ACTIONS);

  assert.match(source, /import \{[\s\S]*?APPROVAL_DECISION_STATUSES[\s\S]*?\} from '@\/lib\/crm\/project-contract\.mjs';/);
  assert.doesNotMatch(source, /\['approved'\s*,\s*'rejected'\]/,
    'the approval-decision subset must come from the contract, not a literal');

  const review = source.slice(
    source.indexOf('export async function updateProjectApproval(formData) {'),
    source.indexOf('export async function publishDeliverable(formData) {'),
  );
  assert.match(review, /!APPROVAL_DECISION_STATUSES\.includes\(status\)/,
    'updateProjectApproval validates through the contract subset');
});

test('project-actions publishes deliverables through DELIVERABLE_PUBLISH_STATUSES', async () => {
  const source = await readSource(PROJECT_ACTIONS);

  assert.match(source, /import \{[\s\S]*?DELIVERABLE_PUBLISH_STATUSES[\s\S]*?\} from '@\/lib\/crm\/project-contract\.mjs';/);
  assert.doesNotMatch(source, /\['submitted'\s*,\s*'approved'\s*,\s*'rejected'\]/,
    'the publish-status subset must come from the contract, not a literal');

  const publish = source.slice(
    source.indexOf('export async function publishDeliverable(formData) {'),
    source.indexOf('function deliverableData(row) {'),
  );
  assert.match(publish, /!DELIVERABLE_PUBLISH_STATUSES\.includes\(status\)/,
    'publishDeliverable validates through the contract subset');
});

// ---------------------------------------------------------------------------
// (c) The three terminal-status sites import the contract constant.
// ---------------------------------------------------------------------------

// The admin overview no longer keeps its own set: it asks lib/crm/work-queue.mjs
// whether a project is open, and that reads the set in lib/crm/labels.mjs.
const TERMINAL_SITES = [
  'lib/crm/labels.mjs',
  'app/admin/projects/page.jsx',
  'app/actions/assignment-actions.js',
];

for (const path of TERMINAL_SITES) {
  test(`${path} derives its closed-status set from TERMINAL_PROJECT_STATUSES`, async () => {
    const source = await readSource(path);

    // The alias form inside Next code; plain-ESM modules under lib/crm import
    // the contract relatively so they also run under `node --test`.
    assert.match(source, /import \{[^}]*TERMINAL_PROJECT_STATUSES[^}]*\} from '(?:@\/lib\/crm|\.)\/project-contract\.mjs';/,
      'imports the contract constant');
    assert.match(source, /new Set\(TERMINAL_PROJECT_STATUSES\)/,
      'builds its closed set from the constant');
    assert.doesNotMatch(source, /new Set\(\[\s*'delivered'\s*,\s*'cancelled'\s*\]\)/,
      'no literal terminal-status set remains');
  });
}

// ---------------------------------------------------------------------------
// (d) The admin project filter is derived, with byte-identical rendered text.
// ---------------------------------------------------------------------------

const ADMIN_PROJECTS_PAGE = 'app/admin/projects/page.jsx';

// The exact option list the page rendered before the derivation. If the
// derived list ever stops matching this, the refactor stopped being
// behavior-preserving and this test must be updated deliberately.
const RENDERED_FILTER_OPTIONS = Object.freeze([
  { value: '', label: 'All statuses' },
  { value: 'brief_submitted', label: 'Brief Submitted' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'client_review', label: 'Client Review' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
]);

test('the admin projects page derives its status filter from PROJECT_STATUSES', async () => {
  const source = await readSource(ADMIN_PROJECTS_PAGE);

  assert.match(source, /PROJECT_STATUSES\.map\(/,
    'filter options are mapped from the contract');
  assert.doesNotMatch(source, /\{\s*value:\s*'[a-z_]+'\s*,\s*label:\s*'[^']+'\s*\}/,
    'no per-status option literal remains');
});

test('the derived filter renders exactly the options the page has always rendered', () => {
  // Mirrors the derivation in app/admin/projects/page.jsx. Kept in lockstep
  // on purpose: this is the pin that the refactor changed no rendered text.
  const derived = [
    { value: '', label: 'All statuses' },
    ...PROJECT_STATUSES.map((status) => ({
      value: status,
      label: status
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    })),
  ];

  assert.deepStrictEqual(derived, [...RENDERED_FILTER_OPTIONS]);
  assert.strictEqual(derived.length, PROJECT_STATUSES.length + 1,
    'every contract status has exactly one filter option');
});
