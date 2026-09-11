-- Behavioral check that 0042 actually changed the live function, not just
-- the SQL text. Cron.job is not asserted here: pg_cron/pg_net/vault are
-- scheduler infrastructure, and this suite's job is the pin that every
-- other pgTAP fixture reads through public.pinned_admin_email().

begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

select is(
  public.pinned_admin_email(),
  'ethan@cdsportswearinc.com',
  '0042 pins the admin role to the current production mailbox'
);

select * from finish();
rollback;
