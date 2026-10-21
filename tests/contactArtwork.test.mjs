import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARTWORK_ACCEPT,
  ARTWORK_BUCKET,
  ARTWORK_LIMITS,
  ARTWORK_TYPES,
  artworkExtension,
  cleanArtworkName,
  formatBytes,
  isUuid,
  normalizeArtworkFiles,
  sniffArtworkType,
  validateArtworkFiles,
} from '../lib/contactArtwork.mjs';
import {
  CONTACT_FIELD_LIMITS,
  PRODUCTION_FIELD_LIMITS,
  validateProductionRequest,
} from '../lib/contactForm.mjs';
import { splitByOutcome, uploadContactArtwork } from '../lib/uploadContactArtwork.js';

const validRequest = (overrides = {}) => ({
  kind: 'production',
  name: 'Jordan Reyes',
  email: 'jordan@example.com',
  category: 'Custom patches',
  size: '3.5 in wide',
  quantity: '250',
  artworkLink: '',
  notes: '',
  website: '',
  ...overrides,
});

const bytes = (...values) => Uint8Array.from(values);
const ascii = (text) => Uint8Array.from([...text].map((char) => char.charCodeAt(0)));

test('the accepted formats are exactly the six in the design, and the bucket name is stable', () => {
  assert.deepEqual(Object.keys(ARTWORK_TYPES).sort(), ['ai', 'dst', 'eps', 'jpeg', 'jpg', 'pdf', 'png']);
  assert.equal(ARTWORK_ACCEPT, '.ai,.eps,.pdf,.png,.jpg,.jpeg,.dst');
  assert.equal(ARTWORK_BUCKET, 'contact-artwork');
  assert.deepEqual({ ...ARTWORK_LIMITS }, {
    maxFiles: 3,
    maxFileBytes: 10 * 1024 * 1024,
    maxTotalBytes: 25 * 1024 * 1024,
    nameMax: 120,
  });
});

test('the limits and MIME types agree with migration 0053 (bucket, table checks, RPC)', async () => {
  const { readFile } = await import('node:fs/promises');
  const sql = await readFile('supabase/migrations/0053_contact_artwork.sql', 'utf8');

  assert.match(sql, new RegExp(`10485760`), 'per-file limit');
  assert.ok(sql.includes(String(ARTWORK_LIMITS.maxFileBytes)));
  assert.ok(sql.includes(String(ARTWORK_LIMITS.maxTotalBytes)));
  assert.match(sql, /v_count < 1 OR v_count > 3/);
  for (const type of new Set(Object.values(ARTWORK_TYPES))) {
    assert.ok(sql.includes(`'${type}'`), `${type} must be allowed by the bucket and mapped in the RPC`);
  }
  for (const ext of Object.keys(ARTWORK_TYPES)) {
    assert.ok(sql.includes(`WHEN '${ext}' THEN`), `${ext} must be mapped in reserve_contact_artwork`);
  }
  assert.ok(sql.includes(`'${ARTWORK_BUCKET}'`));
});

test('extensions are read case-insensitively from the last dot only', () => {
  assert.equal(artworkExtension('Logo.AI'), 'ai');
  assert.equal(artworkExtension('a.b.c.DST'), 'dst');
  assert.equal(artworkExtension('noextension'), '');
  assert.equal(artworkExtension('trailingdot.'), '');
  assert.equal(artworkExtension(undefined), '');
});

test('display names drop path segments and control characters and are bounded', () => {
  assert.equal(cleanArtworkName('C:\\Users\\jo\\logo.ai'), 'logo.ai');
  assert.equal(cleanArtworkName('../../etc/passwd.png'), 'passwd.png');
  assert.equal(cleanArtworkName('  a\u0000b\nc.png '), 'abc.png');
  assert.equal(cleanArtworkName('x'.repeat(300)).length, ARTWORK_LIMITS.nameMax);
  assert.equal(cleanArtworkName(42), '');
});

test('formatBytes is short and honest', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(1536 * 1024), '1.5 MB');
  assert.equal(formatBytes(-1), '');
  assert.equal(formatBytes(NaN), '');
});

test('isUuid accepts only canonical UUIDs', () => {
  assert.equal(isUuid('53000000-0000-0000-0000-0000000000aa'), true);
  assert.equal(isUuid('../../x'), false);
  assert.equal(isUuid('53000000000000000000000000000000'), false);
  assert.equal(isUuid(undefined), false);
});

