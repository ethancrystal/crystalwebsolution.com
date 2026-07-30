# CRM Authentication and RBAC Audit

Date: 2026-07-30  
Scope: authentication, signup/login/reset/invite flows, middleware, Supabase role/profile synchronization, and access routing for exactly three personas: `client`, `project_manager` (employee), and `admin`.  
Method: focused static review of the current `main` checkout plus migrations `0001`-`0007`. No application or database files were changed. Live Supabase observations in the migration section were supplied by the coordinating audit.

## Executive conclusion

The repository has useful foundations: Supabase SSR sessions, server-validated `getUser()` checks, service-role-only role assignment, a default-client profile trigger, page/action checks for user administration, and RLS around the client/project workspace. It is not yet a reliable three-persona multi-login system.

The release blockers are:

1. Staff invites claim to set a password but verify the invite and send the user directly to `/admin`; there is no invite password-setup step.
2. Both visible logout links target a nonexistent `/api/auth/logout` route.
3. Authorization has two independent role sources (`profiles.role` and `app_metadata.role`). Role updates are non-atomic, while RLS accepts either source, so a failed update or stale JWT can preserve admin privileges after demotion.
4. Middleware deliberately fails open when Supabase configuration is missing.
5. There is one generic login and one hard-coded post-login destination. Client, employee, and admin portal entry is not established server-side.
6. Project managers are assignment-scoped for deals/tasks, but remain able to read and update every company/contact through blanket `is_staff()` policies.
7. Live migration history and live policies disagree: history records `0001`-`0006`, while the `0007` policies were applied manually. A future migration push can attempt `0007` again and fail.

## Intended persona contract

| Persona | Account creation | Canonical landing | Authorized surface |
|---|---|---|---|
| Client | Public signup and email confirmation | `/dashboard` | Own company, projects, messages, and files |
| Employee / project manager | Admin invitation only | Dedicated employee gate, then `/admin` or preferably `/employee` | Assigned deals/tasks and records needed for those assignments |
| Admin | Bootstrap or admin invitation only | Dedicated admin gate, then `/admin` | All CRM records, user/role administration, assignment |

The app currently uses `project_manager` as the persisted employee value. Keep that as the single database/JWT value and use “Employee” or “Project Manager” only as a UI label. Do not add a fourth `employee` role.

## What works

- New profiles default to `client`, and the trigger reads elevated roles only from service-controlled app metadata (`supabase/migrations/0001_crm_schema.sql:234-249`).
- Public signup does not accept a role from the form; it sends only `full_name` as user metadata (`app/auth/actions.js:12-34`).
- Admin user actions validate the caller with a server-side `getUser()` and require `app_metadata.role === 'admin'` (`app/admin/users/actions.js:12-23`).
- Assignable staff roles are constrained to `admin` and `project_manager` in the server action (`app/admin/users/actions.js:9-10, 40-45, 110-115`).
- Middleware validates the user with `supabase.auth.getUser()`, not an unverified client claim (`middleware.js:22-38`).
- `/admin/users` has a middleware admin-only gate in addition to server-action checks (`middleware.js:54-61`).
- Client project reads and project collaboration are backed by RLS helpers rather than trusting route parameters (`supabase/migrations/0005_pm_scoping_and_project_type.sql:71-95`; `app/dashboard/projects/[id]/page.jsx:43-64`).
- Password-reset requests intentionally return a generic success result whether or not a user exists (`app/auth/actions.js:140-174`).

## Findings

### AUTH-01 — High — Staff invite does not set a password and assigns the role after sending the link

Evidence:

- The email tells the user to “Set your password” (`lib/email/templates.js:93-103`).
- The invite link verifies an `invite` OTP and redirects directly to `/admin` (`app/admin/users/actions.js:49-66`; `app/auth/verify/route.js:4-16`).
- The actual password form exists only at `/auth/reset-password`, and the invite does not route there (`app/auth/reset-password/page.jsx:40-78`).
- The invite email is sent before app metadata and profile roles are updated (`app/admin/users/actions.js:62-92`).

Impact:

- An invited employee/admin gets a one-time authenticated session but never performs the promised password setup. After session loss, ordinary password login may be impossible until they use “Forgot password.”
- A fast click or a role-update failure can land the invitee in a session created while the account still has the trigger-default `client` role.
- If either role write fails after the email send, the invitation has already escaped and the account can remain partially provisioned.

