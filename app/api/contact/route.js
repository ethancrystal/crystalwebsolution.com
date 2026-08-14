import { NextResponse } from 'next/server';
import { validateContactForm } from '../../../lib/contactForm.mjs';
import { sendTemplate, isEmailConfigured, getOperationsAddress } from '@/lib/email/resend';
import { contactSubmissionEmail, contactAckEmail } from '@/lib/email/templates';

export const runtime = 'nodejs';

const json = (body, status) => NextResponse.json(body, { status });

export async function POST(request) {
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

  let emailDelivered = false;

  if (emailEnabled) {
    try {
      // Reply-To is the visitor, so replying from the inbox threads straight
      // back to them rather than to the no-reply sender.
      await sendTemplate(contactSubmissionEmail(validation.data), {
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
