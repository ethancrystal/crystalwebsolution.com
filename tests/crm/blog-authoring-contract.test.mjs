import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const ACTIONS = source('app/actions/blog-actions.js');

test('blog actions run on the server', () => {
  assert.match(ACTIONS, /^'use server';/, "must be declared 'use server'");
});

test('every exported action gates on the author role before touching the database', () => {
  const exported = [...ACTIONS.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);

  assert.ok(exported.length >= 4, 'expected create/update/status/delete actions');

  for (const name of exported) {
    const body = ACTIONS.split(`export async function ${name}(`)[1].split(
      '\nexport async function',
    )[0];

    const gateIndex = body.indexOf('authorProfile()');
    const clientIndex = body.indexOf('createClient()');

    assert.ok(gateIndex !== -1, `${name} must call authorProfile()`);
    assert.ok(
      clientIndex === -1 || gateIndex < clientIndex,
      `${name} must authorize before opening a database client`,
    );
  }
});

test('the author gate is admin-only, matching the write policies in 0035', () => {
  assert.match(ACTIONS, /const AUTHOR_ROLES = \[ROLES\.ADMIN\];/);
  assert.ok(
    !/AUTHOR_ROLES\s*=\s*\[[^\]]*PROJECT_MANAGER/.test(ACTIONS),
    'widening to project_manager requires a matching RLS and route change',
  );
});

test('actions never leak a raw database error to the caller', () => {
  assert.ok(
    !/error:\s*error\.message/.test(ACTIONS),
    'database messages must not be returned to the client',
  );
  assert.match(ACTIONS, /function safeDatabaseCode/, 'error codes are sanitized');
});

test('publishing revalidates the post, the listing and the sitemap together', () => {
  const revalidate = ACTIONS.match(/function revalidatePostPaths[\s\S]*?\n}/)[0];

  assert.match(revalidate, /revalidatePath\('\/blog'\)/, 'listing');
  assert.match(revalidate, /revalidatePath\('\/sitemap\.xml'\)/, 'sitemap');
  assert.match(revalidate, /revalidatePath\(`\/blog\/\$\{slug\}`\)/, 'the post itself');
});

test('renaming a slug revalidates the old URL too', () => {
  const update = ACTIONS.split('export async function updatePostAction(')[1];
  assert.match(
    update,
    /existing\.slug !== data\.slug/,
    'a rename must invalidate the previous path',
  );
});

const ADMIN_ROUTES = [
  'app/admin/blog/page.jsx',
  'app/admin/blog/new/page.jsx',
  'app/admin/blog/[id]/page.jsx',
];

test('every admin blog route re-checks the role server-side', () => {
  for (const route of ADMIN_ROUTES) {
    const code = source(route);
    assert.match(code, /requireRole\(\[ROLES\.ADMIN\], '\/login\/admin'\)/, route);
  }
});

test('admin blog routes are excluded from search indexes', () => {
  for (const route of ADMIN_ROUTES) {
    const code = source(route);
    assert.match(code, /robots: \{ index: false, follow: false \}/, route);
  }
});

test('admin blog routes never render statically, so drafts cannot be cached', () => {
  for (const route of ADMIN_ROUTES) {
    const code = source(route);
    assert.match(code, /export const dynamic = 'force-dynamic'/, route);
  }
});

test('the public post route renders author content without dangerouslySetInnerHTML', () => {
  const postBody = source('components/marketing/PostBody.jsx');

  // Matches the JSX attribute form specifically — the file's own header comment
  // mentions the name, and a bare substring check would flag that prose.
  assert.ok(
    !/dangerouslySetInnerHTML\s*=/.test(postBody),
    'post bodies must be rendered as React elements, never injected as HTML',
  );
});

test('the sitemap reader avoids the cookie-bound client so /sitemap.xml stays static', () => {
  // next/headers cookies() is a dynamic API: touching it opts the route out of
  // static rendering. The sitemap has no per-visitor content, and a crawler
  // hitting a per-request sitemap is pure waste — so listPublishedSlugs must
  // use the cookieless anon client. Verified against `pnpm build`: with
  // Supabase env vars set, /sitemap.xml renders ○ (Static) rather than
  // ƒ (Dynamic).
  const reader = source('lib/crm/blog.js');
  const fn = reader.match(/export async function listPublishedSlugs[\s\S]*?\n}/)[0];

  assert.match(fn, /publicClient\(/, 'must use the cookieless client');
  assert.ok(
    !fn.includes('optionalClient'),
    'must not use the cookie-bound client, which would force dynamic rendering',
  );
});

test('the blog reader tolerates an unconfigured Supabase', () => {
  const reader = source('lib/crm/blog.js');

  assert.match(reader, /NEXT_PUBLIC_SUPABASE_URL/, 'env is checked');
  assert.ok(
    !/^\s*const supabase = await createClient\(\);/m.test(
      reader.replace(/async function optionalClient[\s\S]*?\n}/, ''),
    ),
    'every reader must go through the guarded client',
  );
});
