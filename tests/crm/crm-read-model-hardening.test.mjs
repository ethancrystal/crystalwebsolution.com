import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  listProjectTasks,
  listProjectMessages,
  listProjectsForViewer,
  getProjectWorkspace,
} from '../../lib/crm/projects.js';
import {
  ALLOWED_TRANSITIONS,
  APPROVAL_STATUSES,
  ATTACHMENT_STATUSES,
  DELIVERABLE_STATUSES,
  PROJECT_STATUSES,
  RECORD_VISIBILITIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  isTaskPriority,
} from '../../lib/crm/project-contract.mjs';

// ---------------------------------------------------------------------------
// Minimal PostgREST-shaped fake. Applies eq/in/order/limit for real so the
// read model's own scoping and pagination decisions are what get exercised,
// rather than a hand-fed result set.
// ---------------------------------------------------------------------------
function createFakeSupabase(tables, calls = []) {
  return {
    from(table) {
      const state = { table, eq: [], in: [], order: [], limit: null };
      calls.push(state);

      const resolve = () => {
        let rows = [...(tables[table] ?? [])];

        for (const [column, value] of state.eq) {
          rows = rows.filter((row) => row[column] === value);
        }
        for (const [column, values] of state.in) {
          rows = rows.filter((row) => values.includes(row[column]));
        }
        for (const [column, ascending] of [...state.order].reverse()) {
          rows.sort((a, b) => {
            if (a[column] === b[column]) return 0;
            const less = a[column] < b[column] ? -1 : 1;
            return ascending ? less : -less;
          });
        }
        if (state.limit !== null) rows = rows.slice(0, state.limit);

        return { data: rows, error: null };
      };

      const builder = {
        select() {
          return builder;
        },
        eq(column, value) {
          state.eq.push([column, value]);
          return builder;
        },
        in(column, values) {
          state.in.push([column, values]);
          return builder;
        },
        or(expression) {
          state.or = expression;
          return builder;
        },
        order(column, options = {}) {
          state.order.push([column, options.ascending !== false]);
          return builder;
        },
        limit(count) {
          state.limit = count;
          return builder;
        },
        async maybeSingle() {
          const { data, error } = resolve();
          return { data: data[0] ?? null, error };
        },
        then(onFulfilled, onRejected) {
          return Promise.resolve(resolve()).then(onFulfilled, onRejected);
        },
      };

      return builder;
    },
  };
}

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const COMPANY_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_COMPANY_ID = '44444444-4444-4444-8444-444444444444';
const PM_ID = '55555555-5555-4555-8555-555555555555';
const CLIENT_ID = '66666666-6666-4666-8666-666666666666';
const THREAD_ID = '77777777-7777-4777-8777-777777777777';

const pmViewer = { id: PM_ID, role: 'project_manager', company_id: null };
const clientViewer = { id: CLIENT_ID, role: 'client', company_id: COMPANY_ID };
const adminViewer = {
  id: '88888888-8888-4888-8888-888888888888',
  role: 'admin',
  company_id: null,
};

