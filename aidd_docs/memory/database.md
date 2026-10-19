# Database

## Setup

- Supabase Postgres, accessed through `@supabase/supabase-js`. There is no ORM.
- The canonical schema is `supabase/migrations/`, numbered sequentially. Check the directory for the head.
- Local stack config is `supabase/config.toml`.

## Main entities

```mermaid
flowchart LR
  profiles --> company_members --> companies
  companies --> contacts
  companies --> deals
  deals --> tasks
  deals --> contact_artwork
  companies --> projects
  projects --> project_assignments
  projects --> project_threads --> project_messages --> project_attachments
  projects --> project_files
  projects --> project_tasks
  projects --> project_approvals
  projects --> project_deliverables
  companies --> project_briefs
  projects --> notifications_outbox
```

## Conventions

- Project delivery writes go through SECURITY DEFINER RPCs (`create_project`, `post_project_message`, `transition_project_status`, …). The RPCs are called from server actions, and reads go through `lib/crm/projects.js`.
- Companies, contacts, deals, tasks and users are queried directly from client components with the browser client, and RLS scopes them.
- RLS helpers live in the `private` schema with a pinned `search_path`. Execute is revoked from `public`/`anon` and granted to `authenticated`.
- Files live in the private `project-files` bucket, using reserve-then-finalize uploads.
- Homepage production-request artwork lives in the private `contact-artwork` bucket and the `contact_artwork` table (migration 0053): `reserve_contact_artwork` and `attach_contact_artwork` are service-role only, and only an admin can read attached rows. Objects are reachable only through server-minted signed URLs. Every deleted `contact_artwork` row (including deal and company cascades) queues its object path in `contact_artwork_removals`, which the daily `crm-notifications` cron drains.
- Never schema-qualify `coalesce` or `nullif`.
- A migration that adds an audit event type widens `audit_events_event_type_check` in the same file.
- Sender names showing "Unknown" point at `profiles` RLS: check `private.shares_project_with()`.
