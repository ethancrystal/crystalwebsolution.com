import { NextResponse } from 'next/server';
import { validateContactForm } from '../../../lib/contactForm.mjs';

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
  if (!webhookUrl) {
    return json({
      ok: false,
      message: 'Online form delivery is not configured. Use the direct email option on this page.',
    }, 503);
  }

  // Integration boundary: the configured endpoint is the approved form processor;
  // this route validates and forwards normalized JSON without persisting or logging it.
  try {
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validation.data),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return json({
        ok: false,
        message: 'The form service did not accept your message. Try again later or use the direct email option.',
      }, 502);
    }
  } catch {
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
