import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PRODUCER_MIGRATIONS = [
  'supabase/migrations/0013_project_notes_and_deliverables.sql',
  'supabase/migrations/0015_project_notifications_and_message_editing.sql',
  'supabase/migrations/0020_project_delivered_notification.sql',
  'supabase/migrations/0023_visibility_aware_notification_recipients.sql',
  'supabase/migrations/0026_create_lead_from_contact.sql',
  'supabase/migrations/0032_project_asset_lifecycle_hardening.sql',
];

const EMAIL_EVENTS = [
  'project.status_transitioned',
  'project.approval_updated',
  'project.approval_requested',
  'project.deliverable_published',
  'project.task_created',
  'project.task_updated',
  'project.message_posted',
  'project.message_edited',
  'project.user_assigned',
  'project.delivered',
  'lead.created',
];

const IN_APP_ONLY_EVENTS = ['project.note_posted', 'project.deliverable_created'];

const CONTEXT = {
  fullName: 'Ada Lovelace',
  projectName: 'CWS Preview Project',
  projectUrl: 'https://www.crystalwebsolution.com/dashboard/projects/00000000-0000-0000-0000-000000000001',
  reviewsUrl: 'https://www.crystalwebsolution.com/reviews',
  fromStatus: 'in_progress',
  toStatus: 'client_review',
  status: 'approved',
  note: 'Please review this update.',
  deliverableName: 'Homepage concept',
  version: '1',
  taskTitle: 'Review homepage concept',
  dueDate: '2026-08-20',
  priority: 'high',
  authorName: 'CWS Team',
  excerpt: 'A short project update.',
  role: 'client',
  leadName: 'Ada Lovelace',
  leadCompany: 'Analytical Engines',
  leadEmail: 'ada@example.test',
  dealUrl: 'https://www.crystalwebsolution.com/admin/deals/00000000-0000-0000-0000-000000000002',
};

test('every email-capable producer event has a renderable notification template', async () => {
  const { renderNotificationEmail, NOTIFICATION_TEMPLATES } = await import('../../lib/email/templates.js');

  for (const eventType of EMAIL_EVENTS) {
    assert.ok(eventType in NOTIFICATION_TEMPLATES, `${eventType} has no registered template`);
    const rendered = renderNotificationEmail(eventType, CONTEXT);
    assert.ok(rendered, `${eventType} did not render`);
    assert.ok(rendered.subject.length > 0, `${eventType} has no subject`);
    assert.match(rendered.html, /CWS Preview Project|New lead/);
    assert.doesNotMatch(rendered.html, /undefined|null/);
  }
});

test('notification email CTAs stay on the allowlisted CD Sportswear USA origin', async () => {
  const { renderNotificationEmail } = await import('../../lib/email/templates.js');

  for (const eventType of EMAIL_EVENTS) {
    const rendered = renderNotificationEmail(eventType, CONTEXT);
    const hrefs = [...rendered.html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    for (const href of hrefs) {
      assert.ok(
        href.startsWith('https://www.crystalwebsolution.com/') || href.startsWith('mailto:'),
        `${eventType} produced an unallowlisted href: ${href}`,
      );
    }
  }
});

test('in-app-only producer events are declared and cannot enter the email registry', async () => {
  const { NOTIFICATION_TEMPLATES } = await import('../../lib/email/templates.js');
  const source = (await Promise.all(PRODUCER_MIGRATIONS.map((path) => readFile(path, 'utf8')))).join('\n');

  for (const eventType of IN_APP_ONLY_EVENTS) {
    assert.match(source, new RegExp(`['"]${eventType.replace('.', '\\.') }['"]`));
    assert.equal(eventType in NOTIFICATION_TEMPLATES, false, `${eventType} must remain in-app-only`);
  }
});