test('normalizeArtworkFiles keeps only { name, size } objects and never throws', () => {
  assert.deepEqual(normalizeArtworkFiles(undefined), []);
  assert.deepEqual(normalizeArtworkFiles('nope'), []);
  assert.deepEqual(
    normalizeArtworkFiles([{ name: 'a/b.png', size: 10.9, extra: 'x' }, null, { name: 3, size: 1 }, { name: 'c.png', size: 'big' }]),
    [{ name: 'b.png', size: 10 }],
  );
  assert.equal(normalizeArtworkFiles(Array.from({ length: 100 }, () => ({ name: 'a.png', size: 1 }))).length, 20);
});

test('validateArtworkFiles accepts a valid set and explains the first problem otherwise', () => {
  assert.deepEqual(validateArtworkFiles([]), { files: [], error: '' });
  assert.equal(validateArtworkFiles([{ name: 'a.ai', size: 1 }, { name: 'b.EPS', size: 1 }, { name: 'c.dst', size: 1 }]).error, '');

  assert.match(validateArtworkFiles([{ name: 'a.zip', size: 1 }]).error, /“a\.zip” is not an accepted file type/);
  assert.match(validateArtworkFiles([{ name: 'a.png', size: ARTWORK_LIMITS.maxFileBytes + 1 }]).error, /larger than 10 MB/);
  assert.match(validateArtworkFiles([{ name: 'noext', size: 5 }]).error, /not an accepted file type/);
  assert.equal(
    validateArtworkFiles([{ name: 'a.png', size: ARTWORK_LIMITS.maxFileBytes }, { name: 'b.png', size: ARTWORK_LIMITS.maxFileBytes }, { name: 'c.png', size: 5 * 1024 * 1024 + 1 }]).error.includes('25 MB'),
    true,
  );
});

test('file signatures: each format is recognised, and a renamed file is not', () => {
  const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
  const jpg = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10);
  const pdf = ascii('%PDF-1.7\n...');
  const paddedPdf = Uint8Array.from([...ascii('\n\n  '), ...ascii('%PDF-1.4')]);
  const ps = ascii('%!PS-Adobe-3.0 EPSF-3.0');
  const dosEps = bytes(0xc5, 0xd0, 0xd3, 0xc6, 0, 0);
  const dst = ascii('LA:DESIGN NAME   \r');
  const exe = ascii('MZ\u0090\u0000\u0003');

  assert.equal(sniffArtworkType('png', png), true);
  assert.equal(sniffArtworkType('jpg', jpg), true);
  assert.equal(sniffArtworkType('jpeg', jpg), true);
  assert.equal(sniffArtworkType('pdf', pdf), true);
  assert.equal(sniffArtworkType('pdf', paddedPdf), true);
  assert.equal(sniffArtworkType('eps', ps), true);
  assert.equal(sniffArtworkType('eps', dosEps), true);
  assert.equal(sniffArtworkType('ai', pdf), true, 'modern Illustrator files are PDF-compatible');
  assert.equal(sniffArtworkType('ai', ps), true, 'older Illustrator files are PostScript');
  assert.equal(sniffArtworkType('dst', dst), true);

  for (const ext of Object.keys(ARTWORK_TYPES)) {
    assert.equal(sniffArtworkType(ext, exe), false, `an executable named .${ext} is rejected`);
    assert.equal(sniffArtworkType(ext, new Uint8Array(0)), false);
  }
  assert.equal(sniffArtworkType('png', jpg), false, 'a jpg renamed .png is rejected');
  assert.equal(sniffArtworkType('pdf', png), false);
  assert.equal(sniffArtworkType('zip', pdf), false);
  assert.equal(sniffArtworkType('png', 'not bytes'), false);
});

test('the request validator rejects the same files the shared rules reject', () => {
  const result = validateProductionRequest(validRequest({ files: [{ name: 'a.exe', size: 1 }] }));
  assert.equal(result.valid, false);
  assert.match(result.errors.files, /not an accepted file type/);
  assert.equal(CONTACT_FIELD_LIMITS.brief, 4000);
  assert.ok(PRODUCTION_FIELD_LIMITS.notes < CONTACT_FIELD_LIMITS.brief);
});

test('splitByOutcome pairs files with the server-reported names as a multiset', () => {
  const files = [{ name: 'a.png' }, { name: 'a.png' }, { name: 'b.ai' }];

  assert.deepEqual(splitByOutcome(files, ['a.png', 'b.ai']), { attached: ['a.png', 'b.ai'], failed: ['a.png'] });
  assert.deepEqual(splitByOutcome(files, []), { attached: [], failed: ['a.png', 'a.png', 'b.ai'] });
  assert.deepEqual(splitByOutcome(files, undefined), { attached: [], failed: ['a.png', 'a.png', 'b.ai'] });
});

