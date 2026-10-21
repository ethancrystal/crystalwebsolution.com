import { requireRole } from '@/lib/auth/require-role';

// requireRole reads cookies per request, so this segment can never be a
// static shell. Opting out here keeps `next build` from prerendering the
// layout, which would otherwise throw while Supabase env vars are absent
// or placeholder (CI builds with placeholders; production config lives on
// Vercel) — the same reason app/onboarding/page.jsx exports force-dynamic.
export const dynamic = 'force-dynamic';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }) {
  await requireRole(['client'], '/login/client');
  return children;
}
