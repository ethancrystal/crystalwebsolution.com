-- Behavioral check that 0042 actually changed the live function, not just
-- the SQL text. Cron.job is not asserted here: pg_cron/pg_net/vault are
-- scheduler infrastructure, and this suite's job is the pin that every
-- other pgTAP fixture reads through public.pinned_admin_email().

begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

-- 0043 moved the pin again, and this suite runs against the full migration
-- chain, so the live function returns 0043's address.
select is(
  public.pinned_admin_email(),
  'moizj00@gmail.com',
  'the admin pin resolves to the current owner-approved address (0043)'
);

select * from finish();
rollback;