Fix:

1. Generate the invite link.
2. Assign the canonical role before making the invitation usable.
3. Route successful invite verification to a dedicated `/auth/accept-invite` password form.
4. Call `updateUser({ password })`, refresh the session/claims, then perform a server-side role-aware redirect.
5. Send the email only after provisioning succeeds; on send failure, retain an explicit “provisioned, unsent” state with an admin resend operation.
6. Add an invite status/audit record so partial provisioning can be reconciled.

### AUTH-02 — Critical — Split-brain role state can preserve admin access after demotion

Evidence:

- Middleware and `useUserRole` use `user.app_metadata.role` (`middleware.js:46-51`; `lib/useUserRole.js:6-9, 17-25`).
- The dashboard uses `profiles.role` for its staff redirect (`app/dashboard/page.jsx:48-64`).
- RLS helpers authorize when either the JWT claim **or** `profiles.role` matches (`supabase/migrations/0005_pm_scoping_and_project_type.sql:27-45`).
- `changeUserRole` updates `profiles` first and app metadata second, as separate calls (`app/admin/users/actions.js:117-131`).
- Migration comments acknowledge already-issued JWTs retain an old claim until refresh (`supabase/migrations/0005_pm_scoping_and_project_type.sql:17-24`).

Impact:

- If an admin is demoted in `profiles` but the metadata update fails, `is_admin()` still grants access from app metadata.
- Even when both writes succeed, an already-issued JWT containing `admin` remains accepted by the `OR` branch until refresh/expiry.
- UI routing, middleware, and RLS can disagree about the same user.
- The role UI permits self-demotion and contains no last-admin invariant, creating an administrative lockout risk (`app/admin/users/page.jsx:55-75, 118-130`).

Fix:

- Choose one authorization source. Recommended: make `profiles.role` canonical for server routing and RLS, and treat JWT metadata as a derived hint only.
- Remove the JWT/profile `OR` authorization pattern. If JWT claims remain canonical instead, implement an atomic privileged role-change RPC plus session revocation/forced refresh before considering demotion complete.
- Put role changes behind one database transaction or privileged RPC, record actor/target/old/new values, prevent last-admin demotion, and normally prevent an admin from demoting themselves.
- After promotion/demotion, revoke the target’s sessions or require immediate token refresh and reauthentication.
- Add a consistency check/job for existing profile/metadata mismatches.

### AUTH-03 — High runtime blocker — Logout links are dead

Evidence:

- Client and admin dashboards link to `/api/auth/logout` (`app/dashboard/page.jsx:93-95`; `app/admin/page.jsx:74-76`).
- There is no `app/api/auth/logout` route.
- A working `signOut()` server action exists but is never connected to these links (`app/auth/actions.js:79-83`).

Impact:

Users cannot reliably terminate their session from either portal. A dead link may 404 while leaving auth cookies active on a shared device.

Fix:

- Replace both links with a POST form bound to `signOut`, or add a POST-only logout route that calls `supabase.auth.signOut()` and redirects.
- Do not implement state-changing logout as an ordinary GET link.
- Test cookie removal and back-navigation for all three personas.

### AUTH-04 — High — Middleware fails open and does not establish persona-specific server gates

Evidence:

- Missing Supabase environment variables cause middleware to skip all auth checks (`middleware.js:5-14`).
- `/admin` admits both admin and project manager; only `/admin/users` is separately narrowed (`middleware.js:40-61`).
- `/dashboard` checks authentication only, not the client role (`middleware.js:64-69`).
- Authenticated users visiting login/signup/forgot-password are always sent to `/dashboard` (`middleware.js:71-75`).

Impact:

- A production misconfiguration silently removes route protection instead of failing deployment or returning an unavailable response.
- Staff access to the client portal is corrected only later by client-side code, creating flashes, extra requests, and inconsistent routing.
- There is no dedicated employee/admin login gate or role-aware return path.

Fix:

- Validate required auth configuration at startup/build and fail closed on protected routes.
- Centralize `requirePersona(allowedRoles)` in server code and use it from middleware, protected layouts/pages, and server actions.
- Gate `/dashboard` to `client`; gate employee routes to `project_manager`; gate administrative/user-management routes to `admin`.
- If PMs continue using `/admin`, define an explicit route matrix so creation, deletion, user management, and assignment remain admin-only.

### AUTH-05 — High product gap — “True multi-login” is not implemented

