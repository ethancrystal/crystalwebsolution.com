// See app/login/layout.jsx — noindex rationale. Signup is a thin (30-word)
// form page that inherited the homepage title/description verbatim.
export const metadata = {
  title: 'Create your account',
  description: 'Create a Crystal Web Solution client or employee account.',
  alternates: { canonical: '/signup' },
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }) {
  return children;
}
