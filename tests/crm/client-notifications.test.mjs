// v1.92 client notifications: the brief acknowledgement, the admin's new-
// client alert, friendlier client status emails, the drain's handling of
// project-less rows, and the outbox watchdog.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { renderNotificationEmail } from '../../lib/email/templates.js';
import { STATUS_LINES, notificationText } from '../../lib/crm/notification-copy.mjs';

const DRAIN = 'app/api/cron/crm-notifications/route.js';

test('a client who submits a brief gets a friendly "we have your brief" email', () => {
  const email = renderNotificationEmail('project.brief_received', {
    fullName: 'Jane <Client>',
    projectName: 'Website — Acme',
    briefTitle: 'Website — Acme',
    briefType: 'website',
    createdProject: true,
    projectUrl: 'https://app.example.test/dashboard/projects/1',
  });

  assert.equal(email.subject, 'We have your Website brief: Website — Acme');
  assert.match(email.html, /We have your brief/);
  assert.match(email.html, /even the optional ones/);
  assert.match(email.html, /We assign a project manager, usually within one business day\./);
  assert.match(email.html, /Open your project<\/a>/);
  assert.match(email.html, /https:\/\/app\.example\.test\/dashboard\/projects\/1/);
  assert.match(email.html, /Hi Jane &lt;Client&gt;/);
  assert.doesNotMatch(email.html, /undefined|null/);

  const addedToExisting = renderNotificationEmail('project.brief_received', {
    projectName: 'Website — Acme',
    briefType: 'logo',
    createdProject: false,
  });
  assert.match(addedToExisting.html, /looks it over alongside the rest of your project/);
});

test('the admin hears when a new client finishes signing up', () => {
  const email = renderNotificationEmail('client.onboarded', {
    fullName: 'Moiz',
    contactName: 'Jane Client',
    companyName: 'Acme <Co>',
    clientEmail: 'jane@example.test',
    phone: '555-0100',
    companyUrl: 'https://app.example.test/admin/companies/9',
  });

  assert.equal(email.subject, 'New client: Jane Client from Acme <Co>');
  assert.match(email.html, /A new client just joined/);
  assert.match(email.html, /Acme &lt;Co&gt;/);
  assert.match(email.html, /jane@example\.test/);
  assert.match(email.html, /555-0100/);
  assert.match(email.html, /View the client<\/a>/);

  const bare = renderNotificationEmail('client.onboarded', {});
  assert.equal(bare.subject, 'New client: A new client');
  assert.doesNotMatch(bare.html, /undefined|null|View the client/);
});

test('client status emails carry the same friendly line as the in-app notification', () => {
  for (const toStatus of ['in_progress', 'client_review', 'approved', 'delivered']) {
    const email = renderNotificationEmail('project.status_transitioned', {
      recipientRole: 'client',
      projectName: 'Website — Acme',
      fromStatus: 'planned',
      toStatus,
      projectUrl: 'https://app.example.test/dashboard/projects/1',
    });
    assert.ok(
      email.html.includes(STATUS_LINES[toStatus].replace(/'/g, '&#39;')),
      `${toStatus} email carries its line`,
    );
    assert.equal(
      notificationText('project.status_transitioned', { to_status: toStatus }),
      STATUS_LINES[toStatus],
    );
  }

  const staff = renderNotificationEmail('project.status_transitioned', {
    recipientRole: 'project_manager',
    projectName: 'Website — Acme',
    fromStatus: 'planned',
    toStatus: 'in_progress',
  });
  assert.ok(!staff.html.includes(STATUS_LINES.in_progress), 'staff get the plain version');
});

test('in-app text exists for the new events', () => {
  assert.match(notificationText('project.brief_received', { brief_type: 'website' }), /^We have your brief!/);
  assert.equal(notificationText('client.onboarded', { company_name: 'Acme' }), 'New client: Acme.');
  assert.equal(notificationText('client.onboarded', {}), 'A new client joined.');
});

test('the drain maps new-client details for staff only, and links the admin to the company', async () => {
  const source = await readFile(DRAIN, 'utf8');

  assert.match(source, /clientEmail: clientContext\?\.email \?\? \(staffRecipient \? payload\.client_email : undefined\)/);
  assert.match(source, /contactName: staffRecipient \? payload\.contact_name : undefined/);
  assert.match(source, /companyName: staffRecipient \? payload\.company_name : undefined/);
  assert.match(source, /companyUrl: recipient\.role === 'admin' \? companyUrlFor\(appUrl, payload\.company_id\) : undefined/);
  assert.match(source, /`\$\{appUrl\}\/admin\/companies\/\$\{companyId\}`/);
});

test('the watchdog reports stuck email from both drain exits, without payloads', async () => {
  const source = await readFile(DRAIN, 'utf8');

  // Both the empty-batch return and the normal return include the health counts.
  assert.equal(source.match(/\.\.\.\(await watchOutbox\(supabase, \{ failed(: 0)? \}\)\)/g)?.length, 2);

  const watch = source.slice(source.indexOf('async function watchOutbox('), source.indexOf('async function cleanupStaleAttachments('));
  assert.match(watch, /\.eq\('status', 'pending'\)/);
  assert.match(watch, /\.lt\('attempts', MAX_CLAIMS\)/);
  assert.match(watch, /\.lt\('available_at', dueBefore\)/);
  assert.match(watch, /\.gte\('attempts', MAX_CLAIMS\)/);
  assert.match(watch, /Sentry\.captureMessage\('CRM notification emails need attention', \{ level: 'warning', extra: counts \}\)/);
  // Exhausted rows are counted but never alert on their own.
  assert.match(watch, /if \(\(health\.stuckPending \?\? 0\) > 0 \|\| failed > 0\)/);
  // Counts only: nothing that could carry a recipient or payload.
  assert.doesNotMatch(watch, /payload|user_id|email:|\.select\('\*'\)/);
  assert.match(source, /const STUCK_MINUTES = 30;/);
});
