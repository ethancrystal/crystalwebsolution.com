import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { NOTIFICATION_TEMPLATES, renderNotificationEmail } from '../../lib/email/templates.js';

test('brief actions are server actions scoped to client profiles with a company', async () => {
  const source = await readFile('app/actions/brief-actions.js', 'utf8');
  assert.match(source, /^'use server';/);
  assert.match(source, /profile\.role !== 'client'/);
  assert.match(source, /isCanonicalUuid\(profile\.company_id\)/);
  // RLS does the row scoping; the service-role client must never be used here.
  assert.doesNotMatch(source, /supabase\/admin|createAdminClient|SERVICE_ROLE/);
});

test('draft saves sanitize against the template and only touch drafts', async () => {
  const source = await readFile('app/actions/brief-actions.js', 'utf8');
  const save = source.slice(source.indexOf('export async function saveBriefDraft'), source.indexOf('export async function deleteBriefDraft'));
  assert.match(save, /sanitizeBriefAnswers\(brief\.brief_type, rawAnswers\)/);
  assert.match(save, /answersFit\(answers\)/);
  assert.match(save, /\.eq\('status', 'draft'\)/);
  assert.doesNotMatch(save, /status:\s*'submitted'/);
});

test('submission goes through the submit_project_brief RPC after a required-field check', async () => {
  const source = await readFile('app/actions/brief-actions.js', 'utf8');
  const submit = source.slice(source.indexOf('export async function submitBrief'));
  assert.match(submit, /missingRequiredAnswers\(brief\.brief_type, brief\.answers\)/);
  assert.match(submit, /renderBriefSummary\(brief\.brief_type, brief\.answers\)/);
  assert.match(submit, /rpc\('submit_project_brief'/);
  assert.match(submit, /normalizeProjectTitle/);
});

test('client, team and admin project pages all show submitted briefs', async () => {
  for (const path of [
    'app/dashboard/projects/[id]/page.jsx',
    'app/team/projects/[id]/page.jsx',
    'app/admin/projects/[id]/page.jsx',
  ]) {
    const source = await readFile(path, 'utf8');
    assert.match(source, /<ProjectBriefs projectId=\{projectId\}/, path);
  }
  const client = await readFile('app/dashboard/projects/[id]/page.jsx', 'utf8');
  assert.match(client, /<ProjectBriefs projectId=\{projectId\} canAddBriefs/);
});

test('project.brief_submitted email is registered and escapes client text', () => {
  assert.equal(typeof NOTIFICATION_TEMPLATES['project.brief_submitted'], 'function');
  const email = renderNotificationEmail('project.brief_submitted', {
    projectName: 'Acme <script>',
    briefTitle: 'Logo design — <b>Acme</b>',
    briefType: 'logo',
    createdProject: true,
    staffProjectUrl: 'https://example.test/admin/projects/1',
    fullName: 'Moiz',
  });
  assert.match(email.subject, /New Logo design brief/);
  assert.match(email.html, /https:\/\/example\.test\/admin\/projects\/1/);
  assert.doesNotMatch(email.html, /<script>|<b>Acme<\/b>/);
});

test('the notification worker links staff to their own workspace for brief alerts', async () => {
  const source = await readFile('app/api/cron/crm-notifications/route.js', 'utf8');
  assert.match(source, /admin: '\/admin\/projects'/);
  assert.match(source, /project_manager: '\/team\/projects'/);
  assert.match(source, /staffProjectUrl: staffProjectUrlFor\(row\.project_id, recipient\.role\)/);
  assert.match(source, /\.select\('id, full_name, role'\)/);
});
