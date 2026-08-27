import { requireRole } from '@/lib/auth/require-role';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }) {
  await requireRole(['admin'], '/login/admin');
  return children;
}
