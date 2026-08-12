// Lightweight liveness endpoint for the Docker HEALTHCHECK (and any
// upstream load balancer / orchestrator probes). Intentionally has no
// external dependencies (no Supabase call) so it reflects only "is the
// Next.js server process up and serving requests".
export async function GET() {
  return Response.json({ status: 'ok' }, { status: 200 });
}
