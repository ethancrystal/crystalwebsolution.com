-- Corrective notification RPC grant hardening.
-- Migration 0027 created this RPC but did not revoke its explicit anon and
-- authenticated grants observed in the live catalog.
revoke all on function public.mark_notifications_read(uuid[])
  from public, anon, authenticated;
grant execute on function public.mark_notifications_read(uuid[])
  to authenticated;
