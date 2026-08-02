import test from 'node:test';
import assert from 'node:assert/strict';

test('email module exports the generic helper used by auth actions', async () => {
  const emailModule = await import('../lib/email/resend.js');

  assert.equal(typeof emailModule.sendEmail, 'function');
  assert.equal(typeof emailModule.sendInviteEmail, 'function');
});

test('sendEmail fails closed before delivery when Resend is not configured', async () => {
  const emailModule = await import('../lib/email/resend.js');
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
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