function baseTables(overrides = {}) {
  return {
    projects: [
      {
        id: PROJECT_ID,
        company_id: COMPANY_ID,
        title: 'In scope',
        status: 'in_progress',
        created_by: PM_ID,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: OTHER_PROJECT_ID,
        company_id: OTHER_COMPANY_ID,
        title: 'Out of scope',
        status: 'in_progress',
        created_by: PM_ID,
        created_at: '2026-01-02T00:00:00.000Z',
      },
    ],
    project_assignments: [],
    project_tasks: [
      {
        id: '99999999-9999-4999-8999-999999999999',
        project_id: PROJECT_ID,
        title: 'Client visible task',
        client_visible: true,
        priority: 'high',
        status: 'todo',
        created_by: PM_ID,
        assignee_id: null,
        created_at: '2026-01-03T00:00:00.000Z',
      },
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        project_id: PROJECT_ID,
        title: 'Staff only task',
        client_visible: false,
        priority: 'low',
        status: 'todo',
        created_by: PM_ID,
        assignee_id: null,
        created_at: '2026-01-04T00:00:00.000Z',
      },
    ],
    project_threads: [
      { id: THREAD_ID, project_id: PROJECT_ID, created_at: '2026-01-01T00:00:00.000Z' },
    ],
    project_messages: [],
    project_attachments: [],
    profiles: [{ id: PM_ID, full_name: 'PM Person', avatar_url: null }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Read-model scoping
// ---------------------------------------------------------------------------

test('a project manager with no assignment row reads an out-of-scope project as empty', async () => {
  const supabase = createFakeSupabase(baseTables());

  assert.deepStrictEqual(await listProjectTasks(supabase, pmViewer, PROJECT_ID), []);
});

test('a project manager assigned to the project reads its tasks', async () => {
  const supabase = createFakeSupabase(
    baseTables({
      project_assignments: [
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          project_id: PROJECT_ID,
          user_id: PM_ID,
          assigned_by: PM_ID,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    }),
  );

  const tasks = await listProjectTasks(supabase, pmViewer, PROJECT_ID);
  assert.strictEqual(tasks.length, 2, 'staff see client-visible and staff-only tasks');
});

test('the project-manager scope check filters on both project and viewer id', async () => {
  const calls = [];
  const supabase = createFakeSupabase(baseTables(), calls);

  await listProjectTasks(supabase, pmViewer, PROJECT_ID);

  const scopeCheck = calls.find((call) => call.table === 'project_assignments');
  assert.ok(scopeCheck, 'the detail path must verify the assignment itself');
  const filtered = Object.fromEntries(scopeCheck.eq);
  assert.strictEqual(filtered.project_id, PROJECT_ID);
  assert.strictEqual(filtered.user_id, PM_ID);
});

test('a client cannot read a project belonging to another company', async () => {
  const supabase = createFakeSupabase(baseTables());

  assert.deepStrictEqual(
    await listProjectTasks(supabase, clientViewer, OTHER_PROJECT_ID),
    [],
  );
});

test('a client only receives client_visible tasks', async () => {
  const supabase = createFakeSupabase(baseTables());

  const tasks = await listProjectTasks(supabase, clientViewer, PROJECT_ID);
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].title, 'Client visible task');
});

test('an admin is not narrowed by company or assignment', async () => {
  const supabase = createFakeSupabase(baseTables());

  const tasks = await listProjectTasks(supabase, adminViewer, PROJECT_ID);
  assert.strictEqual(tasks.length, 2);
});

test('listProjectsForViewer scopes a client to its own company', async () => {
  const supabase = createFakeSupabase(baseTables());

  const projects = await listProjectsForViewer(supabase, clientViewer);
  assert.deepStrictEqual(
    projects.map((project) => project.id),
    [PROJECT_ID],
  );
});

test('listProjectsForViewer strips internal project columns for a client', async () => {
  const supabase = createFakeSupabase(baseTables());

  const [project] = await listProjectsForViewer(supabase, clientViewer);
  assert.ok(!('created_by' in project), 'created_by is staff-only');
  assert.ok(!('source_deal_id' in project), 'source_deal_id is staff-only');
});

test('admin project lists include company display context', async () => {
  const supabase = createFakeSupabase(
    baseTables({
      companies: [
        { id: COMPANY_ID, name: 'Crystal Web Solution' },
        { id: OTHER_COMPANY_ID, name: 'Other Company' },
      ],
    }),
  );

  const projects = await listProjectsForViewer(supabase, adminViewer);
  const project = projects.find((row) => row.id === PROJECT_ID);
  assert.deepStrictEqual(project.company, { id: COMPANY_ID, name: 'Crystal Web Solution' });
});

test('staff project workspaces include company display context', async () => {
  const supabase = createFakeSupabase(
    baseTables({
      companies: [{ id: COMPANY_ID, name: 'Crystal Web Solution' }],
    }),
  );

  const workspace = await getProjectWorkspace(supabase, adminViewer, PROJECT_ID);
  assert.deepStrictEqual(workspace.project.company, { id: COMPANY_ID, name: 'Crystal Web Solution' });
});

// ---------------------------------------------------------------------------
// Viewer validation -- fail closed, generic message
// ---------------------------------------------------------------------------

for (const [label, profile] of [
  ['a null profile', null],
  ['an unknown role', { id: PM_ID, role: 'superuser' }],
  ['a non-uuid id', { id: 'not-a-uuid', role: 'admin' }],
  ['a client with no company', { id: CLIENT_ID, role: 'client', company_id: null }],
]) {
  test(`${label} is refused before any query runs`, async () => {
    const calls = [];
    const supabase = createFakeSupabase(baseTables(), calls);

    await assert.rejects(
      () => listProjectTasks(supabase, profile, PROJECT_ID),
      /Unable to authorize project access\./,
    );
    assert.strictEqual(calls.length, 0, 'must not touch the database');
  });
}

test('a malformed project id is refused before any query runs', async () => {
  const calls = [];
  const supabase = createFakeSupabase(baseTables(), calls);

  await assert.rejects(
    () => listProjectTasks(supabase, adminViewer, "' or 1=1 --"),
    /Unable to load this project\./,
  );
  assert.strictEqual(calls.length, 0);
});

test('a read error surfaces a generic failure, never the driver detail', async () => {
  const supabase = {
    from() {
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => ({
          data: null,
          error: { message: 'permission denied for relation projects', code: '42501' },
        }),
        then: (onFulfilled) =>
          Promise.resolve({
            data: null,
            error: { message: 'permission denied for relation projects', code: '42501' },
          }).then(onFulfilled),
      };
      return builder;
    },
  };

  await assert.rejects(
    () => listProjectTasks(supabase, adminViewer, PROJECT_ID),
    (error) => {
      // The outer wrapper relabels any inner failure to its own generic
      // message; either way the driver's text must not escape.
      assert.match(error.message, /^Unable to load (this project|project tasks)\.$/);
      assert.doesNotMatch(error.message, /permission denied|42501|relation/);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// Pagination must be measured on the raw page, not the filtered one
// ---------------------------------------------------------------------------

function messageRow(suffix, visibility, createdAt) {
  return {
    id: `cccccccc-cccc-4ccc-8ccc-cccccccccc${suffix}`,
    thread_id: THREAD_ID,
    sender_id: PM_ID,
    visibility,
    body: `message ${suffix}`,
    created_at: createdAt,
  };
}

test('a full page whose internal rows are filtered out still reports a next cursor', async () => {
  const supabase = createFakeSupabase(
    baseTables({
      project_messages: [
        messageRow('01', 'shared', '2026-02-01T00:00:00.000Z'),
        messageRow('02', 'internal', '2026-02-02T00:00:00.000Z'),
        messageRow('03', 'shared', '2026-02-03T00:00:00.000Z'),
        messageRow('04', 'shared', '2026-01-31T00:00:00.000Z'),
      ],
    }),
  );

  const page = await listProjectMessages(supabase, clientViewer, PROJECT_ID, null, 3);

  assert.strictEqual(page.messages.length, 2, 'the internal row is withheld from the client');
  assert.ok(
    page.nextCursor,
    'the page was full before filtering, so older messages remain reachable',
  );
  assert.strictEqual(
    page.nextCursor.createdAt,
    '2026-02-01T00:00:00.000Z',
    'the cursor is the oldest row of the raw page, not of the filtered list',
  );
});

test('a partial page reports no next cursor', async () => {
  const supabase = createFakeSupabase(
    baseTables({
      project_messages: [messageRow('01', 'shared', '2026-02-01T00:00:00.000Z')],
    }),
  );

  const page = await listProjectMessages(supabase, adminViewer, PROJECT_ID, null, 3);
  assert.strictEqual(page.messages.length, 1);
  assert.strictEqual(page.nextCursor, null);
});

test('messages are returned oldest-first for rendering', async () => {
  const supabase = createFakeSupabase(
    baseTables({
      project_messages: [
        messageRow('01', 'shared', '2026-02-01T00:00:00.000Z'),
        messageRow('03', 'shared', '2026-02-03T00:00:00.000Z'),
      ],
    }),
  );

  const page = await listProjectMessages(supabase, adminViewer, PROJECT_ID, null, 50);
  assert.deepStrictEqual(
    page.messages.map((message) => message.created_at),
    ['2026-02-01T00:00:00.000Z', '2026-02-03T00:00:00.000Z'],
  );
});

test('message attachments stay inside the project and viewer visibility boundary', async () => {
  const message = messageRow('01', 'shared', '2026-02-01T00:00:00.000Z');
  const sharedAttachmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const internalAttachmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const otherProjectAttachmentId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const supabase = createFakeSupabase(
    baseTables({
      project_messages: [message],
      project_attachments: [
        {
          id: sharedAttachmentId,
          project_id: PROJECT_ID,
          message_id: message.id,
          uploaded_by: PM_ID,
          visibility: 'shared',
          status: 'ready',
          file_name: 'shared.pdf',
          storage_path: `${PROJECT_ID}/${sharedAttachmentId}`,
        },
        {
          id: internalAttachmentId,
          project_id: PROJECT_ID,
          message_id: message.id,
          uploaded_by: PM_ID,
          visibility: 'internal',
          status: 'ready',
          file_name: 'internal.pdf',
          storage_path: `${PROJECT_ID}/${internalAttachmentId}`,
        },
        {
          id: otherProjectAttachmentId,
          project_id: OTHER_PROJECT_ID,
          message_id: message.id,
          uploaded_by: PM_ID,
          visibility: 'shared',
          status: 'ready',
          file_name: 'other-project.pdf',
          storage_path: `${OTHER_PROJECT_ID}/${otherProjectAttachmentId}`,
        },
      ],
    }),
  );

  const page = await listProjectMessages(supabase, clientViewer, PROJECT_ID, null, 50);
  assert.deepStrictEqual(
    page.messages[0].attachments.map((attachment) => attachment.id),
    [sharedAttachmentId],
  );
});

test('an unparseable cursor is refused instead of silently ignored', async () => {
  const supabase = createFakeSupabase(baseTables());

  await assert.rejects(
    () =>
      listProjectMessages(supabase, adminViewer, PROJECT_ID, {
        createdAt: 'not-a-date',
        id: PROJECT_ID,
      }),
    /Unable to load project messages\./,
  );

  await assert.rejects(
    () =>
      listProjectMessages(supabase, adminViewer, PROJECT_ID, {
        createdAt: '2026-02-01T00:00:00.000Z',
        id: 'not-a-uuid',
      }),
    /Unable to load project messages\./,
  );
});

test('an out-of-range limit is clamped rather than trusted', async () => {
  const calls = [];
  const supabase = createFakeSupabase(baseTables(), calls);

  await listProjectMessages(supabase, adminViewer, PROJECT_ID, null, 100000);
  const messageQuery = calls.find((call) => call.table === 'project_messages');
  assert.strictEqual(messageQuery.limit, 100, 'MAX_MESSAGE_LIMIT');

  const negative = [];
  await listProjectMessages(
    createFakeSupabase(baseTables(), negative),
    adminViewer,
    PROJECT_ID,
    null,
    -5,
  );
  assert.strictEqual(
    negative.find((call) => call.table === 'project_messages').limit,
    50,
    'DEFAULT_MESSAGE_LIMIT',
  );
});

// ---------------------------------------------------------------------------
// Contract <-> schema agreement. These read the migrations so that changing
// one side without the other fails here instead of in production.
// ---------------------------------------------------------------------------

async function migration(name) {
  return readFile(`supabase/migrations/${name}`, 'utf8');
}

function checkValues(sql, constraintName) {
  const pattern = new RegExp(`${constraintName}[\\s\\S]{0,200}?\\(([^)]*)\\)`, 'i');
  const match = sql.match(pattern);
  assert.ok(match, `could not locate ${constraintName}`);
  return [...match[1].matchAll(/'([a-z_]+)'/g)].map((entry) => entry[1]);
}

test('TASK_PRIORITIES matches migration 0022 and excludes the dropped tier', async () => {
  const sql = await migration('0022_tighten_task_priority_to_three_tiers.sql');
  const applied = sql.slice(sql.indexOf('add constraint project_tasks_priority_check'));

  assert.deepStrictEqual(
    [...TASK_PRIORITIES].sort(),
    [...new Set([...applied.matchAll(/'([a-z]+)'::text/g)].map((entry) => entry[1]))].sort(),
  );
  assert.strictEqual(isTaskPriority('urgent'), false, '0022 dropped urgent');
  assert.strictEqual(TASK_PRIORITIES.length, 3);
});

test('TASK_STATUSES matches project_tasks_status_check', async () => {
  const sql = await migration('0010_project_workspace.sql');
  assert.deepStrictEqual(
    [...TASK_STATUSES].sort(),
    checkValues(sql, 'project_tasks_status_check').sort(),
  );
});

test('APPROVAL_STATUSES and DELIVERABLE_STATUSES match their checks', async () => {
  const sql = await migration('0010_project_workspace.sql');
  assert.deepStrictEqual(
    [...APPROVAL_STATUSES].sort(),
    checkValues(sql, 'project_approvals_status_check').sort(),
  );
  assert.deepStrictEqual(
    [...DELIVERABLE_STATUSES].sort(),
    checkValues(sql, 'project_deliverables_status_check').sort(),
  );
});

test('ATTACHMENT_STATUSES and visibility match migration 0009', async () => {
  const sql = await migration('0009_project_realtime_crm.sql');
  assert.deepStrictEqual(
    [...ATTACHMENT_STATUSES].sort(),
    checkValues(sql, 'project_attachments_status_check').sort(),
  );
  assert.deepStrictEqual(
    [...RECORD_VISIBILITIES].sort(),
    checkValues(sql, 'project_messages_visibility_check').sort(),
  );
});

test('PROJECT_STATUSES matches projects_status_check', async () => {
  const sql = await migration('0009_project_realtime_crm.sql');
  assert.deepStrictEqual(
    [...PROJECT_STATUSES].sort(),
    checkValues(sql, 'projects_status_check').sort(),
  );
});

test('ALLOWED_TRANSITIONS matches the database transition matrix', async () => {
  const sql = await migration('0011_workspace_hardening_from_main.sql');
  const matrix = sql.slice(sql.indexOf('v_allowed := case v_project.status'));
  const body = matrix.slice(0, matrix.indexOf('end;'));

  const fromDatabase = {};
  for (const [, from, list] of body.matchAll(
    /when '([a-z_]+)' then p_to_status = any \(array\[([^\]]+)\]/g,
  )) {
    fromDatabase[from] = [...list.matchAll(/'([a-z_]+)'/g)].map((entry) => entry[1]);
  }

  assert.ok(Object.keys(fromDatabase).length >= 7, 'parsed the matrix');

  for (const [from, allowed] of Object.entries(fromDatabase)) {
    assert.deepStrictEqual(
      [...ALLOWED_TRANSITIONS[from]].sort(),
      [...allowed].sort(),
      `transitions out of ${from} drifted from the database`,
    );
  }

  for (const terminal of ['delivered', 'cancelled']) {
    assert.deepStrictEqual(
      ALLOWED_TRANSITIONS[terminal],
      [],
      `${terminal} has no case arm in the database, so it must be terminal here`,
    );
  }
});
