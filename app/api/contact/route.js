import { NextResponse } from 'next/server';
import { PRODUCTION_REQUEST_KIND, validateContactSubmission } from '../../../lib/contactForm.mjs';
import { sendTemplate, isEmailConfigured, getOperationsAddress } from '@/lib/email/resend';
import { contactSubmissionEmail, contactAckEmail } from '@/lib/email/templates';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitStrict, getClientIp } from '@/lib/rateLimit.mjs';
import { reserveArtworkSlots } from '@/lib/contactArtworkServer';
import { HCAPTCHA_TOKEN_FIELD, verifyHCaptchaToken } from '@/lib/hcaptcha.mjs';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

// Best-effort CRM write (create_lead_from_contact, migration 0026). Never
// throws -- a failure here must never change the visitor-facing outcome
// (webhookDelivered/emailDelivered) or block the response. Runs before the
// operations email so a successful call can include a "View in CRM" link;
// on any failure the email still sends exactly as it did before this existed.
// Returns { dealId, dealUrl }; both are undefined when the write did not happen.
async function createLeadBestEffort(data) {
  try {
    const supabase = createAdminClient();
    const { data: result, error } = await supabase.rpc('create_lead_from_contact', {
      p_name: data.name,
      p_email: data.email,
      p_company: data.company || null,
      p_brief: data.brief,
      p_budget: data.budget || null,
      p_source: data.kind === PRODUCTION_REQUEST_KIND ? 'website_production_request' : 'website_contact_form',
    });

    if (error) {
      console.error('create_lead_from_contact failed:', error.message);
      return {};
    }

    return {
      dealId: result?.deal_id,
      dealUrl: result?.deal_id && APP_URL ? `${APP_URL}/admin/deals/${result.deal_id}` : undefined,
    };
  } catch (error) {
    console.error('create_lead_from_contact unavailable:', error.message);
    return {};
  }
}

// The webhook is one of two delivery channels (email is the other), so a
// slow or hung endpoint must not hold the visitor's request open. After
// WEBHOOK_TIMEOUT_MS the request is aborted and counted as not delivered,
// and the route moves straight on to the CRM write and the emails. 5 s by
// default; CONTACT_WEBHOOK_TIMEOUT_MS may set 500 to 10000 ms.
const DEFAULT_WEBHOOK_TIMEOUT_MS = 5000;

function webhookTimeoutMs() {
  const configured = Number.parseInt(process.env.CONTACT_WEBHOOK_TIMEOUT_MS ?? '', 10);
  return Number.isInteger(configured) && configured >= 500 && configured <= 10000
    ? configured
    : DEFAULT_WEBHOOK_TIMEOUT_MS;
}

// Integration boundary: the configured endpoint is the approved form
// processor; this forwards normalized JSON without persisting or logging it.
// Never throws: any failure, abort or timeout is simply "not delivered". The
// timer races the fetch as well as aborting it, so even a fetch that ignores
// the abort signal cannot keep the route waiting.
async function deliverToWebhook(webhookUrl, data) {
  const controller = new AbortController();
  let timer;
  const timedOut = new Promise((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(false);
    }, webhookTimeoutMs());
  });

  const delivered = (async () => {
    try {
      const upstream = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        cache: 'no-store',
        signal: controller.signal,
      });
      return upstream.ok;
    } catch {
      return false;
    }
  })();

  try {
    return await Promise.race([delivered, timedOut]);
  } finally {
    clearTimeout(timer);
  }
}

export const runtime = 'nodejs';

const json = (body, status, headers) => NextResponse.json(body, { status, headers });

// Protection we could not run (no captcha secret or rate limiter in
// production, hCaptcha or Upstash unreachable). Fail closed: nothing is
// forwarded, stored or emailed, and the visitor is told to retry shortly.
const RETRY_AFTER_SECONDS = 120;
const temporarilyUnavailable = () => json({
  ok: false,
  retryable: true,
  message: 'The form is temporarily unavailable. Please try again in a few minutes, or use the direct email option on this page.',
}, 503, { 'Retry-After': String(RETRY_AFTER_SECONDS) });

