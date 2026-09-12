// See app/login/layout.jsx. The noindex was removed here on 2026-09-12 at the
// site owner's request, together with the Disallow in app/robots.js.
//
// Caveat on record: signup is a thin (30-word) form page that originally
// inherited the homepage title/description verbatim.
export const metadata = {
  title: 'Create your account',
  description: 'Create a CD Sportswear INC client or employee account.',
  alternates: { canonical: '/signup' },
};

export default function SignupLayout({ children }) {
  return children;
}
