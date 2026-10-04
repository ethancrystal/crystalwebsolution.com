import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import {
  AppUrlError,
  LOCAL_APP_URL,
  RETIRED_HOSTS,
  assertSafeAppUrl,
  getAppUrl,
  isRetiredHost,
} from '../lib/appUrl.mjs';
import { APP_ORIGIN } from '../lib/portalHost.mjs';
import { OWN_HOSTNAMES, SITE_HOST, SITE_ORIGIN } from '../lib/seo.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

// getAppUrl(env) takes the environment as a parameter so every branch is
// exercised without touching process.env.
const rejects = (env, pattern) =>
  assert.throws(
    () => getAppUrl(env),
    (error) => {
      assert.ok(error instanceof AppUrlError, `expected AppUrlError, got ${error}`);
      if (pattern) assert.match(error.message, pattern);
      return true;
    },
  );

/* ------------------------------------------------------- configured value */

test('a valid https URL is returned as its origin', () => {
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: APP_ORIGIN }), 'https://app.cdsportswearinc.com');
  assert.equal(
    getAppUrl({ NEXT_PUBLIC_APP_URL: 'https://app.cdsportswearinc.com', VERCEL_ENV: 'production' }),
    'https://app.cdsportswearinc.com',
  );
});

test('the live marketing and portal hosts are both accepted', () => {
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: SITE_ORIGIN, VERCEL_ENV: 'production' }), SITE_ORIGIN);
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: APP_ORIGIN, VERCEL_ENV: 'production' }), APP_ORIGIN);
});

test('a trailing slash, whitespace and host case are normalised away', () => {
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: 'https://app.cdsportswearinc.com/' }), 'https://app.cdsportswearinc.com');
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: '  https://app.cdsportswearinc.com\n' }), 'https://app.cdsportswearinc.com');
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: 'https://APP.CdSportswearInc.com' }), 'https://app.cdsportswearinc.com');
});

test('the returned origin never ends in a slash and keeps a non-default port', () => {
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000/' }), 'http://localhost:3000');
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: 'https://staging.example.test:8443' }), 'https://staging.example.test:8443');
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: 'https://placeholder.invalid' }), 'https://placeholder.invalid');
});

test('values that are not a valid absolute URL are rejected', () => {
  for (const value of ['undefined', 'null', 'not a url', 'app.cdsportswearinc.com', '/auth/verify', '//app.cdsportswearinc.com', 'https://']) {
    rejects({ NEXT_PUBLIC_APP_URL: value }, /NEXT_PUBLIC_APP_URL is not a valid absolute URL/);
  }
});

test('only http(s) schemes are accepted', () => {
  for (const value of ['ftp://app.cdsportswearinc.com', 'javascript:alert(1)', 'localhost:3000', 'data:text/html,x']) {
    rejects({ NEXT_PUBLIC_APP_URL: value }, /NEXT_PUBLIC_APP_URL/);
  }
});

test('credentials, paths, queries and fragments are rejected', () => {
  rejects({ NEXT_PUBLIC_APP_URL: 'https://user:secret@app.cdsportswearinc.com' }, /credentials/);
  rejects({ NEXT_PUBLIC_APP_URL: 'https://crystalwebsolution.com@app.cdsportswearinc.com' }, /credentials/);
  rejects({ NEXT_PUBLIC_APP_URL: 'https://app.cdsportswearinc.com/app' }, /origin only/);
  rejects({ NEXT_PUBLIC_APP_URL: 'https://app.cdsportswearinc.com/?x=1' }, /origin only/);
  rejects({ NEXT_PUBLIC_APP_URL: 'https://app.cdsportswearinc.com/#frag' }, /origin only/);
});

