import { Resend } from 'resend';

// Relative rather than '@/lib/site' so this module also resolves under bare
// `node --test` (tests/email.test.mjs), which has no Next path-alias resolver.
import { SITE } from '../site.js';

// Single Resend boundary for the whole app. Every transactional email -
// auth flow (signup confirm, resend confirm, password reset, staff invite),
// CRM notifications_outbox delivery, and contact-form alerts - goes through
// sendEmail() so there is exactly one place that owns the API key, the
// sender identity, retry classification, and error redaction.
//
// Why the app sends its own mail instead of letting Supabase Auth do it:
// GoTrue's built-in templates are unbranded and its links point at
// /auth/v1/verify, which only works for browser-driven PKCE sessions. The
// auth actions call auth.admin.generateLink() and mail the resulting
// token_hash through our own /auth/verify route instead. See
// lib/supabase/admin.js buildVerifyUrl().

const DEFAULT_FROM = `${SITE.name} <no-reply@cdsportswearusa.com>`;

// Resend rejects sends whose from-domain is not verified, so the sender is
// configurable per environment while keeping a sane default.
export function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

export function getReplyToAddress() {
  return process.env.RESEND_REPLY_TO?.trim() || SITE.email;
}

// Where operational mail (contact briefs, delivery failures) is routed.
export function getOperationsAddress() {
  return process.env.CONTACT_NOTIFICATION_EMAIL?.trim() || SITE.email;
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

let cachedClient = null;
let cachedKey = null;

function getResendClient() {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    throw new EmailError('Missing RESEND_API_KEY.', { retryable: false });
  }

  // Cache per key so tests that swap the env var are not served a stale
  // client, while normal runtime reuses one instance.
  if (!cachedClient || cachedKey !== key) {
    cachedClient = new Resend(key);
    cachedKey = key;
  }

  return cachedClient;
}

export class EmailError extends Error {
  constructor(message, { retryable = false, statusCode = null, cause = null } = {}) {
    super(message);
    this.name = 'EmailError';
    this.retryable = retryable;
    this.statusCode = statusCode;
    if (cause) this.cause = cause;
  }
}

// 429 and 5xx are worth another attempt; 4xx (bad address, unverified
// domain, malformed payload) will fail identically forever, so the outbox
// drain must not burn its attempt budget on them.
function isRetryableStatus(statusCode) {
  if (!statusCode) return true;
  if (statusCode === 429) return true;
  return statusCode >= 500;
}

// Plain-text alternative so the message is not spam-scored as HTML-only and
// stays readable in text-first clients.
export function htmlToText(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&middot;/g, '·')
    .replace(/&mdash;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // &amp; last so "&amp;lt;" does not become "<".
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    // Trim each line before collapsing, otherwise whitespace-only lines from
    // the HTML layout's indentation survive as blank runs.
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Send one transactional email.
 *
 * @param {object} options
 * @param {string|string[]} options.to      Recipient(s).
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} [options.text]           Defaults to a derived plain-text part.
 * @param {string} [options.replyTo]
 * @param {string[]} [options.tags]         Resend tag names for filtering in the dashboard.
 * @param {string} [options.idempotencyKey] Prevents duplicate delivery on retry.
 * @returns {Promise<{id: string}>}
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  tags,
  idempotencyKey,
} = {}) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);

  if (recipients.length === 0) {
    throw new EmailError('Email recipient is required.', { retryable: false });
  }
  if (!subject) {
    throw new EmailError('Email subject is required.', { retryable: false });
  }
  if (!html) {
    throw new EmailError('Email body is required.', { retryable: false });
  }

  const resend = getResendClient();

  const payload = {
    from: getFromAddress(),
    to: recipients,
    subject,
    html,
    text: text || htmlToText(html),
    replyTo: replyTo || getReplyToAddress(),
  };

  if (tags?.length) {
    // Resend only accepts ASCII alphanumerics, underscores and dashes.
    payload.tags = tags
      .filter(Boolean)
      .map((name) => ({ name: 'category', value: String(name).replace(/[^A-Za-z0-9_-]/g, '_') }));
  }

  let result;
  try {
    result = await resend.emails.send(
      payload,
      idempotencyKey ? { idempotencyKey } : undefined,
    );
  } catch (cause) {
    // Network/DNS/timeout - no response was ever produced, so it is worth retrying.
    throw new EmailError(`Email delivery failed: ${cause?.message ?? 'network error'}`, {
      retryable: true,
      cause,
    });
  }

  const { data, error } = result ?? {};

  if (error) {
    throw new EmailError(error.message || 'Email provider rejected the message.', {
      retryable: isRetryableStatus(error.statusCode),
      statusCode: error.statusCode ?? null,
    });
  }

  return data;
}

/**
 * Convenience wrapper: render a template module's output and send it.
 * Templates return `{ subject, html }`; see lib/email/templates.js.
 */
export async function sendTemplate(template, { to, tags, idempotencyKey, replyTo } = {}) {
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo,
    tags,
    idempotencyKey,
  });
}

/**
 * Staff/client invite. Kept as a named helper because
 * scripts/provision-crm-test-users.mjs calls it directly, but it now renders
 * the same branded template the admin invite action uses instead of carrying
 * its own duplicate inline HTML.
 */
export async function sendInviteEmail({ to, fullName, role, inviteUrl }) {
  const { inviteUserEmail } = await import('./templates.js');

  return sendTemplate(inviteUserEmail({ inviteUrl, fullName, role }), {
    to,
    tags: ['invite'],
  });
}
