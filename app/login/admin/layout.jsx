// See app/login/layout.jsx — noindex rationale. Declared per-segment so each
// portal gets a distinct title instead of inheriting the duplicate homepage one.
export const metadata = {
  title: 'Admin Portal',
  description: 'Administrator sign-in for the Crystal Web Solution workspace.',
  alternates: { canonical: '/login/admin' },
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({ children }) {
  return children;
}
