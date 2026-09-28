-- Behavioural proof for 0045: both outbox completion RPCs run (0033's
-- bodies raised 42883 on every call) and keep 0033's lease-owned
-- compare-and-set, retry and terminal outcomes, and grants. Each of the
-- three repaired coalesce() calls is exercised: sent_at, the default retry
-- time, and the default error text.

begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

-- Four due email rows with no project or recipient, like the live
-- lead.created rows. An available_at in 2000 puts them first in claim order.
insert into public.notifications_outbox (id, channel, event_type, payload, available_at)
values
  ('45000000-0000-0000-0000-000000000001', 'email', 'test.outbox_mark', '{}', '2000-01-01 00:00:00+00'),
  ('45000000-0000-0000-0000-000000000002', 'email', 'test.outbox_mark', '{}', '2000-01-01 00:00:00+00'),
  ('45000000-0000-0000-0000-000000000003', 'email', 'test.outbox_mark', '{}', '2000-01-01 00:00:00+00'),
  ('45000000-0000-0000-0000-000000000004', 'email', 'test.outbox_mark', '{}', '2000-01-01 00:00:00+00');

create temporary table claimed as
  select * from public.claim_notification_email_batch(4, 300);

select is(
  (select count(*) from claimed where id::text like '45000000-%'),
  4::bigint,
  'the claim leases the four due fixture rows'
);

select lives_ok(
  $$ select public.mark_notification_email_sent(
       '45000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000') $$,
  'mark_notification_email_sent runs (0033''s body raised 42883 here)'
);

select lives_ok(
  $$ select public.mark_notification_email_failed(
       '45000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
       true, 'provider_retryable', null, null) $$,
  'mark_notification_email_failed runs (0033''s body raised 42883 here)'
);

-- Row 1: sent.
select is(
  public.mark_notification_email_sent(
    '45000000-0000-0000-0000-000000000001',
    (select lease_id from claimed where id = '45000000-0000-0000-0000-000000000001')
  ),
  1,
  'the lease holder marks its row sent'
);

select ok(
  (select status = 'sent' and sent_at = now() and last_error is null
          and lease_id is null and lease_acquired_at is null and lease_expires_at is null
     from public.notifications_outbox where id = '45000000-0000-0000-0000-000000000001'),
  'a sent row records sent_at and releases its lease'
);

select is(
  public.mark_notification_email_sent(
    '45000000-0000-0000-0000-000000000001',
    (select lease_id from claimed where id = '45000000-0000-0000-0000-000000000001')
  ),
  0,
  'a released lease cannot complete the row again'
);

-- Row 2: retryable failure with an explicit retry time.
select is(
  public.mark_notification_email_failed(
    '45000000-0000-0000-0000-000000000002',
    (select lease_id from claimed where id = '45000000-0000-0000-0000-000000000002'),
    true, 'provider_retryable', 'Email provider response status 503.', '2030-01-01 00:00:00+00'
  ),
  1,
  'the lease holder records a retryable failure'
);

select ok(
  (select status = 'pending' and available_at = '2030-01-01 00:00:00+00'
          and failure_code = 'provider_retryable' and failed_at is null
          and last_error = 'Email provider response status 503.'
          and lease_id is null and lease_acquired_at is null and lease_expires_at is null
     from public.notifications_outbox where id = '45000000-0000-0000-0000-000000000002'),
  'a retryable failure is rescheduled at the requested time and releases its lease'
);

-- Row 3: retryable failure with neither a time nor a message.
select is(
  public.mark_notification_email_failed(
    '45000000-0000-0000-0000-000000000003',
    (select lease_id from claimed where id = '45000000-0000-0000-0000-000000000003'),
    true, 'provider_retryable', null, null
  ),
  1,
  'a retryable failure needs neither a retry time nor a message'
);

select ok(
  (select status = 'pending' and available_at = now() and last_error = ''
     from public.notifications_outbox where id = '45000000-0000-0000-0000-000000000003'),
  'without a retry time it retries now, and a missing message is stored as empty'
);

-- Row 4: terminal failure with an over-long message.
select is(
  public.mark_notification_email_failed(
    '45000000-0000-0000-0000-000000000004',
    (select lease_id from claimed where id = '45000000-0000-0000-0000-000000000004'),
    false, 'provider_terminal', repeat('x', 600), null
  ),
  1,
  'the lease holder records a terminal failure'
);

select ok(
  (select status = 'failed' and failed_at = now() and failure_code = 'provider_terminal'
          and char_length(last_error) = 500 and available_at = '2000-01-01 00:00:00+00'
          and lease_id is null
     from public.notifications_outbox where id = '45000000-0000-0000-0000-000000000004'),
  'a terminal failure is final, keeps its schedule and bounds the error to 500 characters'
);

select throws_ok(
  $$ select public.mark_notification_email_failed(
       '45000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
       false, 'not_a_code', null, null) $$,
  '22023', null,
  'unknown failure codes are rejected'
);

select ok(
  has_function_privilege('service_role', 'public.mark_notification_email_sent(uuid, uuid)', 'execute')
  and not has_function_privilege('anon', 'public.mark_notification_email_sent(uuid, uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.mark_notification_email_sent(uuid, uuid)', 'execute'),
  'only service_role can mark a row sent'
);

select ok(
  has_function_privilege('service_role', 'public.mark_notification_email_failed(uuid, uuid, boolean, text, text, timestamptz)', 'execute')
  and not has_function_privilege('anon', 'public.mark_notification_email_failed(uuid, uuid, boolean, text, text, timestamptz)', 'execute')
  and not has_function_privilege('authenticated', 'public.mark_notification_email_failed(uuid, uuid, boolean, text, text, timestamptz)', 'execute'),
  'only service_role can mark a row failed'
);

select ok(
  pg_get_functiondef('public.mark_notification_email_sent(uuid, uuid)'::regprocedure) !~* 'pg_catalog\.coalesce'
  and pg_get_functiondef('public.mark_notification_email_failed(uuid, uuid, boolean, text, text, timestamptz)'::regprocedure) !~* 'pg_catalog\.coalesce',
  'neither RPC schema-qualifies coalesce'
);

select * from finish();
rollback;
