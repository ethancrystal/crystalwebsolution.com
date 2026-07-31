import { createClient } from '@supabase/supabase-js';
import { sendInviteEmail } from '../lib/email/resend.js';

const ADMIN_EMAIL = 'ethan@crystalwebsolution.com';
const EMPLOYEE_EMAIL = 'ethan+employee@crystalwebsolution.com';
const CLIENT_EMAIL = 'ethan+client@crystalwebsolution.com';

const TEST_USERS = Object.freeze([
  { email: ADMIN_EMAIL, role: 'admin', fullName: 'Ethan Admin' },
  { email: EMPLOYEE_EMAIL, role: 'project_manager', fullName: 'Ethan Employee' },
  { email: CLIENT_EMAIL, role: 'client', fullName: 'Ethan Client' },
]);

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(url, key);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = { execute: false, dryRun: false };

  for (const arg of args) {
    if (arg === '--execute') flags.execute = true;
    if (arg === '--dry-run') flags.dryRun = true;
  }

  if (!flags.execute && !flags.dryRun) {
    flags.dryRun = true;
  }

  return flags;
}

async function loadExistingUser(supabase, email) {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw new Error(`Unable to list users: ${error.message}`);
  }

  return (data?.users ?? []).find((user) => user.email === email) || null;
}

async function ensureAuthUser(supabase, email) {
  const existing = await loadExistingUser(supabase, email);

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (error || !data?.user) {
    throw new Error(`Unable to create auth user for ${email}: ${error?.message || 'unknown error'}`);
  }

  return data.user;
}

async function setProfileRole(supabase, userId, role, fullName) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, role, full_name: fullName }, { onConflict: 'id' })
    .select('id, role, full_name')
    .single();

  if (error || !data) {
    throw new Error(`Unable to provision profile for ${userId}: ${error?.message || 'unknown error'}`);
  }

  return data;
}

async function sendUserInvite(email, role, inviteUrl) {
  if (!inviteUrl) {
    throw new Error(`Missing invite URL for ${email}.`);
  }

  return sendInviteEmail({
    to: email,
    fullName: role === 'admin' ? 'Ethan Admin' : role === 'project_manager' ? 'Ethan Employee' : 'Ethan Client',
    role,
    inviteUrl,
  });
}

async function provisionUser(supabase, user) {
  const authUser = await ensureAuthUser(supabase, user.email);
  const profile = await setProfileRole(supabase, authUser.id, user.role, user.fullName);

  return {
    email: user.email,
    role: user.role,
    userId: authUser.id,
    profileId: profile.id,
  };
}

async function main() {
  const flags = parseArgs();

  if (!flags.execute) {
    console.log('[dry-run] Test users that would be provisioned:');
    for (const user of TEST_USERS) {
      console.log(`- ${user.email} -> ${user.role}`);
    }
    return;
  }

  const supabase = getSupabase();
  console.log('[execute] Provisioning test users...');
  const results = [];

  for (const user of TEST_USERS) {
    try {
      const result = await provisionUser(supabase, user);
      results.push(result);
      console.log(`- Provisioned ${result.email} as ${result.role}`);
    } catch (error) {
      console.error(`- Failed to provision ${user.email}: ${error.message}`);
      process.exitCode = 1;
    }
  }

  console.log(`[execute] Provisioned ${results.length} of ${TEST_USERS.length} test users.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
