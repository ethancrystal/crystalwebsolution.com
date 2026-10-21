import { NextResponse } from 'next/server';
import { completeArtwork } from '@/lib/contactArtworkServer';
import { isUuid } from '@/lib/contactArtwork.mjs';
import { checkRateLimitStrict, getClientIp } from '@/lib/rateLimit.mjs';

export const runtime = 'nodejs';

const json = (body, status, headers) => NextResponse.json(body, { status, headers });

// Step 3 of the production-request artwork upload (migration 0053): the browser
// has PUT its files to the signed URLs /api/contact handed back and now asks
// the server to check and attach them.
//
// There is no captcha here on purpose: the hCaptcha token is single use and was
// spent on /api/contact, which is also what created the submission. The
// capability is the pair of random ids that only that response carried, and the
// call can only ever attach objects that were uploaded to the paths reserved
// under them, so it is idempotent and harmless to replay. It is rate-limited
// like the form.
export async function POST(request) {
  const clientIp = getClientIp(request.headers);
  const rate = await checkRateLimitStrict('contact-artwork', clientIp, {
    limit: 20,
    windowSeconds: 600,
  });

  if (rate.status === 'unavailable') {
    return json({ ok: false, retryable: true, message: 'Artwork upload is temporarily unavailable. Please email the files instead.' }, 503, { 'Retry-After': '120' });
  }
  if (rate.status === 'limited') {
    return json({ ok: false, message: 'Too many requests from this connection. Please wait a few minutes.' }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'The request could not be read.' }, 400);
  }

  if (!isUuid(body?.dealId) || !isUuid(body?.submissionId)) {
    return json({ ok: false, message: 'The upload reference is not valid.' }, 400);
  }

  try {
    const { attached, rejected } = await completeArtwork({
      dealId: body.dealId,
      submissionId: body.submissionId,
    });
    return json({ ok: true, attached, rejected }, 200);
  } catch (error) {
    console.error('Completing artwork failed:', error.message);
    return json({ ok: false, retryable: true, message: 'We could not finish checking your files. Please email them instead.' }, 503);
  }
}
