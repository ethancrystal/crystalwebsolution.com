import { createBrowserClient } from '@supabase/ssr';

// Both values are NEXT_PUBLIC_* and therefore inlined at build time. When one
// is missing the browser client would otherwise be constructed with undefined
// credentials and fail later as an opaque network/auth error at the first
// query -- surface the real cause at construction instead. Mirrors the
// explicit key check in lib/supabase/admin.js.
export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase browser client is not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must both be set.',
    );
  }

  return createBrowserClient(url, anonKey);
};
