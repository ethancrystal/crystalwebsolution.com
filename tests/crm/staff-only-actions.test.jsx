// @vitest-environment node
//
// Runs the real server actions with auth and Supabase mocked: a client
// cannot create tasks or deliverables, publish a deliverable, or queue a
// notification through the Server Actions, and no RPC is even attempted.
// Staff still reach the RPC. The database-side proof (a client calling the
// RPCs directly) is supabase/tests/0047_staff_only_task_and_deliverable_rpcs.test.sql
// and 0046_client_notifications_and_hardening.test.sql.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const PROJECT = '11111111-1111-4111-8111-111111111111';
const DELIVERABLE = '22222222-2222-4222-8222-222222222222';
const CLIENT = '33333333-3333-4333-8333-333333333333';
const PM = '44444444-4444-4444-8444-444444444444';
const RETURNED = '55555555-5555-4555-8555-555555555555';

let viewer;
const rpc = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({
  getAuthenticatedProfile: async () => ({ profile: viewer }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ rpc: (...args) => rpc(...args) }),
}));

const actions = await import('@/app/actions/project-actions');

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const CASES = [
  ['createProjectTask', 'create_project_task', { projectId: PROJECT, title: 'Draft homepage', priority: 'medium' }],
  ['createProjectDeliverable', 'create_project_deliverable', {
    projectId: PROJECT, title: 'Logo v1', fileName: 'logo.png', mimeType: 'image/png', sizeBytes: '2048',
  }],
  ['publishDeliverable', 'publish_project_deliverable', { projectId: PROJECT, deliverableId: DELIVERABLE, status: 'submitted' }],
  ['enqueueNotification', 'enqueue_project_notification', {
    projectId: PROJECT, channel: 'email', eventType: 'project.message_posted', payload: '{"excerpt":"hi"}', userId: CLIENT,
  }],
];

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: RETURNED, error: null });
});

describe('staff-only project actions', () => {
  for (const [action, rpcName, values] of CASES) {
    it(`${action}: a client is refused before any RPC`, async () => {
      viewer = { id: CLIENT, role: 'client', company_id: '66666666-6666-4666-8666-666666666666' };
      const result = await actions[action](form(values));
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/not authorized/i);
      expect(rpc).not.toHaveBeenCalled();
    });

    it(`${action}: a project manager reaches ${rpcName}`, async () => {
      viewer = { id: PM, role: 'project_manager', company_id: null };
      await actions[action](form(values));
      expect(rpc.mock.calls.map(([name]) => name)).toContain(rpcName);
    });
  }
});
