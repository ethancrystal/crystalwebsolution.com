import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const createAdminClient = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
};

// generateLink()'s own action_link points at Supabase's /auth/v1/verify and
// only works for browser-driven (PKCE) sessions - a server-issued
// generateLink() has no code_verifier to pair with, so GoTrue falls back to
// implicit-style tokens in a URL fragment that never reaches our server.
// Route through our own /auth/verify instead, which exchanges token_hash
// via verifyOtp() using the cookie-writing @supabase/ssr client.
export const buildVerifyUrl = ({ properties, next }) => {
  const params = new URLSearchParams({
    token_hash: properties.hashed_token,
    type: properties.verification_type,
    next,
  });
  return `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?${params.toString()}`;
};
