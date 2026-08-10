// See app/login/layout.jsx — noindex rationale.
export const metadata = {
  title: 'Client Portal',
  description: 'Client sign-in for the Crystal Web Solution project workspace.',
  alternates: { canonical: '/login/client' },
  robots: { index: false, follow: false },
};

export default function ClientLoginLayout({ children }) {
  return children;
}
