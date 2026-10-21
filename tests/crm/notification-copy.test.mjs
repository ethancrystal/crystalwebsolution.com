import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MANAGER_INTRO_LINES,
  managerAssignedNote,
  managerIntroLine,
  notificationText,
} from '../../lib/crm/notification-copy.mjs';
import { renderNotificationEmail } from '../../lib/email/templates.js';

const PROJECT = '257b36c5-e3b7-4ec1-8823-43fb80fb6f02';

test('every intro line names the manager and uses no gendered pronouns', () => {
  for (const line of MANAGER_INTRO_LINES) {
    const text = line('AJ');
    assert.match(text, /\bAJ\b/);
    assert.doesNotMatch(text, /\b(he|him|his|she|her|hers)\b/i, text);
    assert.doesNotMatch(text, /@/);
  }
});

test('the same project always gets the same line; the line set is actually used', () => {
  assert.equal(managerIntroLine('AJ', PROJECT), managerIntroLine('AJ', PROJECT));

  const seen = new Set();
  for (let i = 0; i < 200; i += 1) seen.add(managerIntroLine('AJ', `project-${i}`));
  assert.equal(seen.size, MANAGER_INTRO_LINES.length);
});

test('a missing name falls back to a friendly generic line', () => {
  for (const name of [undefined, null, '', '   ']) {
    const line = managerIntroLine(name, PROJECT);
    assert.match(line, /^Your project manager will reach out shortly/);
    assert.doesNotMatch(line, /undefined|null/);
  }
  assert.match(managerAssignedNote('', PROJECT), /^A project manager has been assigned to your project\./);
});

test('the status note and the client email tell the same story for the same project', () => {
  const note = managerAssignedNote('  Ethan   Ray ', PROJECT);
  assert.ok(note.startsWith('Ethan Ray is your project manager. '));
  assert.ok(note.endsWith(managerIntroLine('Ethan Ray', PROJECT)));
  assert.ok(note.length < 2000, 'transition_project_status caps notes at 2000 characters');

  const email = renderNotificationEmail('project.status_transitioned', {
    recipientRole: 'client',
    fromStatus: 'brief_submitted',
    toStatus: 'planned',
    projectName: 'Website — Acme',
    leadManagerName: 'Ethan Ray',
    projectId: PROJECT,
    projectUrl: 'https://app.example.test/dashboard/projects/1',
  });
  const line = managerIntroLine('Ethan Ray', PROJECT).replace(/'/g, '&#39;');
  assert.ok(email.html.includes(line), 'the email carries the same playful line');
});

test('in-app notifications read like sentences, not event codes', () => {
  assert.equal(
    notificationText('project.status_transitioned', { from_status: 'brief_submitted', to_status: 'planned' }),
    'Your project is planned. Your project manager will say hello soon.',
  );
  assert.equal(notificationText('project.message_posted', { author_name: 'AJ' }), 'AJ sent a new message.');
  assert.equal(notificationText('project.message_posted', {}), 'New message on your project.');
  assert.match(notificationText('project.deliverable_published', { deliverable_name: 'Homepage v1' }), /^New deliverable ready: Homepage v1\./);
  assert.equal(notificationText('project.brief_submitted', { brief_type: 'website' }), 'New Website brief submitted.');
  // Bad news stays plain.
  assert.equal(notificationText('project.status_transitioned', { to_status: 'cancelled' }), 'This project was cancelled.');
  // Unknown events and missing payloads never crash or print undefined.
  assert.equal(notificationText('project.something_new', null), 'Project Something New');
  assert.equal(notificationText(undefined, undefined), 'Notification');
  assert.equal(notificationText('project.status_transitioned', null), 'Your project status changed.');
});