test('error messages name the setting and never echo the raw value', () => {
  for (const value of ['https://user:hunter2@app.cdsportswearinc.com', 'https://app.cdsportswearinc.com/?token=hunter2', 'hunter2']) {
    try {
      getAppUrl({ NEXT_PUBLIC_APP_URL: value });
      assert.fail(`${value} should have been rejected`);
    } catch (error) {
      assert.ok(error instanceof AppUrlError);
      assert.equal(error.name, 'AppUrlError');
      assert.match(error.message, /NEXT_PUBLIC_APP_URL/);
      assert.doesNotMatch(error.message, /hunter2/);
    }
  }
});

/* ---------------------------------------------------------- retired hosts */

test('the retired domain list is the one record of what must never receive a link', () => {
  assert.deepEqual([...RETIRED_HOSTS], ['crystalwebsolution.com', 'cdsportswearusa.com']);
  assert.ok(Object.isFrozen(RETIRED_HOSTS));
  // Stays consistent with the hosts lib/seo.mjs knows are no longer canonical.
  for (const host of RETIRED_HOSTS) assert.ok(OWN_HOSTNAMES.includes(host), `${host} missing from OWN_HOSTNAMES`);
  assert.ok(!RETIRED_HOSTS.includes(SITE_HOST));
  assert.equal(isRetiredHost(new URL(SITE_ORIGIN).hostname), false);
  assert.equal(isRetiredHost(new URL(APP_ORIGIN).hostname), false);
});

test('a retired host is rejected, whatever the environment', () => {
  const values = [
    'https://crystalwebsolution.com',
    'https://cdsportswearusa.com',
    'http://crystalwebsolution.com',
    'https://CrystalWebSolution.com',
    'https://crystalwebsolution.com:8443',
    'https://crystalwebsolution.com.',
  ];
  for (const value of values) {
    for (const extra of [{}, { NODE_ENV: 'development' }, { NODE_ENV: 'production' }, { VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'production' }]) {
      rejects({ NEXT_PUBLIC_APP_URL: value, ...extra }, /retired domain/);
    }
  }
});

test('a subdomain of a retired host is rejected', () => {
  for (const value of [
    'https://www.crystalwebsolution.com',
    'https://app.crystalwebsolution.com',
    'https://www.cdsportswearusa.com',
    'https://a.b.cdsportswearusa.com',
  ]) {
    rejects({ NEXT_PUBLIC_APP_URL: value, VERCEL_ENV: 'production' }, /retired domain/);
  }
});

test('lookalike hosts that merely contain a retired name are not treated as retired', () => {
  assert.equal(isRetiredHost('notcrystalwebsolution.com'), false);
  assert.equal(isRetiredHost('crystalwebsolution.com.evil.example'), false);
  assert.equal(isRetiredHost('cdsportswearusa.com.au'), false);
  assert.equal(isRetiredHost('cdsportswearinc.com'), false);
  assert.equal(isRetiredHost(undefined), false);
  // ...whereas the real thing, in any spelling, is.
  assert.equal(isRetiredHost('CRYSTALWEBSOLUTION.COM'), true);
  assert.equal(isRetiredHost('crystalwebsolution.com.'), true);
  assert.equal(isRetiredHost('www.crystalwebsolution.com'), true);
});

test('a retired host reached through the Vercel preview fallback is rejected too', () => {
  rejects({ VERCEL_ENV: 'preview', VERCEL_URL: 'crystalwebsolution.com' }, /retired domain/);
});

/* ------------------------------------------------------------------ https */

test('http is rejected when VERCEL_ENV is production', () => {
  rejects({ NEXT_PUBLIC_APP_URL: 'http://app.cdsportswearinc.com', VERCEL_ENV: 'production' }, /https/);
  rejects({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000', VERCEL_ENV: 'production' }, /https/);
});

test('http is allowed outside Vercel Production', () => {
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }), 'http://localhost:3000');
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000', NODE_ENV: 'development' }), 'http://localhost:3000');
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000', VERCEL_ENV: 'preview' }), 'http://localhost:3000');
  // docker-compose.yml's default, run with NODE_ENV=production but not on Vercel.
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000', NODE_ENV: 'production' }), 'http://localhost:3000');
});

