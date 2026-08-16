// Auth callback and reset surfaces inherit root indexable metadata without
// this segment layout. /auth/confirm and /auth/reset-password should be
// excluded from indexing — they are transient, thin pages behind auth flows.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }) {
  return children;
}

