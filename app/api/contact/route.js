import { NextResponse } from 'next/server';
import { validateContactForm } from '../../../lib/contactForm.mjs';
import { sendTemplate, isEmailConfigured, getOperationsAddress } from '@/lib/email/resend';
import { contactSubmissionEmail, contactAckEmail } from '@/lib/email/templates';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit.mjs';
import { HCAPTCHA_TOKEN_FIELD, verifyHCaptchaToken } from '@/lib/hcaptcha.mjs';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

// Best-effort CRM write (create_lead_from_contact, migration 0026). Never
// throws -- a failure here must never change the visitor-facing outcome
// (webhookDelivered/emailDelivered) or block the response. Runs before the
// operations email so a successful call can include a "View in CRM" link;
// on any failure the email still sends exactly as it did before this existed.
async function createLeadBestEffort(data) {
  try {
    const supabase = createAdminClient();
    const { data: result, error } = await supabase.rpc('create_lead_from_contact', {
      p_name: data.name,
      p_email: data.email,
      p_company: data.company || null,
      p_brief: data.brief,
      p_budget: data.budget,
      p_source: 'website_contact_form',
    });

    if (error) {
      console.error('create_lead_from_contact failed:', error.message);
      return undefined;
    }

    return result?.deal_id && APP_URL ? `${APP_URL}/admin/deals/${result.deal_id}` : undefined;
  } catch (error) {
    console.error('create_lead_from_contact unavailable:', error.message);
    return undefined;
  }
}

export const runtime = 'nodejs';

const json = (body, status) => NextResponse.json(body, { status });

export async function POST(request) {
  // Keyed by IP, checked before any parsing/validation so a scripted flood
  // can't burn CPU on this route either, not just the outbound sends below.
  // See docs/adr/ADR-002-contact-form-rate-limiting.md for the "why Upstash" reasoning.
  const allowed = await checkRateLimit('contact', getClientIp(request.headers), {
    limit: 5,
    windowSeconds: 600,
  });

  if (!allowed) {
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

  const validation = validateContactForm(body);

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

  // hCaptcha, enforced only when HCAPTCHA_SECRET is configured (lib/hcaptcha.mjs).
  // Runs after the cheap checks above and before anything with a cost: the
  // webhook, the CRM write, and the two emails.
  const captcha = await verifyHCaptchaToken(body?.[HCAPTCHA_TOKEN_FIELD], {
    remoteIp: getClientIp(request.headers),
  });
  if (!captcha.ok) {
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

  let webhookDelivered = false;

  if (webhookUrl) {
    // Integration boundary: the configured endpoint is the approved form processor;
    // this route validates and forwards normalized JSON without persisting or logging it.
    try {
      const upstream = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
        cache: 'no-store',
      });
      webhookDelivered = upstream.ok;
    } catch {
      webhookDelivered = false;
    }
  }

  // Honeypot-rejected submissions never reach this point (returned above),
  // so the CRM is never written from spam.
  const dealUrl = await createLeadBestEffort(validation.data);

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
        await sendTemplate(contactAckEmail({ name: validation.data.name }), {
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

  return json({
    ok: true,
    message: 'Your project brief was sent. We’ll review it and reply by email.',
  }, 202);
}
