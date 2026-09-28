-- 0039_must_set_password_gate.sql
--
-- Admin-invited staff arrive through a one-time invite link that signs them
-- in without a password (auth.admin.generateLink type 'invite'). The link
-- lands them on /auth/reset-password to choose one, but nothing stopped
-- them navigating straight to a portal instead and living on a session that
-- can never be re-established once it lapses.
--
-- Whether an account has a password is a fact only auth.users knows, and
-- the anon/authenticated roles cannot read that table. Rather than copying
-- the fact into profiles (where "Users can update their own profile" would
-- let a user clear it) this migration exposes it through one hardened,
-- read-only RPC scoped to the caller. middleware.js calls it on portal
-- paths and sends anyone still password-less to the set-password page.
--
-- GoTrue stores a missing password as '' on older schemas and NULL on
-- newer ones; both are treated as "not set".

CREATE OR REPLACE FUNCTION public.current_user_must_set_password()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    (
      SELECT COALESCE(u.encrypted_password, '') = ''
      FROM auth.users AS u
      WHERE u.id = auth.uid()
    ),
    false
  )
$$;

COMMENT ON FUNCTION public.current_user_must_set_password() IS
  'True when the calling user has no password on auth.users (an admin invitee who has not yet set one). Read-only, scoped to auth.uid(); consumed by middleware.js to gate portal access.';

REVOKE ALL ON FUNCTION public.current_user_must_set_password() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_must_set_password() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_must_set_password() TO authenticated;
