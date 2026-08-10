import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNotificationEmail, NOTIFICATION_TEMPLATES } from '../../lib/email/templates.js';

// Task 8 (corrected): the plan specified a literal `emailTemplates` object
// that does not exist in lib/email/templates.js. The file dispatches via the
// NOTIFICATION_TEMPLATES factory map consumed by renderNotificationEmail(),
// and update_project_message (0015) already emits 'project.message_edited'
// outbox rows — without a registered template those rows fail to render.

test('project.message_edited is registered in NOTIFICATION_TEMPLATES', () => {
  assert.ok(
    NOTIFICATION_TEMPLATES['project.message_edited'],
    'project.message_edited must be registered so the outbox drain can render it',
  );
});

test('project.message_edited renders subject + html with author and excerpt', () => {
  const result = renderNotificationEmail('project.message_edited', {
    projectName: 'Acme Rebrand',
    authorName: 'Jane Client',
    excerpt: 'Updated the copy to match the new brand voice.',
    projectUrl: 'https://app.example.com/dashboard/projects/abc-123',
    fullName: 'Sam PM',
  });

  assert.ok(result, 'renderNotificationEmail must return a template, not null');
  assert.match(result.subject, /Acme Rebrand/);
  assert.match(result.html, /edited/i);
  assert.match(result.html, /Jane Client/);
  assert.match(result.html, /Updated the copy/);
  // The CTA must point at the real project URL (no /client/ portal route exists).
  assert.match(result.html, /https:\/\/app\.example\.com\/dashboard\/projects\/abc-123/);
});

test('unknown event types still render to null (no crash)', () => {
  assert.strictEqual(renderNotificationEmail('project.nonexistent', {}), null);
});
