export const runtime = 'nodejs';

export async function POST(request) {
  const secret = request.headers.get('x-cron-secret');

  if (!secret || secret !== process.env.CRM_CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  return new Response(JSON.stringify({ ok: true, queued: 0 }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
