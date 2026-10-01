import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getAppUrl } from '../appUrl.mjs';

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
//
// The origin comes from getAppUrl() (lib/appUrl.mjs), which throws rather than
// return an unset or retired host: this URL carries a one-time sign-in token.
// Callers resolve getAppUrl() before generateLink() and pass it as `appUrl`, so
// a bad configuration is caught before anything is written; the default only
// covers callers that did not.
export const buildVerifyUrl = ({ properties, next, appUrl = getAppUrl() }) => {
  const params = new URLSearchParams({
    token_hash: properties.hashed_token,
    type: properties.verification_type,
    next,
  });
  return `${appUrl}/auth/verify?${params.toString()}`;
};
