import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { notificationText } from '../../lib/crm/notification-copy.mjs';
import { NOTIFICATION_TEMPLATES, renderNotificationEmail } from '../../lib/email/templates.js';

const CONTEXT = {
  projectName: 'Logo job',
  proposalTitle: 'Logo <proposal> & terms',
  projectCategory: 'logo_creation',
  projectUrl: 'https://app.example.com/dashboard/projects/abc',
  fullName: 'Casey Client',
};

test('the in-app line names the proposal, and falls back without one', () => {
  assert.match(notificationText('project.proposal_posted', { proposal_title: 'Website proposal' }), /^New proposal ready: Website proposal\./);
  assert.match(notificationText('project.proposal_updated', { proposal_title: 'Website proposal' }), /^Proposal updated: Website proposal\./);
  assert.equal(notificationText('project.proposal_posted', {}), 'A new proposal is ready for you.');
  assert.equal(notificationText('project.proposal_updated', null), 'A proposal was updated.');
});

test('both proposal events have an email template, so the outbox drain can send them', () => {
  assert.ok(NOTIFICATION_TEMPLATES['project.proposal_posted']);
  assert.ok(NOTIFICATION_TEMPLATES['project.proposal_updated']);
});

test('the posted email names the project, proposal and type, and opens the Proposals tab', () => {
  const email = renderNotificationEmail('project.proposal_posted', CONTEXT);
  assert.match(email.subject, /^New proposal ready — Logo job$/);
  assert.match(email.html, /Your proposal is ready/);
  assert.match(email.html, /Logo Creation/);
  assert.match(email.html, /https:\/\/app\.example\.com\/dashboard\/projects\/abc\?tab=proposals/);
  // Client-supplied text is escaped.
  assert.match(email.html, /Logo &lt;proposal&gt; &amp; terms/);
  assert.doesNotMatch(email.html, /<proposal>/);
});

test('the updated email says the document was replaced and keeps an existing query string', () => {
  const email = renderNotificationEmail('project.proposal_updated', { ...CONTEXT, projectUrl: 'https://app.example.com/p?x=1' });
  assert.match(email.subject, /^Proposal updated — Logo job$/);
  assert.match(email.html, /replaced with a newer version/);
  assert.match(email.html, /x=1&(amp;)?tab=proposals/);
});

test('an email with no link still renders, with no button', () => {
  const email = renderNotificationEmail('project.proposal_posted', { ...CONTEXT, projectUrl: undefined });
  assert.ok(email.html.length > 0);
  assert.doesNotMatch(email.html, /tab=proposals/);
});

test('the cron route hands the payload\'s title and category to the templates', async () => {
  const route = await readFile('app/api/cron/crm-notifications/route.js', 'utf8');
  assert.match(route, /proposalTitle: payload\.proposal_title,/);
  assert.match(route, /projectCategory: payload\.project_category,/);
});
