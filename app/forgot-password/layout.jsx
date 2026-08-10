// See app/login/layout.jsx — noindex rationale.
export const metadata = {
  title: 'Reset Password',
  description: 'Request a password reset link for your Crystal Web Solution account.',
  alternates: { canonical: '/forgot-password' },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }) {
  return children;
}
