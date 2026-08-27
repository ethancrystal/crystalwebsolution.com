import { requireRole } from '@/lib/auth/require-role';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function TeamLayout({ children }) {
  await requireRole(['project_manager'], '/login/employee');
  return children;
}