Evidence:

- There is only one generic `/login` page (`app/login/page.jsx:49-118`).
- Successful password login always redirects to `/dashboard` (`app/auth/actions.js:57-77`).
- Successful password update also always redirects to `/dashboard` (`app/auth/actions.js:177-191`).
- The dashboard redirects staff to `/admin` only after a browser-side profile fetch (`app/dashboard/page.jsx:37-71`).
- The setup guide claims middleware redirects staff/admin appropriately, but the code does not perform that role-aware login redirect (`CRM-SETUP.md:143-164`).

Impact:

Client, employee, and admin entry points are branding variants at best; they are not separate authorization gates. Role mismatches are discovered late, and portal URLs cannot safely express which persona is signing in.

Fix:

- Provide `/client/login`, `/employee/login`, and `/admin/login` (or one shared component parameterized by an immutable portal type).
- All may use the same Supabase password provider, but after authentication a server helper must compare the requested portal against the canonical role.
- Redirect exact matches to `/dashboard`, `/employee` (or the scoped PM surface), and `/admin`.
- On mismatch, sign out or show “This account belongs to the X portal” without exposing CRM data.
- Carry only validated relative return paths. Do not trust arbitrary `next` values.
- Apply the same role-aware redirect after signup confirmation, reset, invite acceptance, and when an authenticated user opens a login page.

### AUTH-06 — High authorization gap — Project managers can read/update all companies and contacts

Evidence:

- `is_staff()` means admin or PM (`supabase/migrations/0005_pm_scoping_and_project_type.sql:32-35`).
- The original company/contact SELECT and UPDATE policies use blanket `is_staff()` (`supabase/migrations/0001_crm_schema.sql:159-183`).
- Migration `0006` intentionally leaves those blanket policies in place, despite describing access as tied to assigned deals (`supabase/migrations/0006_admin_only_company_contact_creation.sql:19-21`).
- By contrast, deals are correctly scoped to `owner_id = auth.uid()` for PMs (`supabase/migrations/0005_pm_scoping_and_project_type.sql:71-83`).

Impact:

An employee assigned to one project can enumerate and modify every client company and contact in the CRM. Hiding create/delete buttons in React does not narrow the browser’s direct Supabase access.

Fix:

- Replace blanket PM policies with `EXISTS` checks through deals/tasks assigned to `auth.uid()`.
- Keep all-record company/contact access admin-only.
- Decide whether PM updates are needed at all; if so, use column-safe RPCs or triggers to prevent ownership/security-field changes.
- Build the employee portal against these scoped policies, not filtered client queries.

### AUTH-07 — Medium/High — Public service-role-backed auth actions have no application abuse controls

Evidence:

- Public signup invokes `auth.admin.generateLink` and sends Resend email from a server action (`app/auth/actions.js:12-54`).
- Password reset does the same (`app/auth/actions.js:140-174`).
- No CAPTCHA, IP/email throttling, or application rate limiter is present.
- Confirmation resend uses a different Supabase-built-in delivery path (`app/auth/actions.js:113-137`), despite the custom flow being required elsewhere.

Impact:

Anonymous callers can consume Auth and email capacity, create unconfirmed accounts, and use the application as an email-abuse endpoint. The mixed resend flow can also behave differently from the custom token-hash flow.

Fix:

- Add edge/server rate limits by IP and normalized email, CAPTCHA/Turnstile on signup/reset/resend, and structured abuse logging.
- Normalize and validate email/full name/password server-side; enforce the desired password policy server-side.
- Use one confirmation delivery mechanism and preserve non-enumerating responses.
- Add cleanup/expiry policy for abandoned unconfirmed accounts.

### AUTH-08 — Medium — Redirect targets are not allowlisted

Evidence:

- Callback and OTP verification append the raw `next` query value directly to `origin` (`app/auth/callback/route.js:4-18`; `app/auth/verify/route.js:4-19`).

Impact:

Malformed values can produce invalid or attacker-controlled redirect behavior. Even if current generated links use fixed values, these routes are public boundary code.

Fix:

- Accept only a small allowlist of relative internal destinations derived from flow type and persona.
- Reject values not beginning with one `/`, values beginning with `//`, backslashes, control characters, schemes, or user-info syntax.
- Prefer server-selected destinations over a caller-supplied `next`.

### AUTH-09 — High operations/security — Live migration drift and unresolved function advisories

