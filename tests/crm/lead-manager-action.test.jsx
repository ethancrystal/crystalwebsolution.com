// @vitest-environment node
//
// Runs the real setLeadProjectManager / listProjectManagerCandidates server
// actions against a mocked Supabase client, so the one-lead rules are tested
// by behaviour rather than by the shape of the source:
//   - assign_project_user runs unless the chosen manager already leads
//     (a manager promoted from "also assigned" is still emailed);
//   - every other assignee is removed, never the chosen one;
//   - a brief_submitted project moves to planned, and a failed move is a
//     warning, not a failure;
//   - only admins, only project managers, only valid ids.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const PROJECT = '11111111-1111-4111-8111-111111111111';
const ADMIN = '22222222-2222-4222-8222-222222222222';
const ETHAN = '33333333-3333-4333-8333-333333333333';
const ALEX = '44444444-4444-4444-8444-444444444444';
const AJ = '55555555-5555-4555-8555-555555555555';
const RETURNED_ID = '66666666-6666-4666-8666-666666666666';

let viewer;
let db;
const rpc = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({
  getAuthenticatedProfile: async () => (viewer ? { profile: viewer } : null),
}));

// A minimal PostgREST-style builder over in-memory tables: supports the
// select/eq/in/order/maybeSingle calls the actions make.
function query(table) {
  let rows = [...(db[table] ?? [])];
  const builder = {
    select: () => builder,
    eq: (column, value) => {
      rows = rows.filter((row) => row[column] === value);
      return builder;
    },
    in: (column, values) => {
      rows = rows.filter((row) => values.includes(row[column]));
      return builder;
    },
    order: () => builder,
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve, reject) => Promise.resolve({ data: rows, error: null }).then(resolve, reject),
  };
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: (table) => query(table), rpc: (...args) => rpc(...args) }),
}));

const { setLeadProjectManager, listProjectManagerCandidates } = await import('@/app/actions/assignment-actions');
const { managerAssignedNote } = await import('@/lib/crm/notification-copy.mjs');

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function rpcNames() {
  return rpc.mock.calls.map(([name, args]) => `${name}:${args.p_user_id ?? args.p_to_status}`);
}

beforeEach(() => {
  viewer = { id: ADMIN, role: 'admin' };
  db = {
    projects: [{ id: PROJECT, status: 'brief_submitted' }],
    profiles: [
      { id: ETHAN, full_name: 'Ethan Ray', role: 'project_manager' },
      { id: ALEX, full_name: 'Alex', role: 'project_manager' },
      { id: AJ, full_name: 'AJ', role: 'project_manager' },
      { id: ADMIN, full_name: 'Moiz', role: 'admin' },
    ],
    project_assignments: [],
  };
  rpc.mockReset();
  rpc.mockResolvedValue({ data: RETURNED_ID, error: null });
});

