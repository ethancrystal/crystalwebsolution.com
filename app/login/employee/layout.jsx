// See app/login/layout.jsx — noindex rationale.
export const metadata = {
  title: 'Employee Portal',
  description: 'Employee sign-in for the Crystal Web Solution workspace.',
  alternates: { canonical: '/login/employee' },
  robots: { index: false, follow: false },
};

export default function EmployeeLoginLayout({ children }) {
  return children;
}
