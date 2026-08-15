// design-sync preview shim for 'next/navigation' — see next-link.jsx for why.
// Only useRouter (the only export this repo's components use) needs to be
// real; the rest are harmless no-op fallbacks for any future import.
export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  };
}

export function usePathname() {
  return typeof window !== 'undefined' ? window.location.pathname : '/';
}

export function useSearchParams() {
  return typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
}

export function useParams() {
  return {};
}
