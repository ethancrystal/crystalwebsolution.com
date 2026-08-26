import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const actionPath = 'app/actions/onboarding-actions.js';
const pagePath = 'app/onboarding/page.jsx';
const formPath = 'components/crm/ClientOnboardingForm.jsx';

async function readSource(path) {
  return readFile(path, 'utf8');
}

test('client onboarding has a server action that uses the canonical RPC and server identity', async () => {
  const source = await readSource(actionPath);

  assert.match(source, /^['"]use server['"];?/m);
  assert.match(source, /export async function onboardClientCompany\(formData\)/);
  assert.match(source, /getAuthenticatedProfile/);
  assert.match(source, /profile\.role\s*!==\s*['"]client['"]/);
  assert.match(source, /profile\.company_id/);
  assert.match(source, /\.rpc\(['"]onboard_client_company['"]/);
  assert.match(source, /p_company_name/);
  assert.match(source, /p_contact_name/);
  assert.match(source, /p_phone/);
  assert.match(source, /revalidatePath\(['"]\/dashboard['"]\)/);
  assert.doesNotMatch(source, /formData\.get\(['"](?:userId|user_id|companyId|company_id|email)['"]\)/);
});

test('onboarding page is server-gated and routes linked clients back to the dashboard', async () => {
  const source = await readSource(pagePath);

  assert.match(source, /export const dynamic = ['"]force-dynamic['"];/);
  assert.match(source, /requireRole\(\[['"]client['"]\]/);
  assert.match(source, /profile\.company_id/);
  assert.match(source, /redirect\(['"]\/dashboard['"]\)/);
  assert.match(source, /ClientOnboardingForm/);
});

test('onboarding form explains the workspace and sends the client to first-project intake', async () => {
  const source = await readSource(formPath);

  assert.match(source, /Projects/);
  assert.match(source, /Messages/);
  assert.match(source, /Files\s*&\s*Deliverables/);
  assert.match(source, /Approvals/);
  assert.match(source, /Create your first project/);
  assert.match(source, /onboardClientCompany/);
});

test('onboarding completion redirects to the dashboard before first-project intake', async () => {
  const source = await readSource(actionPath);

  assert.match(source, /revalidatePath\(['"]\/dashboard['"]\)/);
  assert.match(source, /redirect\(['"]\/dashboard['"]\)/);
});

test('onboarding form validates the company and contact fields before submission', async () => {
  const source = await readSource(formPath);

  assert.match(source, /name=['"]companyName['"]/);
  assert.match(source, /name=['"]contactName['"]/);
  assert.match(source, /name=['"]phone['"]/);
  assert.match(source, /required/);
  assert.match(source, /isLoading/);
});

test('dashboard sends clients without a company to onboarding before rendering project intake', async () => {
  const source = await readSource('app/dashboard/page.jsx');

  assert.match(source, /profileData\.company_id/);
  assert.match(source, /router\.replace\(['"]\/onboarding['"]\)/);
  assert.match(source, /if \(!profileData\.company_id\)/);
  assert.match(source, /Opening onboarding/);
});

test('middleware protects the onboarding route without changing staff portal routing', async () => {
  const source = await readSource('middleware.js');

  assert.match(source, /['"]\/onboarding['"]/);
  assert.match(source, /portalForPath/);
  assert.match(source, /isRoleAllowed/);
});

test('onboarding does not add a tour dependency or a new onboarding schema field', async () => {
  const source = await readSource(formPath);

  assert.doesNotMatch(source, /from ['"](?:react-joyride|shepherd\.js|intro\.js)/);
  assert.doesNotMatch(source, /tour_completed|onboarding_completed|onboarding_state/);
});

test('onboarding route remains outside the generic auth redirect list', async () => {
  const source = await readSource('middleware.js');

  assert.doesNotMatch(source, /\[['"]signup['"],\s*['"]forgot-password['"],\s*['"]onboarding['"]\]/);
});