test('assertSafeAppUrl can require https on its own', () => {
  assert.equal(assertSafeAppUrl('http://localhost:3000'), 'http://localhost:3000');
  assert.throws(() => assertSafeAppUrl('http://localhost:3000', { requireHttps: true }), AppUrlError);
  assert.equal(assertSafeAppUrl('https://app.cdsportswearinc.com/', { requireHttps: true }), 'https://app.cdsportswearinc.com');
  assert.throws(() => assertSafeAppUrl(undefined), AppUrlError);
});

/* ------------------------------------------------------------------ unset */

test('unset in development or test falls back to localhost', () => {
  assert.equal(LOCAL_APP_URL, 'http://localhost:3000');
  assert.equal(getAppUrl({ NODE_ENV: 'development' }), LOCAL_APP_URL);
  assert.equal(getAppUrl({ NODE_ENV: 'test' }), LOCAL_APP_URL);
  assert.equal(getAppUrl({}), LOCAL_APP_URL);
  assert.equal(getAppUrl({ VERCEL_ENV: 'development', NODE_ENV: 'development' }), LOCAL_APP_URL);
});

test('empty or whitespace-only counts as unset', () => {
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: '', NODE_ENV: 'development' }), LOCAL_APP_URL);
  assert.equal(getAppUrl({ NEXT_PUBLIC_APP_URL: '   ', NODE_ENV: 'development' }), LOCAL_APP_URL);
  rejects({ NEXT_PUBLIC_APP_URL: '', NODE_ENV: 'production' }, /not set in production/);
  rejects({ NEXT_PUBLIC_APP_URL: '  \n', VERCEL_ENV: 'production' }, /not set in production/);
});

test('unset on a Vercel preview falls back to the deployment URL', () => {
  assert.equal(
    getAppUrl({ VERCEL_ENV: 'preview', VERCEL_URL: 'crystal-git-feature-team.vercel.app', NODE_ENV: 'production' }),
    'https://crystal-git-feature-team.vercel.app',
  );
});

test('a configured value wins over the preview fallback', () => {
  assert.equal(
    getAppUrl({ NEXT_PUBLIC_APP_URL: 'https://staging.cdsportswearinc.com', VERCEL_ENV: 'preview', VERCEL_URL: 'x.vercel.app' }),
    'https://staging.cdsportswearinc.com',
  );
});

test('unset on a preview without VERCEL_URL, in a production build, is an error', () => {
  rejects({ VERCEL_ENV: 'preview', NODE_ENV: 'production' }, /not set in production/);
});

test('unset in production throws', () => {
  rejects({ NODE_ENV: 'production' }, /NEXT_PUBLIC_APP_URL is not set in production/);
  rejects({ VERCEL_ENV: 'production', NODE_ENV: 'production' }, /NEXT_PUBLIC_APP_URL is not set in production/);
  // Vercel Production is production even if NODE_ENV says otherwise.
  rejects({ VERCEL_ENV: 'production', NODE_ENV: 'development' }, /not set in production/);
});

test('production never borrows the deployment URL', () => {
  rejects({ VERCEL_ENV: 'production', VERCEL_URL: 'crystal-abc123.vercel.app', NODE_ENV: 'production' }, /not set in production/);
});

/* ------------------------------------------------------ live environment */

