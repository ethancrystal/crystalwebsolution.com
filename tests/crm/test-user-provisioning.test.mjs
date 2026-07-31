import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

function runDryRun() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/provision-crm-test-users.mjs', '--dry-run'], {
      cwd: process.cwd(),
      env: process.env,
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

  assert.match(script, /ethan@crystalwebsolution\.com/);
  assert.match(script, /ethan\+employee@crystalwebsolution\.com/);
  assert.match(script, /ethan\+client@crystalwebsolution\.com/);
  assert.match(script, /--dry-run/);
  assert.match(script, /--execute/);
  assert.doesNotMatch(script, /password\s*[:=]\s*['"][^'"]+['"]/i);

  const { stdout } = await runDryRun();
  assert.match(stdout, /ethan@crystalwebsolution\.com/);
  assert.match(stdout, /ethan\+employee@crystalwebsolution\.com/);
  assert.match(stdout, /ethan\+client@crystalwebsolution\.com/);
  assert.match(stdout, /\[dry-run\]/);
  assert.doesNotMatch(stdout, /RESEND_API_KEY|SUPABASE_SERVICE_ROLE_KEY|supabase\.url/i);
});
