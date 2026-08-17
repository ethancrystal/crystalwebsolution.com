-- Expand the project category taxonomy without renaming existing persisted values.
-- The timestamp is newer than the reconciled production migration ledger.

begin;

alter table public.projects
  drop constraint if exists projects_category_check;

alter table public.projects
  add constraint projects_category_check check (
    category in (
      'web_design',
      'web_development',
      'logo_creation',
      'branding',
      'marketing',
      'animation',
      'ai_automation',
      'workflow_automation'
    )
  );

comment on constraint projects_category_check on public.projects is
  'Canonical CRM project taxonomy v2; legacy category values remain valid for compatibility.';

commit;
