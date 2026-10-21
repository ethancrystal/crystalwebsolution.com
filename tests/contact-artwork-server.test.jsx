// @vitest-environment node
//
// Server side of the production-request artwork upload (migration 0053):
//   - POST /api/contact hands back signed upload slots for declared files,
//     only after every existing guard, and degrades to "unavailable" without
//     ever failing the request;
//   - POST /api/contact/artwork/complete checks what was uploaded (size and
//     file signature), attaches the good files and removes the rest;
//   - GET /api/admin/contact-artwork/:id is admin-only and redirects to a
//     60 second signed URL;
//   - the daily sweep removes reservations that were never completed.
// Only the edges are mocked: Upstash, the network, the Supabase admin client
// and its storage, email, and the server Supabase client used for the admin
// session check.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const limiter = { impl: async () => ({ success: true }) };
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow() { return {}; }
    async limit(identifier) { return limiter.impl(identifier); }
  },
}));
vi.mock('@upstash/redis', () => ({ Redis: class {} }));

const sendTemplate = vi.fn();
vi.mock('@/lib/email/resend', () => ({
  sendTemplate: (...args) => sendTemplate(...args),
  isEmailConfigured: () => true,
  getOperationsAddress: () => 'ops@example.test',
}));

// One fake admin client for everything: rpc, table queries and storage.
const admin = {
  rpc: vi.fn(),
  createSignedUploadUrl: vi.fn(),
  createSignedUrl: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  tableRows: [], // rows a select on contact_artwork returns
  queueRows: [], // rows a select on contact_artwork_removals returns
  tableError: null,
  deleteError: {}, // table -> error a delete on it returns
  ops: [], // every query, in order: { table, kind, filters }
  selectedFilters: [],
  maybeSingle: null,
};
function makeQuery(table) {
  const op = { table, kind: 'select', filters: [] };
  admin.ops.push(op);
  const result = () => (op.kind === 'delete'
    ? { data: null, error: admin.deleteError[table] ?? null }
    : { data: table === 'contact_artwork_removals' ? admin.queueRows : admin.tableRows, error: admin.tableError });
  const query = {
    select: () => query,
    delete: () => { op.kind = 'delete'; return query; },
    eq: (column, value) => { op.filters.push(['eq', column, value]); admin.selectedFilters.push([column, value]); return query; },
    lt: (column, value) => { op.filters.push(['lt', column, value]); return query; },
    in: (column, values) => { op.filters.push(['in', column, values]); return query; },
    limit: () => query,
    maybeSingle: async () => admin.maybeSingle,
    then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject),
  };
  return query;
}
const adminClient = () => ({
  rpc: (...args) => admin.rpc(...args),
  from: (table) => makeQuery(table),
  storage: {
    from: (bucket) => ({
      createSignedUploadUrl: (path) => admin.createSignedUploadUrl(bucket, path),
      createSignedUrl: (...args) => admin.createSignedUrl(bucket, ...args),
      list: (...args) => admin.list(bucket, ...args),
      remove: (paths) => admin.remove(bucket, paths),
    }),
  },
});
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminClient() }));
vi.mock('../lib/supabase/admin', () => ({ createAdminClient: () => adminClient() }));

const session = { profile: { role: 'admin' } };
vi.mock('@/lib/auth/require-role', () => ({ getAuthenticatedProfile: async () => session.profile && { profile: session.profile } }));

const HCAPTCHA_URL = 'https://api.hcaptcha.com/siteverify';
const WEBHOOK_URL = 'https://hooks.example.test/contact';
const ENV_KEYS = [
  'VERCEL', 'VERCEL_ENV', 'TRUSTED_PROXY_HOPS', 'HCAPTCHA_SECRET',
  'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'CONTACT_WEBHOOK_URL',
];
const PROD = {
  VERCEL: '1',
  VERCEL_ENV: 'production',
  HCAPTCHA_SECRET: 'secret',
  UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
  UPSTASH_REDIS_REST_TOKEN: 'token',
  CONTACT_WEBHOOK_URL: WEBHOOK_URL,
};

