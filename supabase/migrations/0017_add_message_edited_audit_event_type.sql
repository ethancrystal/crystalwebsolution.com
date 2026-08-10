-- 0017_add_message_edited_audit_event_type.sql
--
-- audit_events_event_type_check never included 'project.message_edited',
-- the one new event type migration 0015 introduced (update_project_message).
-- Same class of bug STATUS.md documents for migration 0010 (new event types
-- not added to the CHECK constraint, caught only because a real RPC call
-- was attempted). Discovered live during Phase 1 CRM verification
-- (2026-08-09): editing a message via the real update_project_message RPC
-- failed with 23514 (check_violation) on its own audit-log insert.

begin;

alter table public.audit_events
  drop constraint audit_events_event_type_check;

alter table public.audit_events
  add constraint audit_events_event_type_check
  check (event_type = any (array[
    'project.created',
    'project.user_assigned',
    'project.assignment_removed',
    'project.status_transitioned',
    'project.attachment_reserved',
    'project.message_posted',
    'project.message_edited',
    'project.attachment_finalized',
    'project.task_created',
    'project.task_updated',
    'project.approval_requested',
    'project.approval_updated',
    'project.deliverable_published',
    'project.notification_enqueued',
    'project.note_posted',
    'project.deliverable_created'
  ]::text[]));

commit;