test('getAppUrl() with no argument reads the environment at call time', () => {
  const keys = ['NEXT_PUBLIC_APP_URL', 'NODE_ENV', 'VERCEL_ENV', 'VERCEL_URL'];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const setEnv = (values) => {
    for (const key of keys) delete process.env[key];
    Object.assign(process.env, values);
  };

  try {
    setEnv({ NODE_ENV: 'test' });
    assert.equal(getAppUrl(), LOCAL_APP_URL);

    setEnv({ NODE_ENV: 'production', VERCEL_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://app.cdsportswearinc.com/' });
    assert.equal(getAppUrl(), 'https://app.cdsportswearinc.com');

    setEnv({ NODE_ENV: 'production', VERCEL_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://crystalwebsolution.com' });
    assert.throws(() => getAppUrl(), AppUrlError);

    setEnv({ NODE_ENV: 'production', VERCEL_ENV: 'production' });
    assert.throws(() => getAppUrl(), AppUrlError);
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});

/* --------------------------------------------------------- source contract */

const SOURCE_DIRS = ['app', 'components', 'lib', 'scripts'];
const SOURCE_FILE = /\.(?:js|jsx|mjs|cjs)$/;
const SKIPPED_DIRS = new Set(['node_modules', '.next']);

function sourceFiles() {
  const files = [];
  for (const dir of SOURCE_DIRS) {
    for (const entry of readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !SOURCE_FILE.test(entry.name)) continue;
      const full = join(entry.parentPath ?? entry.path, entry.name);
      const rel = relative(ROOT, full).split(sep).join('/');
      if (rel.split('/').some((part) => SKIPPED_DIRS.has(part))) continue;
      files.push(rel);
    }
  }
  for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
    if (entry.isFile() && SOURCE_FILE.test(entry.name)) files.push(entry.name);
  }
  return files;
}

// Crude comment stripper: enough to keep prose that mentions the variable
// from counting as a read, while leaving `https://` inside strings alone.
const withoutComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

test('nothing outside lib/appUrl.mjs reads NEXT_PUBLIC_APP_URL', () => {
  const offenders = sourceFiles()
    .filter((file) => file !== 'lib/appUrl.mjs')
    .filter((file) => /NEXT_PUBLIC_APP_URL/.test(withoutComments(read(file))));

  assert.deepEqual(offenders, [], 'read the app URL through getAppUrl() from lib/appUrl.mjs instead');
  assert.match(read('lib/appUrl.mjs'), /process\.env\.NEXT_PUBLIC_APP_URL/);
});

test('every file that builds an emailed link calls getAppUrl(), never at module scope', () => {
  const consumers = [
    'lib/supabase/admin.js',
    'app/auth/actions.js',
    'app/admin/users/actions.js',
    'app/api/contact/route.js',
    'app/api/cron/crm-notifications/route.js',
  ];

  for (const file of consumers) {
    const source = withoutComments(read(file));
    assert.match(source, /\bgetAppUrl\(/, `${file} must resolve the URL through getAppUrl()`);
    assert.match(source, /from '(?:@\/lib|\.\.)\/appUrl\.mjs'/, `${file} must import lib/appUrl.mjs`);
    // A top-level call would run while `next build` imports the route, and
    // would crash the build wherever the variable is not set.
    assert.doesNotMatch(source, /^(?:const|let|var)\s+\w+\s*=\s*getAppUrl\(/m, `${file} calls getAppUrl() at module scope`);
  }
});

function exportedFunction(source, name) {
  const start = source.indexOf(`export async function ${name}(`);
  assert.notEqual(start, -1, `${name} not found`);
  const next = source.indexOf('\nexport ', start + 1);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

// Each email-sending action: the URL is resolved before the first write
// (generateLink creates the account or token; the role RPC and the email
// follow), the failure branch returns the action's existing generic shape, and
// the resolved value is the one handed to buildVerifyUrl.
const AUTH_EMAIL_ACTIONS = [
  { file: 'app/auth/actions.js', name: 'signUp', failure: /return \{ error: 'Signup is temporarily unavailable\. Please try again later\.' \};/ },
  { file: 'app/auth/actions.js', name: 'resendConfirmationEmail', failure: /return \{ success: true \};/ },
  { file: 'app/auth/actions.js', name: 'requestPasswordReset', failure: /return \{ success: true \};/ },
  { file: 'app/admin/users/actions.js', name: 'inviteUser', failure: /return \{ error: 'Invites are temporarily unavailable\. Please try again later\.' \};/ },
];

for (const { file, name, failure } of AUTH_EMAIL_ACTIONS) {
  test(`${name} resolves the app URL before its first write`, () => {
    const body = exportedFunction(withoutComments(read(file)), name);
    const resolveAt = body.indexOf('getAppUrl()');
    assert.notEqual(resolveAt, -1, `${name} must call getAppUrl()`);

    for (const write of ['generateLink(', "rpc('admin_set_user_role'", 'deleteUser(', 'sendTemplate(']) {
      const writeAt = body.indexOf(write);
      if (writeAt === -1) continue;
      assert.ok(resolveAt < writeAt, `${name} reaches ${write} before resolving the app URL`);
    }
    assert.ok(resolveAt < body.indexOf('generateLink('), `${name} must resolve the app URL before generateLink()`);
  });

  test(`${name} turns a bad app URL into its existing generic failure, and logs why`, () => {
    const body = exportedFunction(withoutComments(read(file)), name);
    const guard = body.match(/try \{\s*appUrl = getAppUrl\(\);\s*\} catch \(configError\) \{([\s\S]*?)\n  \}/);

    assert.ok(guard, `${name} must wrap getAppUrl() in try/catch`);
    assert.match(guard[1], /console\.error\('[^']*app URL misconfigured:', configError\.message\);/);
    assert.match(guard[1], failure);
  });

  test(`${name} builds its links from the resolved appUrl`, () => {
    const body = exportedFunction(withoutComments(read(file)), name);
    assert.match(body, /redirectTo: `\$\{appUrl\}\/auth\/callback/);
    assert.match(body, /buildVerifyUrl\(\{[^}]*\bappUrl\b[^}]*\}\)/);
    assert.doesNotMatch(body, /\bAPP_URL\b/);
  });
}

test('buildVerifyUrl takes its origin from getAppUrl(), not from the raw variable', () => {
  const source = read('lib/supabase/admin.js');
  assert.match(source, /appUrl = getAppUrl\(\)/);
  assert.match(source, /return `\$\{appUrl\}\/auth\/verify\?\$\{params\.toString\(\)\}`;/);
  assert.doesNotMatch(withoutComments(source), /NEXT_PUBLIC_APP_URL/);
});

test('the contact route drops the CRM link, and never fails, when the app URL is bad', () => {
  const source = read('app/api/contact/route.js');
  const helper = source.slice(source.indexOf('function dealUrlFor('), source.indexOf('// Best-effort CRM write'));

  assert.match(helper, /try \{\s*return `\$\{getAppUrl\(\)\}\/admin\/deals\/\$\{dealId\}`;\s*\} catch \(error\) \{/);
  assert.match(helper, /console\.error\(/);
  assert.match(helper, /return undefined;/);
  assert.match(source, /result\?\.deal_id \? dealUrlFor\(result\.deal_id\) : undefined/);
});

test('the notification drain halts with a 503 before claiming anything when the app URL is bad', () => {
  const source = read('app/api/cron/crm-notifications/route.js');
  const drain = source.slice(source.indexOf('async function drain('), source.indexOf('// Watchdog.'));

  const emailGuardAt = drain.indexOf('isEmailConfigured()');
  const resolveAt = drain.indexOf('getAppUrl()');
  const claimAt = drain.indexOf("rpc('claim_notification_email_batch'");
  assert.ok(emailGuardAt !== -1 && resolveAt !== -1 && claimAt !== -1);
  assert.ok(emailGuardAt < resolveAt && resolveAt < claimAt, 'resolve after the email-config 503, before the claim');

  const guard = drain.match(/try \{\s*appUrl = getAppUrl\(\);\s*\} catch \(configError\) \{([\s\S]*?)\n  \}/);
  assert.ok(guard, 'drain must wrap getAppUrl() in try/catch');
  assert.match(guard[1], /console\.error\(/);
  assert.match(guard[1], /return json\(\{ ok: false, error: 'Application URL is not configured\.' \}, 503\);/);
  // A configuration problem must never mark an outbox row failed or skipped.
  assert.doesNotMatch(guard[1], /markLeaseFailed|mark_notification_email_failed/);
  assert.match(drain, /\bappUrl,\n\s*\}\),/, 'the resolved URL must reach templateContextFor');
});
