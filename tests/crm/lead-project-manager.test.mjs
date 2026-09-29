// Lead project manager assignment: the admin-only server actions, the admin
// project page wiring, the "assign a project manager" email, the drain's
// role-aware links, stale-assignment guard and client context, and the login
// `next` hand-off. The action's behaviour is exercised for real in
// tests/crm/lead-manager-action.test.jsx; these are the source contracts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { renderNotificationEmail } from '../../lib/email/templates.js';

const ACTIONS = 'app/actions/assignment-actions.js';
const DRAIN = 'app/api/cron/crm-notifications/route.js';

function functionBody(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} should exist`);
  const next = source.indexOf('\nexport async function ', start + 1);
  return source.slice(start, next < 0 ? undefined : next);
}

test('assignment actions are admin-only server actions over the existing RPCs', async () => {
  const source = await readFile(ACTIONS, 'utf8');

  assert.match(source, /^'use server';/);
  assert.match(source, /export async function listProjectManagerCandidates\(\)/);
  assert.match(source, /export async function setLeadProjectManager\(formData\)/);
  assert.match(source, /profile\.role !== 'admin'/);
  assert.match(source, /\.rpc\('assign_project_user'/);
  assert.match(source, /\.rpc\('remove_project_assignment'/);
  assert.match(source, /\.rpc\('transition_project_status'/);
  // No direct table writes, and no leaking database error text.
  assert.doesNotMatch(source, /\.from\([^)]*\)\s*\.(?:insert|update|delete|upsert)\(/);
  assert.doesNotMatch(source, /error\.message|error\.details|error\.hint/);
});

test('setLeadProjectManager reads status, role and assignments server-side, never from the form', async () => {
  const body = functionBody(await readFile(ACTIONS, 'utf8'), 'setLeadProjectManager');

  assert.match(body, /formString\(formData, 'projectId'\)/);
  assert.match(body, /formString\(formData, 'userId'\)/);
  assert.doesNotMatch(body, /formData\.get\(|formString\(formData, '(?:status|role|assignments|fromStatus)'\)/);
  assert.match(body, /\.from\('projects'\)\s*\.select\('id, status'\)/);
  assert.match(body, /manager\.role !== 'project_manager'/);
  assert.match(body, /\.from\('project_assignments'\)/);
});

test('one lead: assign first, then remove the others, then move a new project to planned', async () => {
  const body = functionBody(await readFile(ACTIONS, 'utf8'), 'setLeadProjectManager');

  const assignAt = body.indexOf("rpc('assign_project_user'");
  const removeAt = body.indexOf("rpc('remove_project_assignment'");
  const transitionAt = body.indexOf("rpc('transition_project_status'");
  assert.ok(assignAt > 0 && assignAt < removeAt && removeAt < transitionAt);

  // assign_project_user re-sends its email on every call: skip it only for the current lead,
  // so a manager promoted from "also assigned" is still told.
  assert.match(body, /const currentLeadId = assignments\?\.\[0\]\?\.user_id \?\? null;/);
  assert.match(body, /const notified = currentLeadId !== userId;\s*if \(notified\) \{/);
  assert.match(body, /if \(otherId === userId\) continue;/);

  assert.match(body, /project\.status === 'brief_submitted'/);
  assert.match(body, /p_to_status: 'planned'/);
  assert.match(body, /p_visibility: 'shared'/);
  assert.match(body, /const note = managerAssignedNote\(name, projectId\);/);

  // A failed status move after a successful assignment is a warning, not a failure.
  assert.match(body.slice(transitionAt), /warnings\.push\(/);
  assert.match(body, /return success\(requestId, \{ movedToPlanned, notified, warnings \}\)/);
});

test('project managers are shown by name only, never by email', async () => {
  const actions = await readFile(ACTIONS, 'utf8');
  // No service-role address lookup, and no email field in what the picker receives.
  assert.doesNotMatch(actions, /createAdminClient|getUserById|\bemail\s*:/i);

  const card = await readFile('components/crm/LeadManagerCard.jsx', 'utf8');
  assert.doesNotMatch(card, /\.email\b|lead-pm-email/);
});

test('the admin project page leads with the lead-manager card and can move a new brief to planned', async () => {
  const page = await readFile('app/admin/projects/[id]/page.jsx', 'utf8');

  assert.match(page, /import LeadManagerCard from '@\/components\/crm\/LeadManagerCard'/);
  assert.ok(page.indexOf('<LeadManagerCard') < page.indexOf('<ProjectOverview'), 'card renders above the overview');
  assert.match(page, /brief_submitted: \['planned'\]/);
  assert.doesNotMatch(page, /assignProject\(/);
  assert.doesNotMatch(page, /'cancelled'\]/);
});

test('every admin status button is a move the contract allows', async () => {
  const { canTransition } = await import('../../lib/crm/project-contract.mjs');
  const page = await readFile('app/admin/projects/[id]/page.jsx', 'utf8');
  const block = page.slice(page.indexOf('const NEXT_OPTIONS = {'), page.indexOf('}[project.status]'));
  const entries = [...block.matchAll(/(\w+): \[([^\]]*)\]/g)];
  assert.ok(entries.length >= 5, 'NEXT_OPTIONS parsed');
  for (const [, from, list] of entries) {
    for (const to of list.split(',').map((value) => value.trim().replace(/'/g, '')).filter(Boolean)) {
      assert.ok(canTransition(from, to), `${from} -> ${to} is offered but ALLOWED_TRANSITIONS rejects it`);
    }
  }

  const card = await readFile('components/crm/LeadManagerCard.jsx', 'utf8');
  assert.match(card, /setLeadProjectManager\(formData\)/);
  assert.match(card, /listProjectManagerCandidates\(\)/);
  assert.match(card, /aria-pressed=/);
  // Remove is locked while an assignment is being saved, and the notice
  // only promises an email when one was queued.
  assert.match(card, /disabled=\{isAssigning \|\| removingUserId === lead\.user_id\}/);
  assert.match(card, /result\.data\?\.notified === false/);
});

test('admin home and project list surface projects that need a manager', async () => {
  const home = await readFile('app/admin/page.jsx', 'utf8');
  assert.match(home, /href="\/admin\/projects\?pm=none"/);
  assert.match(home, /listProjectsForViewer/);
  // The header wraps instead of pushing Sign Out off a phone screen.
  assert.match(home, /\.crm-admin-header \{[^}]*flex-wrap: wrap;/);
  assert.match(home, /\.crm-header-actions \{[^}]*flex-wrap: wrap;/);

  const list = await readFile('app/admin/projects/page.jsx', 'utf8');
  assert.match(list, /get\('pm'\) === 'none'/);
  assert.match(list, /function needsManager\(project\)/);
});

const ADMIN_CONTEXT = {
  fullName: 'Moiz',
  recipientRole: 'admin',
  projectName: 'Website — Acme <script>',
  briefTitle: 'Website — Acme',
  briefType: 'website',
  createdProject: true,
  staffProjectUrl: 'https://app.example.test/admin/projects/1',
  clientName: 'Jane <b>Client</b>',
  clientEmail: 'jane@example.test',
  clientCompany: 'Acme Co',
  clientSince: '2026-09-29T16:30:00.000Z',
  clientProjectCount: 1,
  targetDate: '2026-10-16',
};

test('a new project nobody leads asks the admin to assign a project manager', () => {
  const email = renderNotificationEmail('project.brief_submitted', ADMIN_CONTEXT);

  assert.match(email.subject, /^Assign a project manager: new Website project from Jane/);
  assert.match(email.html, /Assign a project manager<\/a>/);
  assert.match(email.html, /https:\/\/app\.example\.test\/admin\/projects\/1/);
  assert.match(email.html, /jane@example\.test/);
  assert.match(email.html, /Acme Co/);
  assert.match(email.html, /Sep 29, 2026/);
  assert.match(email.html, /Oct 16, 2026/);
  assert.match(email.html, /is a new client/);
  assert.doesNotMatch(email.html, /<script>|<b>Client<\/b>|undefined|null/);
});

test('the brief email does not ask for an assignment once a manager leads, or for anyone but the admin', () => {
  const led = renderNotificationEmail('project.brief_submitted', { ...ADMIN_CONTEXT, leadManagerName: 'Ethan Ray' });
  assert.match(led.subject, /^New Website brief/);
  assert.doesNotMatch(led.html, /Assign a project manager/);
  assert.match(led.html, /Ethan Ray/);

  const manager = renderNotificationEmail('project.brief_submitted', { ...ADMIN_CONTEXT, recipientRole: 'project_manager' });
  assert.match(manager.subject, /^New Website brief/);
  assert.match(manager.html, /Read the brief/);

  const attached = renderNotificationEmail('project.brief_submitted', { ...ADMIN_CONTEXT, createdProject: false });
  assert.match(attached.subject, /^New Website brief/);
});

test('the assign-a-manager email still renders cleanly with no client details', () => {
  const email = renderNotificationEmail('project.brief_submitted', {
    recipientRole: 'admin',
    createdProject: true,
    briefType: 'logo',
    staffProjectUrl: 'https://app.example.test/admin/projects/1',
  });

  assert.match(email.subject, /new Logo design project from A client/);
  assert.doesNotMatch(email.html, /undefined|null|NaN|Invalid Date/);
});

test('timestamps are dated in studio (Eastern) time; date-only values never shift', () => {
  const email = renderNotificationEmail('project.brief_submitted', {
    ...ADMIN_CONTEXT,
    clientSince: '2026-09-29T01:30:00.000Z', // 9:30pm Eastern on Sep 28
    targetDate: '2026-10-16',
  });
  assert.match(email.html, /Account created:<\/span> <strong[^>]*>Sep 28, 2026/);
  assert.match(email.html, /Target date:<\/span> <strong[^>]*>Oct 16, 2026/);
});

test('a project manager is told they lead the project and who the client is', () => {
  const email = renderNotificationEmail('project.user_assigned', {
    fullName: 'Ethan Ray',
    role: 'project_manager',
    projectName: 'Website — Acme',
    projectUrl: 'https://app.example.test/team/projects/1',
    clientName: 'Jane Client',
    clientEmail: 'jane@example.test',
    clientCompany: 'Acme Co',
  });

  assert.match(email.subject, /You're the project manager for Website — Acme/);
  assert.match(email.html, /https:\/\/app\.example\.test\/team\/projects\/1/);
  assert.match(email.html, /Jane Client/);
  assert.doesNotMatch(email.html, /undefined|null/);
});

test('a new project moving to Planned introduces the client to their project manager by name', () => {
  const email = renderNotificationEmail('project.status_transitioned', {
    fullName: 'Jane',
    recipientRole: 'client',
    projectName: 'Website — Acme',
    fromStatus: 'brief_submitted',
    toStatus: 'planned',
    leadManagerName: 'Ethan <Ray>',
    projectUrl: 'https://app.example.test/dashboard/projects/1',
  });

  assert.match(email.subject, /Website — Acme is planned: meet Ethan <Ray>, your project manager/);
  assert.match(email.html, /Your project is planned/);
  assert.match(email.html, /Ethan &lt;Ray&gt;<\/strong> is your project manager/);
  assert.match(email.html, /this is your project/);
  assert.doesNotMatch(email.html, /undefined|null|assigned to this project/);

  const staff = renderNotificationEmail('project.status_transitioned', {
    recipientRole: 'project_manager',
    projectName: 'Website — Acme',
    fromStatus: 'brief_submitted',
    toStatus: 'planned',
    leadManagerName: 'Ethan Ray',
    projectUrl: 'https://app.example.test/team/projects/1',
  });
  assert.match(staff.subject, /is now Planned/);
  assert.match(staff.html, /assigned to this project/);
});

test('a project manager only gets emails about projects they are still assigned to', async () => {
  const source = await readFile(DRAIN, 'utf8');
  const loop = source.slice(source.indexOf('for (const row of rows)'), source.indexOf('const template = renderNotificationEmail('));

  assert.match(loop, /recipient\.role === 'project_manager'/);
  assert.match(loop, /liveAssignments\.checked/);
  assert.match(loop, /!liveAssignments\.pairs\.has\(`\$\{row\.project_id\}:\$\{row\.user_id\}`\)/);
  // Must be a failure_code the notifications_outbox check constraint allows.
  assert.match(loop, /failureCode: 'missing_recipient'/);
  assert.match(loop, /retryable: false/);
  assert.match(source, /async function resolveLiveAssignments\(/);
  // Fails open: a lookup error never blocks delivery.
  assert.match(source, /return \{ checked: false, pairs \};/);
});

test('the drain links every recipient to their own workspace and names clients to staff only', async () => {
  const source = await readFile(DRAIN, 'utf8');

  assert.match(source, /projectUrl: staffProjectUrlFor\(row\.project_id, recipient\.role\)/);
  assert.match(source, /recipientRole: recipient\.role/);
  assert.match(source, /const clientContext = staffRecipient \? client : null;/);
  assert.match(source, /CLIENT_CONTEXT_EVENTS = new Set\(\['project\.brief_submitted', 'project\.user_assigned'\]\)/);
  assert.match(source, /async function resolveProjectClients\(/);
  assert.match(source, /async function resolveLeadManagers\(/);
  assert.match(source, /\.select\('id, title, company_id, created_by, target_date'\)/);
  // The lead manager's name (never an email) reaches brief alerts and status updates.
  assert.match(source, /LEAD_MANAGER_EVENTS = new Set\(\['project\.brief_submitted', 'project\.status_transitioned'\]\)/);
  assert.match(source, /leadManagerName: leadManager\?\.fullName \?\? undefined/);
});

test('a signed-out visitor is sent to the portal login with the page they asked for', async () => {
  const middleware = await readFile('middleware.js', 'utf8');

  assert.match(middleware, /if \(next\) url\.searchParams\.set\('next', next\);/);
  assert.match(middleware, /params\.delete\('_rsc'\)/);
  assert.match(
    middleware,
    /if \(protectedPortal && \(userError \|\| !user\)\) \{\s*return portalLoginResponse\(request, protectedPortal, response, null, requestedPortalPath\(request\)\);/,
  );
  assert.match(
    middleware,
    /if \(!profile\) return portalLoginResponse\(request, protectedPortal, response, null, requestedPortalPath\(request\)\);/,
  );
  // A signed-in user in the wrong portal still goes to their own home, not back to the login.
  assert.match(middleware, /if \(roleHome\) return redirectWithCookies\(new URL\(roleHome, request\.url\), response\);/);
});