const DEAL = '53000000-0000-0000-0000-000000000001';
const SUBMISSION = '53000000-0000-0000-0000-0000000000aa';
const FOLDER = `${DEAL}/${SUBMISSION}`;

let fetchLog;
let fetchImpl;

function setEnv(values) {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
}

const productionBody = (overrides = {}) => ({
  kind: 'production',
  name: 'Jordan Reyes',
  email: 'jordan@example.test',
  category: 'Custom patches',
  size: '3.5 in wide',
  quantity: '250',
  artworkLink: '',
  notes: '',
  website: '',
  files: [{ name: 'Logo Final.ai', size: 2048 }, { name: 'stitch.dst', size: 900 }],
  hcaptchaToken: 'token-from-widget',
  ...overrides,
});

async function postContact(body = productionBody(), env = PROD) {
  setEnv(env);
  vi.resetModules();
  const { POST } = await import('@/app/api/contact/route.js');
  return POST(new Request('https://www.example.test/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': '203.0.113.10' },
    body: JSON.stringify(body),
  }));
}

async function postComplete(body, env = PROD) {
  setEnv(env);
  vi.resetModules();
  const { POST } = await import('@/app/api/contact/artwork/complete/route.js');
  return POST(new Request('https://www.example.test/api/contact/artwork/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': '203.0.113.10' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));
}

async function getDownload(id) {
  vi.resetModules();
  const { GET } = await import('@/app/api/admin/contact-artwork/[id]/route.js');
  return GET(new Request(`https://app.example.test/api/admin/contact-artwork/${id}`), { params: Promise.resolve({ id }) });
}

const pending = (name, path) => ({ original_name: name, storage_path: `${FOLDER}/${path}` });
const stream = (bytes) => new Response(bytes, { status: 206 });
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const AI = new TextEncoder().encode('%PDF-1.6 illustrator');
const DST = new TextEncoder().encode('LA:STITCH          \r');
const EXE = new TextEncoder().encode('MZ\u0090\u0000');

