# CRM Gate 1 — Migration Reconciliation and Preview Authorization

**Status:** Implemented in the isolated branch `agent/crm-gate1-migration-integrity`. No production mutation was performed by this Gate 1 slice.

## Purpose

Gate 1 makes the migration chain reproducible before additional CRM implementation begins. It recovers the live-only lead-capture follow-up change, preserves the transition-notification visibility fix from the unmerged PR #69 branch, renumbers the onboarding idempotency migration, and adds a preview-only authorization harness for the three CRM roles.

## Live-ledger reconciliation

The final read-only production ledger for project `wmnjosiikehsuaqucvja` contains the following relevant entries:

| Live version | Live name | Source-control treatment |
|---|---|---|
| `20260815135817` | `lead_capture_review_followups` | Recovered as `0029_lead_capture_review_followups.sql`. Its normalized PL/pgSQL body was compared with the exact live `pg_get_functiondef` result and matched. |
| `20260816111053` | `security_and_notification_hardening` | Already represented by local `0027_security_and_notification_hardening.sql`; already applied with owner approval. |
| `20260816112535` | `notification_read_grant_hardening` | Already represented by local `0028_notification_read_grant_hardening.sql`; already applied with owner approval. |

The ledger has no numeric `0024` row. PR #69 contains an unmerged `0028_transition_project_status_visibility_recipients.sql`; the onboarding branch contains a different `0028_idempotent_client_project_intake.sql`. Both are therefore renumbered in this branch rather than copied under their conflicting historical names.

| New local migration | Origin | Production state |
|---|---|---|
| `0029_lead_capture_review_followups.sql` | Live-only `lead_capture_review_followups` | Equivalent function body is already live; this source file is not yet applied as a new migration row. |
| `0030_transition_status_visibility_recipients.sql` | PR #69 transition-recipient fix | The corrected function body is already live but untracked by migration history; this is a clean-rebuild reconciliation. |
| `0031_idempotent_client_project_intake.sql` | Client-onboarding hardening branch | Not applied to production. It replaces the exact live six-argument `create_project` signature with the seven-argument form that adds `p_client_generated_id`. |

## Live function contracts used by the slice

Before editing, the following definitions were read from production. The existing `create_project` contract is:

```text
public.create_project(
  p_company_id uuid,
  p_category text,
  p_title text,
  p_brief text,
  p_target_date date,
  p_source_deal_id uuid
) returns uuid
```

The onboarding migration preserves the company argument for the admin-assisted path, but the function validates that a client’s supplied company matches `profiles.company_id` and then uses the authenticated profile’s company as `v_company_id`. The current server action derives the value from the trusted profile; the browser does not select it.

The recovered live lead function comparison normalized whitespace and removed source comments before comparing the function body. The result was `normalized_body_equal=true`.

## Preview authorization harness

The executable harness is `scripts/verify-crm-preview-authorization.mjs`, exposed as:

```bash
pnpm crm:verify:preview
```

The script refuses to run unless `CRM_PREVIEW_ENVIRONMENT=preview` is set. It uses only the public Supabase URL and anon/publishable key, signs in as four separately provisioned preview users, and never accepts `SUPABASE_SERVICE_ROLE_KEY`. It checks:

| Check | Expected result |
|---|---|
| Client A reads its own project | One row. |
| Client A reads Client B’s project | Zero rows. |
| Client B reads Client A’s project | Zero rows. |
| Client A reads internal messages | Zero rows. |
| Client A reads non-client-visible tasks | Zero rows. |
| Client A reads Client B’s tasks | Zero rows. |
| Employee reads assigned project | One row. |
| Employee reads unassigned project | Zero rows. |
| Employee reads unassigned tasks | Zero rows. |
| Admin reads both projects and the project thread | One row for each authorized query. |

Required preview variables are:

```text
CRM_PREVIEW_ENVIRONMENT=preview
SUPABASE_URL
SUPABASE_ANON_KEY
CRM_PREVIEW_CLIENT_A_EMAIL
CRM_PREVIEW_CLIENT_A_PASSWORD
CRM_PREVIEW_CLIENT_B_EMAIL
CRM_PREVIEW_CLIENT_B_PASSWORD
CRM_PREVIEW_EMPLOYEE_EMAIL
CRM_PREVIEW_EMPLOYEE_PASSWORD
CRM_PREVIEW_ADMIN_EMAIL
CRM_PREVIEW_ADMIN_PASSWORD
CRM_PREVIEW_CLIENT_A_PROJECT_ID
CRM_PREVIEW_CLIENT_B_PROJECT_ID
CRM_PREVIEW_EMPLOYEE_ASSIGNED_PROJECT_ID
CRM_PREVIEW_EMPLOYEE_UNASSIGNED_PROJECT_ID
CRM_PREVIEW_CLIENT_A_THREAD_ID
```

The test-user provisioning helper remains a separate explicitly controlled operation because it uses a service-role key. Do not run it against production. Provision two client companies, two client users, one employee, one admin, two projects, one assigned and one unassigned employee project, shared/internal messages, client-visible and internal tasks, and a project thread in a disposable preview database.

## Verification completed in this slice

The red/green sequence is recorded by the contract tests:

```bash
node --test tests/crm/migration-0029-lead-capture-review-followups.test.mjs \
  tests/crm/migration-0030-transition-status-visibility.test.mjs \
  tests/crm/migration-0031-idempotent-client-project-intake.test.mjs \
  tests/crm/preview-authorization-harness.test.mjs
```

The preview harness passes syntax validation and fails closed when the environment is not explicitly `preview`. The actual role-based network checks remain a preview-environment gate and require the variables above.

## Production boundary

Do not apply local migrations 0029, 0030, or 0031 to production from this branch yet. The next production preflight must verify the current ledger, exact live function bodies, index existence, and whether the live-only changes are already represented under another migration name. Owner approval is required for any production migration application. The already-applied production security migrations 0027 and 0028 are not edited or reused.

## Next implementation gate

After preview authorization checks pass, review and merge the reconciled migrations as source history, then proceed to the shared workspace kernel and messaging/asset hardening. The client onboarding UI/action changes should be integrated only with the renamed 0031 migration and its updated function contract.
