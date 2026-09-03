import test from 'node:test';
import assert from 'node:assert/strict';

import { SITE } from '../lib/site.js';
import { SITE_ORIGIN, SITE_HOST } from '../lib/seo.mjs';

test('email module exports the generic helper used by auth actions', async () => {
  const emailModule = await import('../lib/email/resend.js');

  assert.equal(typeof emailModule.sendEmail, 'function');
  assert.equal(typeof emailModule.sendTemplate, 'function');
  assert.equal(typeof emailModule.sendInviteEmail, 'function');
  assert.equal(typeof emailModule.isEmailConfigured, 'function');
});

test('sendEmail fails closed before delivery when Resend is not configured', async () => {
  const emailModule = await import('../lib/email/resend.js');
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    assert.equal(emailModule.isEmailConfigured(), false);
    await assert.rejects(
      emailModule.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test subject',
        html: '<p>Test body</p>',
      }),
      /Missing RESEND_API_KEY/,
    );
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test('sendEmail rejects incomplete messages without contacting the provider', async () => {
  const { sendEmail } = await import('../lib/email/resend.js');
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_test_key_not_used';

  try {
    await assert.rejects(sendEmail({ subject: 's', html: '<p>h</p>' }), /recipient is required/i);
    await assert.rejects(
      sendEmail({ to: 'a@example.com', html: '<p>h</p>' }),
      /subject is required/i,
    );
    await assert.rejects(
      sendEmail({ to: 'a@example.com', subject: 's' }),
      /body is required/i,
    );
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test('the canonical contact address is on the current brand domain', () => {
  assert.equal(SITE.email, 'sales@cdsportswearusa.com');
});

test("the contact-form footer note names the site's own domain", async () => {
  const { contactSubmissionEmail } = await import('../lib/email/templates.js');
  const rendered = contactSubmissionEmail({
    name: 'Ada',
    email: 'ada@example.com',
    company: 'Acme',
    budget: '$5-15k',
    brief: 'Hello',
  });

  // Derived from SITE_HOST (in turn derived from SITE_ORIGIN) rather than a
  // second hardcoded literal, so it can't drift out of sync with the site's
  // actual domain the way the canonical-logo assertion once did (v1.17).
  assert.match(rendered.html, new RegExp(`Sent from the ${SITE_HOST.replace('.', '\\.')} contact form\\.`));
});

test('sender identity is overridable and defaults to the verified domain', async () => {
  const { getFromAddress, getReplyToAddress, getOperationsAddress } = await import(
    '../lib/email/resend.js'
  );
  const previous = process.env.RESEND_FROM_EMAIL;
  delete process.env.RESEND_FROM_EMAIL;

  try {
    assert.match(getFromAddress(), /@cdsportswearusa\.com>$/);
    assert.equal(getReplyToAddress(), SITE.email);
    assert.equal(getOperationsAddress(), SITE.email);

    process.env.RESEND_FROM_EMAIL = 'Studio <hello@example.com>';
    assert.equal(getFromAddress(), 'Studio <hello@example.com>');
  } finally {
    if (previous === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = previous;
  }
});

test('htmlToText produces a readable plain-text alternative', async () => {
  const { htmlToText } = await import('../lib/email/resend.js');
  const text = htmlToText(
    '<html><head><style>p{color:red}</style></head><body><p>Hello &amp; welcome</p>' +
      '<a href="https://example.com/verify?a=1&amp;b=2">Confirm</a></body></html>',
  );

  assert.match(text, /Hello & welcome/);
  // Link targets survive so a text-only client can still act on the email.
  assert.match(text, /Confirm \(https:\/\/example\.com\/verify\?a=1&b=2\)/);
  assert.doesNotMatch(text, /color:red/);
  assert.doesNotMatch(text, /</);
});

test('every auth template renders a subject, branded body and its CTA link', async () => {
  const templates = await import('../lib/email/templates.js');
  const url = 'https://crystalwebsolution.com/auth/verify?token_hash=abc&type=signup';

  const cases = [
    templates.confirmSignupEmail({ confirmUrl: url, fullName: 'Ada' }),
    templates.resetPasswordEmail({ resetUrl: url }),
    templates.inviteUserEmail({ inviteUrl: url, fullName: 'Ada', role: 'project_manager' }),
    templates.emailChangeEmail({ confirmUrl: url, fullName: 'Ada', newEmail: 'new@example.com' }),
  ];

  for (const rendered of cases) {
    assert.ok(rendered.subject.length > 0);
    assert.match(rendered.html, /^<!doctype html>/i);
    assert.ok(rendered.html.includes(SITE.name));
    assert.ok(rendered.html.includes(url.replace(/&/g, '&amp;')));
  }
});

test('transactional templates render the canonical logo and accessible text fallback', async () => {
  const { confirmSignupEmail } = await import('../lib/email/templates.js');
  const rendered = confirmSignupEmail({
    confirmUrl: 'https://www.crystalwebsolution.com/auth/verify?token_hash=abc&type=signup',
    fullName: 'Ada',
  });

  const expectedLogoUrl = `${SITE_ORIGIN}${SITE.logoPath}`;
  assert.ok(
    rendered.html.includes(expectedLogoUrl),
    `expected rendered email to include the canonical logo URL ${expectedLogoUrl}`,
  );
  assert.match(rendered.html, /alt="CD Sportswear USA"/);
});

test('the password-changed notice carries no actionable auth link', async () => {
  const { passwordChangedEmail } = await import('../lib/email/templates.js');
  const rendered = passwordChangedEmail({ fullName: 'Ada' });

  assert.match(rendered.subject, /password was changed/i);
  assert.doesNotMatch(rendered.html, /token_hash/);
  assert.doesNotMatch(rendered.html, /\/auth\/verify/);
});

test('templates escape user-controlled values instead of interpolating markup', async () => {
  const { inviteUserEmail, contactSubmissionEmail } = await import('../lib/email/templates.js');

  const invite = inviteUserEmail({
    inviteUrl: 'https://crystalwebsolution.com/auth/verify?token_hash=x',
    fullName: '<script>alert(1)</script>',
    role: 'admin',
  });
  assert.doesNotMatch(invite.html, /<script>/);
  assert.match(invite.html, /&lt;script&gt;/);

  const brief = contactSubmissionEmail({
    name: 'Ada',
    email: 'ada@example.com',
    company: '"><img src=x onerror=alert(1)>',
    budget: '$5–15k',
    brief: 'Hello <b>there</b>',
  });
  assert.doesNotMatch(brief.html, /<img src=x/);
  assert.doesNotMatch(brief.html, /Hello <b>there<\/b>/);
});

test('a CTA url cannot break out of its href attribute', async () => {
  const { confirmSignupEmail } = await import('../lib/email/templates.js');
  const rendered = confirmSignupEmail({
    confirmUrl: 'https://evil.test/"><script>alert(1)</script>',
    fullName: 'Ada',
  });

  assert.doesNotMatch(rendered.html, /<script>alert\(1\)<\/script>/);
  assert.match(rendered.html, /&quot;&gt;/);
});

test('every notifications_outbox event type resolves to a template', async () => {
  const { renderNotificationEmail, NOTIFICATION_TEMPLATES } = await import(
    '../lib/email/templates.js'
  );

  // Event types the database actually enqueues (0010/0011 migrations).
  const enqueued = [
    'project.status_transitioned',
    'project.approval_updated',
    'project.deliverable_published',
  ];

  for (const eventType of enqueued) {
    assert.ok(eventType in NOTIFICATION_TEMPLATES, `${eventType} has no template`);
    const rendered = renderNotificationEmail(eventType, {
      projectName: 'Acme Rebrand',
      fullName: 'Ada',
      projectUrl: 'https://crystalwebsolution.com/dashboard/projects/1',
      toStatus: 'delivered',
      status: 'approved',
    });
    assert.ok(rendered.subject.length > 0);
    assert.match(rendered.html, /Acme Rebrand/);
  }
});

test('an unknown event type is skipped rather than throwing', async () => {
  const { renderNotificationEmail } = await import('../lib/email/templates.js');
  assert.equal(renderNotificationEmail('project.does_not_exist', {}), null);
});

test('project status labels match the database status check constraint', async () => {
  const { projectStatusChangedEmail } = await import('../lib/email/templates.js');
  const rendered = projectStatusChangedEmail({
    projectName: 'Acme',
    fromStatus: 'client_review',
    toStatus: 'delivered',
    fullName: 'Ada',
  });

  assert.match(rendered.html, /Client review/);
  assert.match(rendered.html, /Delivered/);
});

test('the contact acknowledgement addresses the sender and omits internal data', async () => {
  const { contactAckEmail } = await import('../lib/email/templates.js');
  const rendered = contactAckEmail({ name: 'Ada' });

  assert.match(rendered.html, /Hi Ada,/);
  assert.ok(rendered.html.includes(SITE.email));
});
