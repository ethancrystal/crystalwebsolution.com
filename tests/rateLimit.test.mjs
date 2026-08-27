import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

// lib/rateLimit.js imports next/headers at module scope, which Node's own
// resolver can't find outside a Next.js build/runtime (same reason
// lib/supabase/server.js has no direct test import either) - so this checks
// source shape rather than importing the module, matching that convention.
test('the auth rate limiter fails open (not closed) when unconfigured or erroring', async () => {
  const source = await readFile('lib/rateLimit.js', 'utf8');

  // No Upstash credentials configured -> allowed, not blocked. A rate
  // limiter that isn't set up must not become an outage.
  assert.match(source, /if \(!url \|\| !token\) \{[\s\S]{0,400}return null;/);
  assert.match(source, /if \(!rl\) return \{ allowed: true \};/);

  // A failed Upstash lookup (network/outage) also allows, inside a catch.
  assert.match(source, /catch \(error\) \{[\s\S]{0,150}return \{ allowed: true \};/);
});

test('the auth rate limiter scopes limits by both IP and email under the action name', async () => {
  const source = await readFile('lib/rateLimit.js', 'utf8');

  assert.match(source, /`\$\{action\}:ip:\$\{ip\}`/);
  assert.match(source, /`\$\{action\}:email:\$\{email\.toLowerCase\(\)\}`/);
  assert.match(source, /byIp\.success && byEmail\.success/);
});
