import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';

export async function GET(request) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get('trigger') !== 'sentry-preview') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const error = new Error('CWS Sentry preview verification');
  Sentry.captureException(error, {
    tags: {
      surface: 'sentry-verification',
      verification: 'preview-only',
    },
  });
  await Sentry.flush(2000);

  return Response.json(
    { ok: false, message: 'Sentry preview verification event sent.' },
    { status: 500 },
  );
}
