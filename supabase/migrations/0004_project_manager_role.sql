-- Add the project_manager role for CD Sportswear USA's CRM
-- Additive to 0001-0003 - never edit those files in place once applied.
--
-- This is its own migration, separate from 0005_pm_scoping_and_project_type.sql,
-- because Postgres does not allow a new enum value to be used (including
-- inside a CREATE FUNCTION body that references it) in the same
-- transaction it was added in - confirmed live against this project's
-- Postgres 17.6: ALTER TYPE ... ADD VALUE followed by any use of the new
-- value in the same multi-statement call fails with
-- 55P04: unsafe use of new value ... must be committed before they can be
-- used. The superseding role/project architecture is recorded in
-- docs/superpowers/plans/2026-07-30-crm-three-role-project-platform.md.

ALTER TYPE public.user_role ADD VALUE 'project_manager';