const READY = {
  status: 'ready',
  dealId: '53000000-0000-0000-0000-000000000001',
  submissionId: '53000000-0000-0000-0000-0000000000aa',
  uploads: [
    { name: 'a.png', path: 'd/s/1-a.png', token: 't1', contentType: 'image/png' },
    { name: 'b.ai', path: 'd/s/2-b.ai', token: 't2', contentType: 'application/illustrator' },
  ],
};

function uploadHarness({ uploadResults = [{ error: null }, { error: null }], complete } = {}) {
  const calls = { uploads: [], progress: [], fetches: [] };
  const loadClient = async () => () => ({
    storage: {
      from: (bucket) => ({
        uploadToSignedUrl: async (path, token, file, options) => {
          calls.uploads.push({ bucket, path, token, file, options });
          const result = uploadResults[calls.uploads.length - 1];
          if (result instanceof Error) throw result;
          return result;
        },
      }),
    },
  });
  const fetchImpl = async (url, init) => {
    calls.fetches.push({ url, body: JSON.parse(init.body) });
    return complete ? complete() : { ok: true, json: async () => ({ ok: true, attached: ['a.png', 'b.ai'], rejected: [] }) };
  };
  return { calls, loadClient, fetchImpl, onProgress: (...args) => calls.progress.push(args) };
}

const FILES = [{ name: 'a.png', size: 5 }, { name: 'b.ai', size: 9 }];

test('uploadContactArtwork PUTs each file to its signed slot, then completes the submission', async () => {
  const harness = uploadHarness();
  const result = await uploadContactArtwork({ artwork: READY, files: FILES, ...harness });

  assert.deepEqual(result, { attached: ['a.png', 'b.ai'], failed: [] });
  assert.deepEqual(harness.calls.uploads.map((u) => [u.bucket, u.path, u.token, u.options.contentType]), [
    ['contact-artwork', 'd/s/1-a.png', 't1', 'image/png'],
    ['contact-artwork', 'd/s/2-b.ai', 't2', 'application/illustrator'],
  ]);
  assert.equal(harness.calls.uploads[0].file, FILES[0]);
  assert.deepEqual(harness.calls.progress, [[1, 2], [2, 2]]);
  assert.deepEqual(harness.calls.fetches, [{
    url: '/api/contact/artwork/complete',
    body: { dealId: READY.dealId, submissionId: READY.submissionId },
  }]);
});

test('uploadContactArtwork trusts the server, not the PUT, for what arrived', async () => {
  const harness = uploadHarness({
    uploadResults: [{ error: { message: 'too big' } }, new TypeError('network')],
    complete: () => ({ ok: true, json: async () => ({ ok: true, attached: ['b.ai'], rejected: [{ name: 'a.png', reason: 'not_uploaded' }] }) }),
  });
  const result = await uploadContactArtwork({ artwork: READY, files: FILES, ...harness });

  assert.deepEqual(result, { attached: ['b.ai'], failed: ['a.png'] });
});

test('uploadContactArtwork reports every file as failed when nothing can be uploaded', async () => {
  const all = { attached: [], failed: ['a.png', 'b.ai'] };

  for (const artwork of [undefined, { status: 'unavailable' }, { ...READY, uploads: [READY.uploads[0]] }]) {
    assert.deepEqual(await uploadContactArtwork({ artwork, files: FILES, ...uploadHarness() }), all);
  }

  assert.deepEqual(
    await uploadContactArtwork({
      artwork: READY,
      files: FILES,
      ...uploadHarness({ complete: () => ({ ok: false, json: async () => ({ ok: false }) }) }),
    }),
    all,
    'a failed completion check means nothing is confirmed',
  );

  assert.deepEqual(
    await uploadContactArtwork({
      artwork: READY,
      files: FILES,
      ...uploadHarness(),
      loadClient: async () => () => { throw new Error('Supabase browser client is not configured'); },
    }),
    all,
    'a missing browser client never throws into the form',
  );
});

test('the analytics event carries the category enum and a count, never a name, email or file name', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('components/marketing/ProductionRequestForm.jsx', 'utf8');
  const start = source.indexOf("trackEvent('generate_lead'");
  const event = source.slice(start, source.indexOf('});', start));

  assert.match(event, /category: request\.category/);
  assert.match(event, /artwork_files: outcome\.attached\.length/);
  assert.doesNotMatch(event, /request\.name|request\.email|\.name\b|artworkLink|notes/);
});
