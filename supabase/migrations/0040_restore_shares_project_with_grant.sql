-- 0040_restore_shares_project_with_grant.sql
--
-- Restores EXECUTE on private.shares_project_with(uuid) to authenticated.
--
-- 0018 created this helper and made it the USING expression of the
-- profiles SELECT policy "Project participants can view co-participant
-- profiles". 0027 then revoked EXECUTE from public, anon AND authenticated,
-- reasoning that RLS helpers "should not be callable as arbitrary API
-- endpoints" - but it left the policy in place. RLS policy expressions are
-- evaluated with the privileges of the querying role, so from the moment
-- 0027 applied (2026-08-16) every authenticated statement against
-- public.profiles has failed at planning time:
--
--     ERROR: 42501: permission denied for function shares_project_with
--
-- Confirmed against the production catalog on 2026-09-02 (read-only):
--   * has_function_privilege('authenticated', 'private.shares_project_with(uuid)', 'execute') = false
--   * as an authenticated client: SELECT count(*) FROM profiles          -> 42501
--   * as an authenticated client: SELECT ... WHERE id = auth.uid()       -> 42501
--   * as the authenticated admin:  SELECT count(*) FROM profiles          -> 42501
--   * as the authenticated admin:  EXPLAIN SELECT ... WHERE id = auth.uid() -> 42501
-- Even EXPLAIN fails, so no policy ordering or short-circuit rescues any
-- query. middleware.js reads profiles on every CRM request and signIn()
-- reads it right after signInWithPassword(), so every portal login has
-- bounced to "?error=portal" for every role since 0027. It is the only
-- policy in the database that references a function authenticated cannot
-- execute (verified by joining pg_policies against pg_proc).
--
-- The helper is SECURITY DEFINER, STABLE, takes one uuid, and already
-- delegates its scope to private.can_access_project - which 0009:345
-- grants to authenticated for exactly this reason. Granting it is the
-- same contract 0009 established for its sibling helpers; the "arbitrary
-- endpoint" concern does not apply to a boolean that only reveals whether
-- the caller shares a project with the given id. public and anon stay
-- revoked.

revoke all on function private.shares_project_with(uuid) from public, anon;
grant execute on function private.shares_project_with(uuid) to authenticated;

comment on function private.shares_project_with(uuid) is
  'RLS helper for the profiles co-participant policy. Must stay executable by authenticated: policy expressions run as the querying role, and revoking it (0027) broke every authenticated profiles read. Restored by 0040.';
