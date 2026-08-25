// See app/login/layout.jsx — noindex rationale.
export const metadata = {
  title: 'Client Portal',
  description: 'Client sign-in for the CD Sportswear USA project workspace.',
  alternates: { canonical: '/login/client' },
  robots: { index: false, follow: false },
};

export default function ClientLoginLayout({ children }) {
  return children;
}