beforeEach(() => {
  fetchLog = [];
  limiter.impl = async () => ({ success: true });
  fetchImpl = async (url) => {
    if (String(url) === HCAPTCHA_URL) return { ok: true, status: 200, json: async () => ({ success: true }) };
    if (String(url) === WEBHOOK_URL) return { ok: true, status: 200, json: async () => ({}) };
    return stream(PNG);
  };
  vi.stubGlobal('fetch', vi.fn((url, init) => { fetchLog.push([String(url), init]); return fetchImpl(url, init); }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  sendTemplate.mockReset();
  sendTemplate.mockResolvedValue({ id: 'e1' });
  Object.assign(admin, { tableRows: [], queueRows: [], tableError: null, deleteError: {}, ops: [], selectedFilters: [], maybeSingle: null });
  admin.rpc.mockReset();
  admin.createSignedUploadUrl.mockReset();
  admin.createSignedUrl.mockReset();
  admin.list.mockReset();
  admin.remove.mockReset();
  admin.remove.mockResolvedValue({ error: null });
  session.profile = { role: 'admin' };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setEnv({});
});

describe('POST /api/contact reserves artwork upload slots', { timeout: 30_000 }, () => {
  function leadAndSlots() {
    admin.rpc.mockImplementation(async (fn) => {
      if (fn === 'create_lead_from_contact') return { data: { deal_id: DEAL }, error: null };
      if (fn === 'reserve_contact_artwork') {
        return {
          data: [
            { path: `${DEAL}/s/1-Logo_Final.ai`, name: 'Logo Final.ai', content_type: 'application/illustrator' },
            { path: `${DEAL}/s/2-stitch.dst`, name: 'stitch.dst', content_type: 'application/octet-stream' },
          ],
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected ${fn}` } };
    });
    admin.createSignedUploadUrl.mockImplementation(async (bucket, path) => ({ data: { token: `tok:${path}`, path }, error: null }));
  }

  it('returns one signed slot per file, after the lead is stored', async () => {
    leadAndSlots();
    const response = await postContact();
    const json = await response.json();

    expect(response.status).toBe(202);
    expect(json.artwork.status).toBe('ready');
    expect(json.artwork.dealId).toBe(DEAL);
    expect(json.artwork.submissionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(json.artwork.uploads).toEqual([
      { name: 'Logo Final.ai', path: `${DEAL}/s/1-Logo_Final.ai`, token: `tok:${DEAL}/s/1-Logo_Final.ai`, contentType: 'application/illustrator' },
      { name: 'stitch.dst', path: `${DEAL}/s/2-stitch.dst`, token: `tok:${DEAL}/s/2-stitch.dst`, contentType: 'application/octet-stream' },
    ]);

    const calls = admin.rpc.mock.calls.map(([fn]) => fn);
    expect(calls).toEqual(['create_lead_from_contact', 'reserve_contact_artwork']);
    const [, reserve] = admin.rpc.mock.calls[1];
    expect(reserve).toMatchObject({
      p_deal_id: DEAL,
      p_files: [{ name: 'Logo Final.ai', size: 2048 }, { name: 'stitch.dst', size: 900 }],
    });
    expect(admin.createSignedUploadUrl.mock.calls.every(([bucket]) => bucket === 'contact-artwork')).toBe(true);
  });

  it('names the declared files in the brief, the webhook and the emails', async () => {
    leadAndSlots();
    let webhookBody;
    fetchImpl = async (url, init) => {
      if (String(url) === HCAPTCHA_URL) return { ok: true, status: 200, json: async () => ({ success: true }) };
      webhookBody = JSON.parse(init.body);
      return { ok: true, status: 200, json: async () => ({}) };
    };
    await postContact();

    expect(admin.rpc.mock.calls[0][1].p_brief).toContain('Artwork files (uploading with this request): Logo Final.ai (2 KB), stitch.dst (900 B)');
    expect(webhookBody.files).toEqual([{ name: 'Logo Final.ai', size: 2048 }, { name: 'stitch.dst', size: 900 }]);
    expect(sendTemplate.mock.calls[0][0].html).toContain('Artwork files:');
    expect(sendTemplate.mock.calls[1][0].html).toMatch(/artwork files are uploading/i);
  });

  it('never reserves slots for a request without files', async () => {
    leadAndSlots();
    const response = await postContact(productionBody({ files: [] }));

    expect(response.status).toBe(202);
    expect(await response.json()).not.toHaveProperty('artwork');
    expect(admin.rpc.mock.calls.map(([fn]) => fn)).toEqual(['create_lead_from_contact']);
  });

  it('never reserves slots for a web brief, even if it smuggles a files field', async () => {
    leadAndSlots();
    const response = await postContact({
      name: 'Jane Client', email: 'jane@example.test', company: 'Acme', budget: '$5–15k',
      brief: 'A site.', website: '', files: [{ name: 'a.png', size: 5 }], hcaptchaToken: 'token-from-widget',
    });

    expect(response.status).toBe(202);
    expect(await response.json()).not.toHaveProperty('artwork');
    expect(admin.rpc.mock.calls.map(([fn]) => fn)).toEqual(['create_lead_from_contact']);
  });

  it('degrades to unavailable, still delivering the request, when the lead was not stored', async () => {
    admin.rpc.mockResolvedValue({ data: null, error: { message: 'down' } });
    const response = await postContact();

    expect(response.status).toBe(202);
    expect((await response.json()).artwork).toEqual({ status: 'unavailable' });
    expect(admin.rpc.mock.calls.map(([fn]) => fn)).toEqual(['create_lead_from_contact']);
    expect(sendTemplate).toHaveBeenCalledTimes(2);
  });

  it('degrades to unavailable when the reservation or signing fails', async () => {
    leadAndSlots();
    admin.createSignedUploadUrl.mockResolvedValue({ data: null, error: { message: 'storage down' } });
    const response = await postContact();

    expect(response.status).toBe(202);
    expect((await response.json()).artwork).toEqual({ status: 'unavailable' });
  });

  it('rejects bad files with a 400 before anything is stored or signed', async () => {
    leadAndSlots();
    const response = await postContact(productionBody({ files: [{ name: 'virus.exe', size: 10 }] }));

    expect(response.status).toBe(400);
    expect((await response.json()).errors).toHaveProperty('files');
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(admin.createSignedUploadUrl).not.toHaveBeenCalled();
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  it('keeps the hCaptcha guard in front of the slots', async () => {
    leadAndSlots();
    fetchImpl = async (url) => (String(url) === HCAPTCHA_URL
      ? { ok: true, status: 200, json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) }
      : { ok: true, status: 200, json: async () => ({}) });
    const response = await postContact();

    expect(response.status).toBe(400);
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(admin.createSignedUploadUrl).not.toHaveBeenCalled();
  });
});

describe('POST /api/contact/artwork/complete', { timeout: 30_000 }, () => {
  function stage({ rows, objects, heads = {}, attach }) {
    admin.tableRows = rows;
    admin.list.mockResolvedValue({
      data: objects.map(([name, size]) => ({ name, metadata: { size } })),
      error: null,
    });
    admin.createSignedUrl.mockImplementation(async (bucket, path) => ({ data: { signedUrl: `https://storage.example.test/${path}` }, error: null }));
    fetchImpl = async (url) => stream(heads[String(url).split('/').pop()] ?? PNG);
    admin.rpc.mockImplementation(async (fn, args) => {
      if (fn !== 'attach_contact_artwork') return { data: null, error: { message: `unexpected ${fn}` } };
      return { data: attach(args), error: null };
    });
  }

  it('verifies size and signature, attaches the good files and removes the rest', async () => {
    stage({
      rows: [pending('logo.ai', '1-logo.ai'), pending('stitch.dst', '2-stitch.dst'), pending('fake.png', '3-fake.png'), pending('late.pdf', '4-late.pdf')],
      objects: [['1-logo.ai', 2048], ['2-stitch.dst', 900], ['3-fake.png', 400]],
      heads: { '1-logo.ai': AI, '2-stitch.dst': DST, '3-fake.png': EXE },
      attach: (args) => ({
        attached: args.p_verified.length,
        attached_names: ['logo.ai', 'stitch.dst'],
        removed_paths: [`${FOLDER}/3-fake.png`, `${FOLDER}/4-late.pdf`],
      }),
    });

    const response = await postComplete({ dealId: DEAL, submissionId: SUBMISSION });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      attached: ['logo.ai', 'stitch.dst'],
      rejected: [
        { name: 'fake.png', reason: 'type_mismatch' },
        { name: 'late.pdf', reason: 'not_uploaded' },
      ],
    });

    const [, args] = admin.rpc.mock.calls[0];
    expect(args.p_deal_id).toBe(DEAL);
    expect(args.p_submission_id).toBe(SUBMISSION);
    expect(args.p_verified).toEqual([
      { storage_path: `${FOLDER}/1-logo.ai`, size_bytes: 2048 },
      { storage_path: `${FOLDER}/2-stitch.dst`, size_bytes: 900 },
    ]);
    expect(admin.list.mock.calls[0].slice(0, 2)).toEqual(['contact-artwork', FOLDER]);

    // Only the first bytes are ever fetched, and the mismatched object is removed.
    const heads = fetchLog.filter(([url]) => url.startsWith('https://storage.example.test/'));
    expect(heads).toHaveLength(3);
    expect(heads.every(([, init]) => init.headers.Range === 'bytes=0-1023')).toBe(true);
    expect(admin.remove).toHaveBeenCalledTimes(1);
    expect(admin.remove.mock.calls[0][1].sort()).toEqual([`${FOLDER}/3-fake.png`, `${FOLDER}/4-late.pdf`]);
  });

  it('rejects an oversize object without reading it', async () => {
    stage({
      rows: [pending('big.pdf', '1-big.pdf')],
      objects: [['1-big.pdf', 11 * 1024 * 1024]],
      attach: () => ({ attached: 0, attached_names: [], removed_paths: [`${FOLDER}/1-big.pdf`] }),
    });

    const json = await (await postComplete({ dealId: DEAL, submissionId: SUBMISSION })).json();

    expect(json.rejected).toEqual([{ name: 'big.pdf', reason: 'too_large' }]);
    expect(fetchLog.filter(([url]) => url.startsWith('https://storage.example.test/'))).toHaveLength(0);
    expect(admin.remove).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: a repeat call with nothing pending just reports the attached files', async () => {
    stage({
      rows: [],
      objects: [],
      attach: () => ({ attached: 2, attached_names: ['logo.ai', 'stitch.dst'], removed_paths: [] }),
    });

    const json = await (await postComplete({ dealId: DEAL, submissionId: SUBMISSION })).json();

    expect(json).toEqual({ ok: true, attached: ['logo.ai', 'stitch.dst'], rejected: [] });
    expect(admin.list).not.toHaveBeenCalled();
    expect(admin.remove).not.toHaveBeenCalled();
  });

  it('refuses malformed references without touching storage', async () => {
    for (const body of [{}, { dealId: DEAL }, { dealId: '../../x', submissionId: SUBMISSION }, { dealId: DEAL, submissionId: 'nope' }]) {
      const response = await postComplete(body);
      expect(response.status).toBe(400);
    }
    expect((await postComplete('not json')).status).toBe(400);
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(admin.list).not.toHaveBeenCalled();
  });

  it('is rate limited and fails closed when the limiter cannot be reached', async () => {
    limiter.impl = async () => ({ success: false });
    expect((await postComplete({ dealId: DEAL, submissionId: SUBMISSION })).status).toBe(429);

    limiter.impl = async () => { throw new Error('Upstash timeout'); };
    const response = await postComplete({ dealId: DEAL, submissionId: SUBMISSION });
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('120');
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it('answers 503 (retryable) when the check itself fails, never a false success', async () => {
    admin.tableRows = [pending('logo.ai', '1-logo.ai')];
    admin.list.mockResolvedValue({ data: null, error: { message: 'storage down' } });

    const response = await postComplete({ dealId: DEAL, submissionId: SUBMISSION });

    expect(response.status).toBe(503);
    expect((await response.json()).ok).toBe(false);
    expect(admin.rpc).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/contact-artwork/:id', () => {
  const ID = '99000000-0000-0000-0000-000000000001';

  it('redirects an admin to a 60 second signed download URL', async () => {
    admin.maybeSingle = { data: { storage_path: `${FOLDER}/1-logo.ai`, original_name: 'Logo Final.ai' }, error: null };
    admin.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.example.test/signed?token=abc' }, error: null });

    const response = await getDownload(ID);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://storage.example.test/signed?token=abc');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(admin.createSignedUrl).toHaveBeenCalledWith('contact-artwork', `${FOLDER}/1-logo.ai`, 60, { download: 'Logo Final.ai' });
    expect(admin.selectedFilters).toEqual(expect.arrayContaining([['id', ID], ['status', 'attached']]));
  });

  it('answers 404, not 401, to anyone who is not the admin', async () => {
    admin.maybeSingle = { data: { storage_path: `${FOLDER}/1-logo.ai`, original_name: 'x' }, error: null };

    for (const profile of [null, { role: 'client' }, { role: 'project_manager' }]) {
      session.profile = profile;
      expect((await getDownload(ID)).status).toBe(404);
    }
    expect(admin.createSignedUrl).not.toHaveBeenCalled();
  });

  it('answers 404 for a bad id, an unknown id and a file that is not attached', async () => {
    expect((await getDownload('../../etc')).status).toBe(404);

    admin.maybeSingle = { data: null, error: null };
    expect((await getDownload(ID)).status).toBe(404);
    expect(admin.createSignedUrl).not.toHaveBeenCalled();
  });
});

describe('stale reservation sweep and object-removal queue', () => {
  const NOW = Date.parse('2026-10-19T12:00:00Z');
  const queued = (...paths) => paths.map((storage_path) => ({ storage_path }));
  const deletesOn = (table) => admin.ops.filter((op) => op.table === table && op.kind === 'delete');

  it('expires stale pending rows, then removes the queued objects and forgets only those entries', async () => {
    const { cleanupStaleContactArtwork } = await import('@/lib/contactArtworkServer');
    admin.queueRows = queued('a/b/1-x.png', 'a/b/2-y.png');

    expect(await cleanupStaleContactArtwork(adminClient(), NOW)).toBe(2);

    // 1. Only pending rows older than 24 h are deleted; the database trigger
    //    queues their paths (supabase/tests/0053 proves that part).
    expect(admin.ops[0]).toMatchObject({ table: 'contact_artwork', kind: 'delete' });
    expect(admin.ops[0].filters).toEqual([
      ['eq', 'status', 'pending'],
      ['lt', 'created_at', '2026-10-18T12:00:00.000Z'],
    ]);
    // 2. Objects are removed in one call, 3. then exactly those queue entries go.
    expect(admin.remove).toHaveBeenCalledWith('contact-artwork', ['a/b/1-x.png', 'a/b/2-y.png']);
    expect(deletesOn('contact_artwork_removals')).toHaveLength(1);
    expect(deletesOn('contact_artwork_removals')[0].filters).toEqual([['in', 'storage_path', ['a/b/1-x.png', 'a/b/2-y.png']]]);
  });

  it('keeps the queue entries for the next run when storage removal fails', async () => {
    const { cleanupStaleContactArtwork } = await import('@/lib/contactArtworkServer');
    admin.queueRows = queued('a/b/1-x.png');
    admin.remove.mockResolvedValue({ error: { message: 'storage down' } });

    expect(await cleanupStaleContactArtwork(adminClient(), NOW)).toBe(0);
    expect(deletesOn('contact_artwork_removals')).toHaveLength(0);
  });

  it('still drains the queue when expiring stale rows fails', async () => {
    const { cleanupStaleContactArtwork } = await import('@/lib/contactArtworkServer');
    admin.queueRows = queued('a/b/1-x.png');
    admin.deleteError = { contact_artwork: { message: 'locked' } };

    expect(await cleanupStaleContactArtwork(adminClient(), NOW)).toBe(1);
    expect(admin.remove).toHaveBeenCalledWith('contact-artwork', ['a/b/1-x.png']);
  });

  it('does nothing, and never throws, when the queue is empty or a lookup fails', async () => {
    const { cleanupStaleContactArtwork } = await import('@/lib/contactArtworkServer');

    expect(await cleanupStaleContactArtwork(adminClient(), NOW)).toBe(0);
    expect(admin.remove).not.toHaveBeenCalled();

    admin.queueRows = queued('a/b/1-x.png');
    admin.tableError = { message: 'down' };
    expect(await cleanupStaleContactArtwork(adminClient(), NOW)).toBe(0);
    expect(await cleanupStaleContactArtwork({ from() { throw new Error('boom'); } }, NOW)).toBe(0);
    expect(admin.remove).not.toHaveBeenCalled();
  });
});
