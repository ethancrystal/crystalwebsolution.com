import { requireRole } from '@/lib/auth/require-role';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }) {
  await requireRole(['client'], '/login/client');
  return children;
}