describe('setLeadProjectManager', () => {
  it('assigns the first manager and moves a new project to planned with a shared note naming them', async () => {
    const result = await setLeadProjectManager(form({ projectId: PROJECT, userId: ETHAN }));

    expect(result).toMatchObject({ ok: true, data: { movedToPlanned: true, notified: true, warnings: [] } });
    expect(rpcNames()).toEqual([`assign_project_user:${ETHAN}`, 'transition_project_status:planned']);
    expect(rpc).toHaveBeenLastCalledWith('transition_project_status', {
      p_project_id: PROJECT,
      p_to_status: 'planned',
      p_note: managerAssignedNote('Ethan Ray', PROJECT),
      p_visibility: 'shared',
    });
  });

  it('replaces the lead: assigns the new one, removes every other assignee, and does not re-plan', async () => {
    db.projects[0].status = 'in_progress';
    db.project_assignments = [
      { id: 'a1', project_id: PROJECT, user_id: ETHAN, created_at: '2026-09-01' },
      { id: 'a2', project_id: PROJECT, user_id: AJ, created_at: '2026-09-02' },
    ];

    const result = await setLeadProjectManager(form({ projectId: PROJECT, userId: ALEX }));

    expect(result).toMatchObject({ ok: true, data: { movedToPlanned: false, notified: true } });
    expect(rpcNames()).toEqual([
      `assign_project_user:${ALEX}`,
      `remove_project_assignment:${ETHAN}`,
      `remove_project_assignment:${AJ}`,
    ]);
  });

  it('still emails a manager promoted from "also assigned" (only the current lead is skipped)', async () => {
    db.projects[0].status = 'planned';
    db.project_assignments = [
      { id: 'a1', project_id: PROJECT, user_id: ETHAN, created_at: '2026-09-01' },
      { id: 'a2', project_id: PROJECT, user_id: ALEX, created_at: '2026-09-02' },
    ];

    const result = await setLeadProjectManager(form({ projectId: PROJECT, userId: ALEX }));

    expect(result.data.notified).toBe(true);
    expect(rpcNames()).toEqual([`assign_project_user:${ALEX}`, `remove_project_assignment:${ETHAN}`]);
  });

  it('does not re-send the assignment email to the manager who already leads', async () => {
    db.project_assignments = [{ id: 'a1', project_id: PROJECT, user_id: ETHAN, created_at: '2026-09-01' }];

    const result = await setLeadProjectManager(form({ projectId: PROJECT, userId: ETHAN }));

    // Still brief_submitted, so it is planned now; no assign call, no removals.
    expect(result).toMatchObject({ ok: true, data: { notified: false, movedToPlanned: true } });
    expect(rpcNames()).toEqual(['transition_project_status:planned']);
  });

  it('reports a failed move to Planned as a warning after a successful assignment', async () => {
    rpc.mockImplementation(async (name) =>
      name === 'transition_project_status'
        ? { data: null, error: { code: '22023' } }
        : { data: RETURNED_ID, error: null },
    );

    const result = await setLeadProjectManager(form({ projectId: PROJECT, userId: ETHAN }));

    expect(result.ok).toBe(true);
    expect(result.data.movedToPlanned).toBe(false);
    expect(result.data.warnings).toHaveLength(1);
    expect(result.data.warnings[0]).toMatch(/could not be moved to Planned/);
  });

  it('fails without changing anything when the assignment itself fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501' } });

    const result = await setLeadProjectManager(form({ projectId: PROJECT, userId: ETHAN }));

    expect(result).toMatchObject({ ok: false, error: 'Unable to assign this project.' });
    expect(rpcNames()).toEqual([`assign_project_user:${ETHAN}`]);
  });

  it('refuses non-admins, non-managers and malformed ids before any write', async () => {
    viewer = { id: ETHAN, role: 'project_manager' };
    expect((await setLeadProjectManager(form({ projectId: PROJECT, userId: ALEX }))).ok).toBe(false);

    viewer = { id: ADMIN, role: 'admin' };
    expect((await setLeadProjectManager(form({ projectId: PROJECT, userId: ADMIN }))).error).toBe('Choose a project manager.');
    expect((await setLeadProjectManager(form({ projectId: 'not-a-uuid', userId: ETHAN }))).ok).toBe(false);
    expect((await setLeadProjectManager(form({ projectId: PROJECT }))).ok).toBe(false);

    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('listProjectManagerCandidates', () => {
  it('lists project managers by name with their open-project count, and no email', async () => {
    db.projects.push({ id: 'p2', status: 'delivered' }, { id: 'p3', status: 'in_progress' });
    db.project_assignments = [
      { project_id: PROJECT, user_id: ETHAN },
      { project_id: 'p2', user_id: ETHAN },
      { project_id: 'p3', user_id: ETHAN },
    ];

    const result = await listProjectManagerCandidates();

    expect(result.ok).toBe(true);
    const ethan = result.data.managers.find((manager) => manager.id === ETHAN);
    expect(ethan).toEqual({ id: ETHAN, fullName: 'Ethan Ray', openProjects: 2 });
    expect(result.data.managers.map((manager) => manager.id)).not.toContain(ADMIN);
    expect(JSON.stringify(result)).not.toMatch(/email/i);
  });

  it('is admin-only', async () => {
    viewer = { id: ALEX, role: 'project_manager' };
    expect((await listProjectManagerCandidates()).ok).toBe(false);
  });
});
