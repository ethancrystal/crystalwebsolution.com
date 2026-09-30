// @vitest-environment node
//
// The cron route's stale-attachment cleanup against a fake Supabase that keeps
// the 0048 queue in memory: a storage failure keeps the cleanup record (with
// an attempt recorded) and a later run that succeeds removes it; a key that
// is already gone counts as removed; before 0048 exists the route falls back
// to the old one-shot RPC. The SQL side (claim/lease/fail/complete) is proven
// in supabase/tests/0048_durable_attachment_cleanup.test.sql.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn() }));
vi.mock('@/lib/email/resend', () => ({
  sendTemplate: vi.fn(),
  isEmailConfigured: () => true,
  EmailError: class extends Error {},
}));

let queue;
let rpcCalls;
let storage;
let missingClaimRpc;

function fakeSupabase() {
  const outbox = {
    select: () => outbox, eq: () => outbox, lt: () => outbox, gte: () => outbox, order: () => outbox, limit: () => outbox,
    then: (resolve) => resolve({ data: [], count: 0, error: null }),
  };
  return {
    from: () => outbox,
    storage: { from: () => ({ remove: async (paths) => storage.remove(paths) }) },
    rpc: async (name, args) => {
      rpcCalls.push([name, args]);
      switch (name) {
        case 'claim_attachment_cleanup':
          if (missingClaimRpc) return { data: null, error: { code: 'PGRST202', message: 'not found' } };
          return { data: [...queue.keys()].map((path) => ({ storage_path: path, attempts: queue.get(path).attempts })), error: null };
        case 'fail_attachment_cleanup':
          for (const path of args.p_storage_paths) {
            const entry = queue.get(path);
            queue.set(path, { attempts: entry.attempts + 1, lastError: args.p_error });
          }
          return { data: args.p_storage_paths.length, error: null };
        case 'complete_attachment_cleanup':
          for (const path of args.p_storage_paths) queue.delete(path);
          return { data: args.p_storage_paths.length, error: null };
        case 'cleanup_stale_project_attachments':
          return { data: [{ storage_path: 'p/legacy/a.png' }], error: null };
        case 'claim_notification_email_batch':
          return { data: [], error: null };
        default:
          return { data: null, error: null };
      }
    },
  };
}

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => fakeSupabase() }));

process.env.CRM_CRON_SECRET = 'cron-secret';
const { POST } = await import('@/app/api/cron/crm-notifications/route.js');

async function drain() {
  const response = await POST(new Request('https://example.test/api/cron/crm-notifications', {
    method: 'POST',
    headers: { 'x-cron-secret': 'cron-secret' },
  }));
  expect(response.status).toBe(200);
  return response.json();
}

const names = () => rpcCalls.map(([name]) => name);

beforeEach(() => {
  queue = new Map([['proj/att-1/brief.pdf', { attempts: 0 }]]);
  rpcCalls = [];
  missingClaimRpc = false;
  storage = { remove: async () => ({ data: [], error: null }) };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('stale attachment cleanup', () => {
  it('keeps the record when storage fails, then removes it once a retry succeeds', async () => {
    storage.remove = async () => ({ data: null, error: { message: 'Storage 503' } });
    const first = await drain();

    expect(first.cleanedAttachments).toBe(0);
    expect(names()).toContain('fail_attachment_cleanup');
    expect(names()).not.toContain('complete_attachment_cleanup');
    expect(queue.get('proj/att-1/brief.pdf')).toEqual({ attempts: 1, lastError: 'Storage 503' });

    rpcCalls = [];
    const removed = [];
    storage.remove = async (paths) => { removed.push(...paths); return { data: paths.map((name) => ({ name })), error: null }; };
    const second = await drain();

    expect(second.cleanedAttachments).toBe(1);
    expect(removed).toEqual(['proj/att-1/brief.pdf']);
    expect(rpcCalls.find(([name]) => name === 'complete_attachment_cleanup')[1]).toEqual({ p_storage_paths: ['proj/att-1/brief.pdf'] });
    expect(queue.size).toBe(0);
  });

  it('treats an object that is already gone as removed', async () => {
    storage.remove = async () => ({ data: [], error: null });
    const result = await drain();
    expect(result.cleanedAttachments).toBe(1);
    expect(queue.size).toBe(0);
  });

  it('never calls complete before storage succeeds', async () => {
    const order = [];
    storage.remove = async () => { order.push('storage'); return { data: [], error: null }; };
    rpcCalls = [];
    await drain();
    // complete comes after the claim, and storage ran in between.
    expect(names().indexOf('complete_attachment_cleanup')).toBeGreaterThan(names().indexOf('claim_attachment_cleanup'));
    expect(order).toEqual(['storage']);
  });

  it('falls back to the pre-0048 cleanup when the claim RPC does not exist yet', async () => {
    missingClaimRpc = true;
    const result = await drain();
    expect(names()).toContain('cleanup_stale_project_attachments');
    expect(names()).not.toContain('complete_attachment_cleanup');
    expect(result.cleanedAttachments).toBe(1);
  });
});