export async function POST(request) {
  // Keyed by the trusted client IP (lib/rateLimit.mjs getClientIp), checked
  // before any parsing/validation so a scripted flood can't burn CPU on this
  // route either. Fails closed in production: see checkRateLimitStrict and
  // docs/adr/ADR-002-contact-form-rate-limiting.md.
  const clientIp = getClientIp(request.headers);
  const rate = await checkRateLimitStrict('contact', clientIp, {
    limit: 5,
    windowSeconds: 600,
  });

  if (rate.status === 'unavailable') {
    return temporarilyUnavailable();
  }

  if (rate.status === 'limited') {
    return json({
      ok: false,
      message: 'Too many submissions from this connection. Please wait a few minutes and try again.',
    }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({
      ok: false,
      message: 'The form request could not be read. Reload the page and submit it again.',
    }, 400);
  }

  const validation = validateContactSubmission(body);

  if (validation.rejectedAsSpam) {
    return json({
      ok: false,
      message: 'The submission could not be accepted. Clear the extra field and submit again.',
    }, 400);
  }

  if (!validation.valid) {
    return json({
      ok: false,
      message: 'Some details could not be validated. Review the marked fields and submit again.',
      errors: validation.errors,
    }, 400);
  }

  // hCaptcha (lib/hcaptcha.mjs): required in production. Runs after the cheap
  // checks above and before anything with a cost: the webhook, the CRM
  // write, and the two emails. A rejected token is the visitor's to fix
  // (400); an unavailable check is ours (503, retry later).
  const captcha = await verifyHCaptchaToken(body?.[HCAPTCHA_TOKEN_FIELD], {
    remoteIp: clientIp ?? undefined,
  });
  if (captcha.status === 'unavailable') {
    return temporarilyUnavailable();
  }
  if (captcha.status !== 'passed') {
    return json({
      ok: false,
      message: 'Please complete the security check and submit again.',
      errors: { hcaptcha: 'Please complete the security check.' },
    }, 400);
  }

  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
  const emailEnabled = isEmailConfigured();

  // Two independent delivery channels. The submission counts as delivered if
  // either one succeeds, so a webhook outage no longer loses the brief while
  // email is configured (and vice versa).
  if (!webhookUrl && !emailEnabled) {
    return json({
      ok: false,
      message: 'Please use the direct email option on this page.',
    }, 503);
  }

  const webhookDelivered = webhookUrl ? await deliverToWebhook(webhookUrl, validation.data) : false;

  // Honeypot-rejected submissions never reach this point (returned above),
  // so the CRM is never written from spam.
  const lead = await createLeadBestEffort(validation.data);
  const dealUrl = lead.dealUrl;

  let emailDelivered = false;

  if (emailEnabled) {
    try {
      // Reply-To is the visitor, so replying from the inbox threads straight
      // back to them rather than to the no-reply sender.
      await sendTemplate(contactSubmissionEmail({ ...validation.data, dealUrl }), {
        to: getOperationsAddress(),
        replyTo: validation.data.email,
        tags: ['contact-form'],
      });
      emailDelivered = true;
    } catch (error) {
      console.error('Contact notification email failed:', error.message);
    }

    // Acknowledgement to the sender is a courtesy: never let its failure
    // change the outcome the visitor sees.
    if (emailDelivered) {
      try {
        await sendTemplate(contactAckEmail({
          name: validation.data.name,
          kind: validation.data.kind,
          artworkLink: validation.data.artworkLink,
          files: validation.data.files,
        }), {
          to: validation.data.email,
          tags: ['contact-ack'],
        });
      } catch (error) {
        console.error('Contact acknowledgement email failed:', error.message);
      }
    }
  }

  if (!webhookDelivered && !emailDelivered) {
    return json({
      ok: false,
      message: 'The form service could not be reached. Try again later or use the direct email option.',
    }, 502);
  }

  // Artwork files, if any: the lead above is stored, so reserve upload slots
  // now. This only happens after every guard has passed (rate limit, honeypot,
  // validation, hCaptcha). Best-effort: on any failure the visitor is told to
  // email the files, and the request itself is still delivered.
  const artwork = validation.data.files?.length
    ? await reserveArtworkSlots({ dealId: lead.dealId, files: validation.data.files })
    : undefined;

  return json({
    ok: true,
    ...(artwork ? { artwork } : {}),
    message: validation.data.kind === PRODUCTION_REQUEST_KIND
      ? 'Your production request was sent. A specialist will review your artwork and reply with a mockup.'
      : 'Your project brief was sent. We’ll review it and reply by email.',
  }, 202);
}
