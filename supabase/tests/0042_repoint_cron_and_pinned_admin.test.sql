-- Behavioral check that 0042 actually changed the live function, not just
-- the SQL text. Cron.job is not asserted here: pg_cron/pg_net/vault are
-- scheduler infrastructure, and this suite's job is the pin that every
-- other pgTAP fixture reads through public.pinned_admin_email().

begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

-- 0044 has since moved the pin again (its own test asserts the address), so
-- this only proves 0042's job stayed done: never the retired domain.
select isnt(
  public.pinned_admin_email(),
  'ethan@crystalwebsolution.com',
  'the admin pin no longer names the retired crystalwebsolution.com mailbox'
);

select * from finish();
rollback;
