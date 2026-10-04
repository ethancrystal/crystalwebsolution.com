import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

function runDryRun(extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.CRM_TEST_EMPLOYEE_EMAIL;
    delete env.CRM_TEST_CLIENT_EMAIL;
    Object.assign(env, extraEnv);
    const child = spawn('node', ['scripts/provision-crm-test-users.mjs', '--dry-run'], {
      cwd: process.cwd(),
      env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (data) => {
      stdout += data;
    });

    child.stderr.on('data', (data) => {
      stderr += data;
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`Script exited with code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

test('test-user provisioning script exposes expected dry-run output and never prints secrets', async () => {
  const script = await readFile('scripts/provision-crm-test-users.mjs', 'utf8');

  // The admin entry is the pinned owner account (0044) and never renames it.
  assert.match(script, /const ADMIN_EMAIL = 'moizj00@gmail\.com';/);
  assert.match(script, /\{ email: ADMIN_EMAIL, role: 'admin' \}/);
  assert.match(script, /ethan\+employee@cdsportswearinc\.com/);
  assert.match(script, /ethan\+client@cdsportswearinc\.com/);
  assert.match(script, /--dry-run/);
  assert.match(script, /--execute/);
  assert.doesNotMatch(script, /password\s*[:=]\s*['"][^'"]+['"]/i);

  const { stdout } = await runDryRun();
  assert.match(stdout, /moizj00@gmail\.com -> admin/);
  assert.match(stdout, /ethan\+employee@cdsportswearinc\.com/);
  assert.match(stdout, /ethan\+client@cdsportswearinc\.com/);
  assert.match(stdout, /\[dry-run\]/);
  assert.doesNotMatch(stdout, /RESEND_API_KEY|SUPABASE_SERVICE_ROLE_KEY|supabase\.url/i);
});

test('test-user provisioning refuses accounts on a retired domain', async () => {
  // crystalwebsolution.com is served by a third party; a confirmed account
  // there can be taken over through "forgot password".
  const { isRetiredDomainEmail } = await import('../../scripts/provision-crm-test-users.mjs');
  assert.equal(isRetiredDomainEmail('ethan+client@crystalwebsolution.com'), true);
  assert.equal(isRetiredDomainEmail('a@mail.cdsportswearusa.com'), true);
  assert.equal(isRetiredDomainEmail('ethan+client@cdsportswearinc.com'), false);

  await assert.rejects(
    runDryRun({ CRM_TEST_CLIENT_EMAIL: 'ethan+client@crystalwebsolution.com' }),
    (error) => /retired domain/.test(error.stderr),
  );
});