Repository evidence:

- `0007` starts with an unconditional `DROP POLICY` and then creates replacement policies (`supabase/migrations/0007_notes_creation_scoping.sql:12-25, 42-57`).
- `handle_profile_updated()` is `SECURITY DEFINER` without a fixed `search_path` (`supabase/migrations/0001_crm_schema.sql:254-264`).
- Other helpers are also `SECURITY DEFINER`; `0005` fixes search paths for several but does not define explicit execution grants/revokes (`supabase/migrations/0005_pm_scoping_and_project_type.sql:26-52, 85-95`).

Live observation:

- Supabase project `wmnjosiikehsuaqucvja` currently has empty application data.
- Migration history records only `0001`-`0006`.
- The `0007` note policies exist live from manual application.
- Security advisors report mutable `search_path` and publicly/authenticated-callable `SECURITY DEFINER` functions.

Impact:

- The next migration deployment can try to apply `0007` and fail immediately because the old policy is already absent, blocking deterministic environments.
- Mutable search paths and broad EXECUTE grants increase the blast radius of definer functions.
- An empty project has no demonstrated admin bootstrap or three-persona end-to-end proof.

Fix:

1. Compare live `0007` definitions byte-for-semantics with the repository.
2. If identical, repair migration history to mark `0007` applied; otherwise create a new reconciliatory migration and document the drift. Do not blindly rerun `0007`.
3. Add a new migration that pins every definer function to a safe search path (normally `pg_catalog, public`, with qualified object references).
4. `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` on internal/trigger/helper functions; explicitly grant only intentional RPC entry points such as client onboarding to `authenticated`.
5. Re-run Supabase security advisors and record a zero-unexplained-warning baseline.
6. Establish a controlled first-admin bootstrap, then test one account for each persona.

### AUTH-10 — Medium — Documentation and tests do not match the implementation

Evidence:

- Setup documentation still describes `client, staff, admin`, applies only `0001`, and documents nonexistent `/api/auth/*` endpoints (`CRM-SETUP.md:7-13, 75-95, 128-180`).
- No auth/RBAC tests exist under `tests/`.

Impact:

Operators can provision the wrong schema or trust routes that do not exist. Regressions in cross-role access have no automated gate.

Fix:

- Update setup docs to migrations `0001`-`0007`, the three current personas, actual server actions/routes, Resend variables, bootstrap, and role-aware portal routing.
- Add integration tests for unauthenticated, client, PM, and admin route matrices; invite acceptance; reset; logout; promotion/demotion; stale-session revocation; and cross-company/cross-assignment RLS denial.

## Required portal/auth interface

Implement one server-owned result shape used by middleware, layouts, and actions:

```text
AuthenticatedPrincipal {
  userId
  canonicalRole: client | project_manager | admin
  companyId
}
```

The client portal must never infer access from `company_id` supplied by the browser. It should receive the authenticated principal, use `/dashboard` only for `client`, and rely on company/deal RLS for every query.

The employee portal must receive `project_manager`, query only assigned deals/tasks, and derive company/contact visibility through those assignments. Employee UI hiding is supplemental; RLS is the authority.

The admin portal must require `admin` again at each privileged server action. User invite, role change, assignment, and deletion need audit records and must not depend on a client hook.

## Recommended remediation order

1. Fix logout and invite acceptance/password setup.
2. Replace split role authority with one canonical source; implement transactional role change, last-admin protection, and session revocation.
3. Add server-side client/employee/admin login gates and role-aware redirects.
4. Fail closed on missing auth configuration.
5. Narrow PM company/contact RLS to assignment scope.
6. Reconcile `0007` migration history and clear function security advisories.
7. Add abuse controls, redirect allowlists, bootstrap, documentation, and an end-to-end role matrix.

## Release gate

Do not call the CRM production-ready until all of the following pass against a migrated test project:

- Each persona can complete its intended creation/invite, login, reset, logout, and re-login lifecycle.
- Wrong-portal login is denied or redirected server-side before portal data requests.
- A client cannot read another company/project.
- A PM cannot read or mutate unassigned deals, companies, contacts, tasks, messages, files, or notes.
- A demoted admin loses route, server-action, and RLS access immediately.
- The last admin cannot be demoted.
- Fresh migration replay succeeds through `0007` (and the new hardening migration).
- Supabase advisors have no unexplained auth/schema security findings.
