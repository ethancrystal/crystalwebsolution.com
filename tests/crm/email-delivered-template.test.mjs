import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNotificationEmail, NOTIFICATION_TEMPLATES } from '../../lib/email/templates.js';

test('project.delivered is registered in NOTIFICATION_TEMPLATES', () => {
  assert.ok(
    NOTIFICATION_TEMPLATES['project.delivered'],
    'project.delivered must be registered so the outbox drain can render it',
  );
});

test('project.delivered renders a subject + html linking to /reviews, not the project workspace', () => {
  const result = renderNotificationEmail('project.delivered', {
    projectName: 'Acme Rebrand',
    reviewsUrl: 'https://app.example.com/reviews',
    fullName: 'Jane Client',
  });

  assert.ok(result, 'renderNotificationEmail must return a template, not null');
  assert.match(result.subject, /Acme Rebrand/);
  assert.match(result.html, /Acme Rebrand/);
  assert.match(result.html, /delivered/i);
  // The CTA must point at /reviews, not a project workspace URL.
  assert.match(result.html, /https:\/\/app\.example\.com\/reviews/);
});

test('unknown event types still render to null (no crash)', () => {
  assert.strictEqual(renderNotificationEmail('project.nonexistent', {}), null);
});

test('templateContextFor in the cron route supplies reviewsUrl built from APP_URL, the same way projectUrlFor does', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('app/api/cron/crm-notifications/route.js', 'utf8');
  assert.match(source, /reviewsUrl:\s*APP_URL \? `\$\{APP_URL\}\/reviews` : undefined/);
});
