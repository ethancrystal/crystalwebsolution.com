import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNotificationEmail, NOTIFICATION_TEMPLATES } from '../../lib/email/templates.js';

// Task 7 (corrected): the plan originally specified a literal
// `emailTemplates = { 'project.delivered': { subject, template } }` object,
// but lib/email/templates.js actually dispatches via the NOTIFICATION_TEMPLATES
// factory map (event_type -> factory returning { subject, html }) consumed by
// renderNotificationEmail(). A literal block would be dead code the outbox
// drain never calls, so we assert the real integration instead.

test('project.delivered is registered in NOTIFICATION_TEMPLATES', () => {
  assert.ok(
    NOTIFICATION_TEMPLATES['project.delivered'],
    'project.delivered must be registered so the outbox drain can render it',
  );
});

test('project.delivered renders a subject + html linking to the project', () => {
  const result = renderNotificationEmail('project.delivered', {
    projectName: 'Acme Rebrand',
    projectUrl: 'https://app.example.com/dashboard/projects/abc-123',
    fullName: 'Jane Client',
  });

  assert.ok(result, 'renderNotificationEmail must return a template, not null');
  assert.match(result.subject, /Acme Rebrand/);
  assert.match(result.html, /Acme Rebrand/);
  assert.match(result.html, /delivered/i);
  // The CTA must point at the real project URL (no /client/portal route exists).
  assert.match(result.html, /https:\/\/app\.example\.com\/dashboard\/projects\/abc-123/);
});

test('unknown event types still render to null (no crash)', () => {
  assert.strictEqual(renderNotificationEmail('project.nonexistent', {}), null);
});
