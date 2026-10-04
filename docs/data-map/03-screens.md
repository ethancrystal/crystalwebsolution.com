# 03. Screens: what the CRM and auth UI loads, writes and keeps in the browser

Scope: every CRM and auth page, the components under `components/crm/` and `components/auth/`, the read models in `lib/crm/`, `lib/crm/projectRealtime.js` and `lib/useUserRole.js`. Server actions are documented in `02-entry-points.md`; this chapter records only which action a screen calls and which fields it passes. Tables and RLS are in `01-data-dictionary.md` and `01b-database-logic.md`.

Code state: commit `1c17666` plus the uncommitted fix-branch edits (plan items F1 to F9 and F11) that were in the working tree at the last check, listed in section 10. Machine-readable twin: `data/ui.json` (domain `ui`).

Legend. RC = client component (`'use client'`), RSC = server component. Sources are `path#symbol`. Migrations are cited by file name and policy or function name. **Edge:** gives a trigger condition and its concrete consequence. **UNVERIFIED** means it needs a browser, the live database, or library source that was not available.

## 1. Architecture facts

| # | Fact | Source |
| --- | --- | --- |
| 1 | RSC pages: `/onboarding`, `/team`, `/admin/blog`, `/admin/blog/new`, `/admin/blog/[id]`, the three `/login/<portal>` wrappers (which render the RC `PortalLoginForm`), and the three portal layouts. Every other CRM and auth page is `'use client'` and fetches in `useEffect` or in an event handler. | `app/onboarding/page.jsx#ClientOnboardingPage`, `app/team/page.jsx#TeamPage`, `app/admin/blog/page.jsx#AdminBlogPage` |
| 2 | Two data paths. Delivery: reads through `lib/crm/projects.js` and `lib/crm/briefs.js`, writes through server actions that call RPCs. CRM: companies, contacts, deals, tasks, notes and the users list are read and written directly with the browser client, so RLS is the only guard. | `lib/crm/projects.js#getProjectWorkspace`, `lib/supabase/browser.js#createClient` |
| 3 | The read model runs in the browser for client pages. `clientSafeProject`, `sharedOnly`, `clientVisibleOnly` and the PM assignment check are JavaScript filters executed in the browser, so they shape the display but RLS is the real boundary. `/team` and `/admin/blog*` are the only server-side callers. | `lib/crm/projects.js#clientSafeProject`, `lib/crm/projects.js#isAssignedProjectManager` |
| 4 | Three stacked gates. Middleware: `middleware.js` (matcher, `portalForPath`, `isRoleAllowed`, RPC `current_user_must_set_password`). Layout: `requireRole` in the `/admin`, `/dashboard` and `/team` layouts (`dynamic = 'force-dynamic'`). Data: RLS. | `middleware.js#middleware`, `app/admin/layout.jsx#AdminLayout`, `app/dashboard/layout.jsx#DashboardLayout`, `app/team/layout.jsx#TeamLayout` |
| 5 | `isAdmin` and `isPm` branches inside `/admin/**` pages are presentation only. The admin layout lets only admins in, so every `isPm` branch is unreachable. | `lib/useUserRole.js#useUserRole`, `app/admin/deals/page.jsx#DealsPage` |
| 6 | `/onboarding` is in the middleware matcher but `portalForPath('/onboarding')` is null, so it gets no role redirect and no must-set-password check. Its only gate is the page's `requireRole(['client'])`. | `middleware.js#config`, `lib/auth/roles.mjs#portalForPath`, `app/onboarding/page.jsx#ClientOnboardingPage` |
| 7 | There is no `router.refresh()` in scope. `revalidatePath` in server actions refreshes only the RSC pages (`/team`, `/admin/blog*`). Client pages refresh through their own loaders, realtime events or navigation. | grep over `app/{admin,dashboard,team}`, `components/crm` |
| 8 | Portal navigation uses plain `<a href>` (WorkspaceShell nav, dashboard project cards), so each move is a full page load that drops React state and any realtime channel. | `components/crm/WorkspaceShell.jsx#WorkspaceShell`, `app/dashboard/page.jsx#DashboardPage` |
| 9 | Route params go straight into queries. Direct-table pages use `.eq('id', id)` with no UUID check; the read model checks with `requireProjectId`. | `app/admin/companies/[id]/page.jsx#CompanyDetailPage`, `lib/crm/projects.js#requireProjectId` |
| 10 | Every browser query carries the user JWT from the `sb-<ref>-auth-token` cookie plus the public anon key. The browser client is built with `createBrowserClient`; whether it is a per-page singleton (the realtime registry assumes it is) is UNVERIFIED because `node_modules` was not readable here. | `lib/supabase/browser.js#createClient`, `lib/crm/projectRealtime.js#registryFor` |

- **Edge:** PostgREST error text is shown verbatim (`err.message`) on every admin CRM page. Trigger: any RLS, constraint or malformed-id failure on a direct-table call. Consequence: raw Postgres wording such as `invalid input syntax for type uuid` reaches the admin (`app/admin/companies/new/page.jsx#handleSubmit`).
- **Edge:** a session that expires while an RC page is open. Trigger: refresh token fails, queries run as `anon`. Consequence: RLS returns empty arrays rather than errors, so lists render "No X yet" and counts render 0 until a navigation reaches middleware. UNVERIFIED in a browser.

## 2. Screen inventory

### 2a. Auth and entry

| Route (render) | Roles | Data loaded | Data written | Actions called |
| --- | --- | --- | --- | --- |
| `/login` (RC) | public; middleware redirects a signed-in user to their role home | none, static chooser | none | none |
| `/login/client`, `/login/employee`, `/login/admin` (RSC wrapper, RC `PortalLoginForm`) | public; a signed-in user with a role that does not match the portal is redirected to their own home | URL `?error=` and `?next=`, read once in `useEffect` | none | `signIn` |
| `/signup` (RC) | public; middleware redirects a signed-in user to their role home | none | none | `signUp` |
| `/forgot-password` (RC) | public; middleware redirects a signed-in user to their role home | none | none | `requestPasswordReset` |
| `/auth/confirm` (RC) | public | URL `?email=` | none | `resendConfirmationEmail` |
| `/auth/reset-password` (RC) | needs a session for the action to succeed | URL `?reason=invite` (copy only) | none | `updatePassword` |
| `/onboarding` (RSC + RC form) | client | `requireRole`: `profiles(id, role, company_id, full_name)` eq id, single | none directly | `onboardClientCompany` |

- **`/login/*`. Edge:** `?next=` fails `safeNextForPortal` (wrong portal prefix, off-site, malformed). Consequence: it is dropped without a message and the user lands on their role home, not the page an email link pointed at (`components/auth/PortalLoginForm.jsx#PortalLoginForm`).
- **`/login/*`. Edge:** the account's role does not match the portal. Consequence: `signIn` signs the user out and redirects to `<portal.login>?error=portal`; the form shows "This account cannot sign in to this portal." for any `?error=` value except `configuration` (`app/auth/actions.js#signIn`).
- **`/signup`. Edge:** `confirmPassword` is checked only in the browser. Trigger: a direct POST to the action. Consequence: the action never reads it, so mismatched passwords pass (`app/signup/page.jsx#handleSubmit`, `app/auth/actions.js#signUp`). The server-side password rule is UNVERIFIED (inputs say `minLength={6}`).
- **`/auth/confirm`. Edge:** the address travels in the URL (history, referrer). Trigger: anyone opens `/auth/confirm?email=<address>` and presses Resend. Consequence: a confirmation email is attempted for that address; the action reports success even when throttled (5 per 10 minutes), so the page cannot tell the visitor a resend was suppressed (`app/auth/confirm/page.jsx#ConfirmContent`, `app/auth/actions.js#resendConfirmationEmail`).
- **`/auth/confirm`. Edge:** the "continue to dashboard" link needs a session. Trigger: the visitor verified in another browser or device. Consequence: middleware redirects to `/login/client?next=/dashboard`, not an error.
- **`/auth/reset-password`. Edge:** opened without a session (expired or reused link). Consequence: `updatePassword` calls `auth.updateUser` with no user and returns the auth error text (`app/auth/actions.js#updatePassword`); exact wording UNVERIFIED.
- **Forms built on `<form action={handler}>` with uncontrolled inputs** (`/signup`, `/forgot-password`, `/auth/reset-password`, `ClientOnboardingForm`, `PostForm`). **Edge:** the action returns an error. Consequence: if React 19 resets the form when the action ends, typed values are lost, and `isLoading` set inside the action may not disable the button until the action finishes (double-submit window). `PortalLoginForm` is controlled for exactly this reason (its own comment). UNVERIFIED in a browser.

### 2b. Client portal (role `client`)

| Route (render) | Data loaded | Data written | Actions called |
| --- | --- | --- | --- |
| `/dashboard` (RC) | `auth.getUser()`; `profiles.*` eq id single; `listProjectsForViewer` with a hard-coded `{ id, role: 'client', company_id }`: `projects` (13 columns) eq `company_id`, order `created_at` desc, `id` desc, no limit, then `project_assignments(project_id, user_id, created_at)` in project ids; then in `Promise.allSettled`: `listDraftBriefs` (`project_briefs`, 12 columns, `status = draft`, order `updated_at` desc, limit 50), `submittedBriefTypesByProject` (`project_id, brief_type`, in project ids, `status = submitted`), `listNotifications` (`notifications_outbox`, 10 columns, eq `user_id`, no limit, all projects), `getProjectManagerNames` (RPC `project_manager_names`) | none directly | `startBrief`, `deleteBriefDraft`, `createProject` (through `BriefSubmissionForm`) |
| `/dashboard/briefs/[id]` (RC) | `getUser`; `profiles(id, role, company_id)`; `getBrief` (`project_briefs` 12 columns eq id maybeSingle); `listProjectsForViewer` (for the attach-to-project select) | none directly | `saveBriefDraft`, `submitBrief` (through `BriefWizard`) |
| `/dashboard/projects/[id]` (RC) | `getUser`; `profiles.*`; `getProjectWorkspace` (8 queries for a client: projects, threads, status history, attachments `ready`, tasks, approvals, deliverables, profiles); `listNotifications` (all projects, filtered to this project in JS); `getProjectManagerNames([projectId])`. Child components load their own data: `ProjectBriefs` (`listProjectBriefs`), `ProjectThread` (`listProjectMessages`), `NotesPanel` (`project_status_history`) | none directly | `markNotificationsRead`, `startBrief` (ProjectBriefs), `postProjectNote`, thread actions (post, edit, reserve, finalize, download), `createAttachmentDownloadUrl` (ProjectFiles) |

- **`/dashboard`. Edge:** the secondary reads (drafts, brief types, notifications, manager names) run in `Promise.allSettled`. Trigger: one rejects, for example before migration 0043 or 0049 is applied. Consequence: that piece stays empty with no message; the project list still renders (`app/dashboard/page.jsx#loadClientProjects`).
- **`/dashboard`. Edge:** a client with many projects. Trigger: `.in('project_id', ids)` for brief types and the RPC call with every project id. Consequence: the request URL grows about 40 bytes per id; past the proxy or PostgREST URL limit the call fails and `allSettled` hides it, so brief-type chips and manager names silently vanish. The threshold is UNVERIFIED.
- **`/dashboard`. Edge:** the unread badges count notifications for every project the client has, unbounded, then group by `project_id` in JS (`listNotifications` has no limit).
- **`/dashboard/briefs/[id]`. Edge:** the profile read ignores `error`. Trigger: a transient read failure. Consequence: `profile` is undefined, the page redirects to `/onboarding`, and `/onboarding` sends a client who already has a company straight back to `/dashboard`: a silent detour, not an error (`app/dashboard/briefs/[id]/page.jsx#ClientBriefPage`).
- **`/dashboard/briefs/[id]`. Edge:** the same draft open in two tabs. Consequence: each tab autosaves its full `answers` object, `saveBriefDraft` replaces the column, and there is no version check, so the last save wins (section 8c).
- **`/dashboard/projects/[id]`. Edge:** every live status, task or approval event reruns the whole loader: `getUser` (a network call), a `profiles` read, about 8 workspace queries, the notifications list and the manager RPC. Trigger: any staff action on the project. Consequence: roughly a dozen requests per event per open viewer (`app/dashboard/projects/[id]/page.jsx#loadWorkspace`).
- **`/dashboard/projects/[id]`. Edge:** `loadWorkspace` never clears `error` once set. Trigger: one live-triggered reload fails (network blip). Consequence: the page switches to the full error branch and stays there even when the next live reload would succeed; only a navigation recovers it.
- **`/dashboard/projects/[id]`. Edge:** two loaders read `project_status_history`: the workspace (rendered as "Recent activity", last 5) and `NotesPanel` (rendered as "Project Updates", all rows). Trigger: a live status change. Consequence: the workspace reloads, `NotesPanel` does not, so the two lists disagree until `NotesPanel` posts or the page reloads.
- **`/dashboard/projects/[id]`. Edge:** the project manager card is hidden when `getProjectManagerNames` reports `available: false` (RPC missing or failing), and shows "being assigned" when the RPC works and returns no name. The RPC filters `profile.role = 'project_manager'`, while the admin list's `loadPrimaryAssignees` takes the earliest assignment of any role. Trigger: the earliest assignee is an admin or a demoted user. Consequence: the client sees a different name, or "being assigned", from the one the admin list shows (`supabase/migrations/0049_project_manager_names.sql`, `lib/crm/projects.js#loadPrimaryAssignees`).
- **`/dashboard/projects/[id]`. Edge:** the Messages and Files tabs mark notifications read as soon as they are selected or a live refresh brings new ones in, with no check that the document is visible. Consequence: a client with the tab open in a background window clears the badge without reading. A failed `markNotificationsRead` is swallowed; the optimistic `read_at` stays until the next reload, when the row reappears unread and the effect retries.

### 2c. Team portal (role `project_manager`)

| Route (render) | Data loaded | Data written | Actions called |
| --- | --- | --- | --- |
| `/team` (RSC) | `requireRole` profile; server client `listProjectsForViewer`: `project_assignments(project_id)` eq `user_id` -> `projects` in ids -> primary assignees, `companies(id, name)`, `profiles` | none | none |
| `/team/projects/[id]` (RC) | `getUser`; `profiles.*`; `getProjectWorkspace` (PM path: assignment checked first, 11 queries); `ProjectBriefs`, `ProjectThread`, `NotesPanel` load their own data | none directly | `transitionProject`, `createProjectTask`, `createProjectDeliverable` + `publishDeliverable` (ProjectFiles), `updateProjectApproval`, thread and note actions |

- **`/team`. Edge:** a PM with no assignment rows gets `[]` before the `projects` query runs, so the page shows "You do not have any assigned projects yet." A PM unassigned from a project loses it from this list on the next request, but still holds an open realtime channel for it (section 6).
- **`/team/projects/[id]`. Edge:** a failed load and a failed action are now separate states. `error` (a failed `loadWorkspace`) still replaces the page with the error line and the "Back to Team" link; `actionError` (a rejected transition or task) shows beside the controls and keeps the workspace on screen. Transition and Add Task buttons are disabled while a call is pending (`isTransitioning`, `isAddingTask`), so a double click no longer sends a second, now-invalid transition (`app/team/projects/[id]/page.jsx#handleTransition`, plan item F4).
- **`/team/projects/[id]`. Edge:** a successful `loadWorkspace` now clears `error`. Trigger: one live-triggered reload fails, the next succeeds. Consequence: the page recovers by itself; between the two the whole workspace is replaced by the error line.
- **`/team/projects/[id]`. Edge:** the buttons offer every `ALLOWED_TRANSITIONS` target. Moving to terminal `cancelled` asks `window.confirm` first; every other move sends at once. The note is the fixed text "Status moved to <status>." with the default visibility `shared`, so clients see it in their activity list.
- **`/team/projects/[id]`, `/admin/projects/[id]`. Edge:** `ProjectOverview` receives `role` and its back link goes to `homeForRole(role)` (`/team` or `/admin`) instead of the client-only `/dashboard`; the label still reads "Back to Dashboard" (plan item F11, `components/crm/ProjectOverview.jsx#ProjectOverview`).
- **`/team/projects/[id]`. Edge:** the task form sends only title, due date, priority and client-visible. Status, description and assignee are never sent, so every task starts as `todo` with no assignee, and no UI can change a task afterwards (`updateProjectTask` has no caller).

### 2d. Admin: project delivery (role `admin`)

| Route (render) | Data loaded | Data written | Actions called |
| --- | --- | --- | --- |
| `/admin` (RC) | `getUser`; `profiles(id, role, company_id)`; `listProjectsForViewer` (admin: every project, unbounded, used only to count open projects and projects with no manager); `count exact, head` on `companies`, `contacts`, `deals`, `tasks` | none | `signOut` |
| `/admin/projects` (RC) | `getUser`; `profiles.*`; `listProjectsForViewer` (all, unbounded, with `company` and primary `assignee`); status, search and `?pm=none` filters in JS | none | none |
| `/admin/projects/[id]` (RC) | `getUser`; `profiles.*`; `getProjectWorkspace` (admin: no assignment check, 10 queries); `LeadManagerCard` calls `listProjectManagerCandidates`; `ProjectBriefs`, `ProjectThread`, `NotesPanel` load their own data | none directly | `transitionProject`, `setLeadProjectManager`, `removeProjectAssignment`, `createProjectDeliverable` + `publishDeliverable`, `updateProjectApproval`, thread and note actions |

- **`/admin`. Edge:** each of the four counts is now `null` when its query returned an `error` or no count (`countOf`). Trigger: an RLS denial or network error on one table. Consequence: that card shows a dash with a screen-reader "Unavailable", and one alert reads "Some counts are unavailable right now. Reload to try again."; it no longer shows a false 0 (`app/admin/page.jsx#countDisplay`, plan item F6). The "Open projects" card was already a dash until `listProjectsForViewer` resolved.
- **`/admin`. Edge:** the profile read ignores its error. Trigger: transient failure. Consequence: `role` becomes null, `isAdmin` is false, and the page renders without the admin cards even though the layout accepted the session.
- **`/admin/projects/[id]`. Edge:** the failure handling, pending state and cancelled confirmation match the team page (`actionError`, `isTransitioning`, `window.confirm` before `cancelled`).
- **`/admin/projects/[id]`. Edge:** the admin transition sends visibility `shared` explicitly and the note "Status moved to <status> by admin.". Consequence: clients read the word "admin" in their activity list, while the actor name falls back to "CD Sportswear team" because a client cannot read the admin's profile (`components/crm/ProjectTimeline.jsx#ProjectTimeline`).
- **`/admin/projects/[id]`. Edge:** `LeadManagerCard` loads candidates once on mount and again after each assignment change. Remove has no confirmation and is allowed on the lead and on additional managers; removing the only manager returns the project to "Needs a manager" without moving its status back.
- **`/admin/projects`. Edge:** `?pm=none` is read once on mount, so a link opened while the page is already mounted does not change the filter.

### 2e. Admin: direct-table CRM

All pages below are RC, admin only, and use the browser client with RLS as the only guard.

| Route | Data loaded | Data written |
| --- | --- | --- |
| `/admin/companies` | `companies.*`, order `created_at` desc, no limit | none |
| `/admin/companies/new` | `useUserRole` -> `profiles(role)` | INSERT `companies` |
| `/admin/companies/[id]` | `companies.*` eq id single; `EntityNotes(companyId)` | DELETE `companies`; INSERT `notes` (EntityNotes) |
| `/admin/companies/[id]/edit` | `companies.*` eq id single | UPDATE `companies` |
| `/admin/contacts` | `contacts.*, companies(name)`, order `created_at` desc, no limit | none |
| `/admin/contacts/new` | `companies(id, name)` order name | INSERT `contacts` |
| `/admin/contacts/[id]` | `contacts.*, companies(name)` eq id single; `EntityNotes(companyId, contactId)` | DELETE `contacts`; INSERT `notes` |
| `/admin/contacts/[id]/edit` | `companies(id, name)`; `contacts.*` eq id single | UPDATE `contacts` |
| `/admin/deals` | `deals.*, companies(name)`, order `created_at` desc, no limit | none |
| `/admin/deals/pipeline` | same as the list | UPDATE `deals.stage` (optimistic) |
| `/admin/deals/new` | `companies(id, name)`; `contacts(id, first_name, last_name)` eq `company_id` on every company change | INSERT `deals` |
| `/admin/deals/[id]` | `deals.*, companies(name), contacts(first_name, last_name)` eq id single; `profiles(full_name)` eq `owner_id`; `projects(id)` eq `source_deal_id` maybeSingle; `auth.getUser()` then `profiles.*` (the viewer, for the thread); when a project exists: `NotesPanel`, `ProjectThread` | DELETE `deals`; thread and note actions |
| `/admin/deals/[id]/edit` | `deals.*`; `companies(id, name)`; `profiles(id, full_name)` eq `role = project_manager`; `contacts` by company | UPDATE `deals` |
| `/admin/tasks` | `tasks.*, companies(name)`, order `due_date` asc nulls last, no limit | none |
| `/admin/tasks/new` | `companies(id, name)`; `contacts(...)` and `deals(id, title)` by company, errors ignored | INSERT `tasks` |
| `/admin/tasks/[id]` | `tasks.*, companies(name), deals(title), contacts(first_name, last_name)` eq id single | DELETE `tasks` |
| `/admin/tasks/[id]/edit` | `companies(id, name)`; `tasks.*` eq id single; `contacts` and `deals` by company | UPDATE `tasks` |

- **`/admin/companies/[id]`. Edge:** delete. Trigger: the company has projects. Consequence: `projects.company_id` has no `ON DELETE` action (`0009_project_realtime_crm.sql`), so Postgres rejects the delete and the page shows the raw constraint error; the confirm text promises only that contacts, deals, tasks and notes cascade. UNVERIFIED against the live schema.
- **`/admin/deals/[id]`. Edge:** delete. Trigger: the deal already became a project. Consequence: `projects.source_deal_id` has no `ON DELETE` action, so the delete fails the same way. The Delete button is shown for every deal.
- **`/admin/contacts/[id]/edit`. Edge:** the company is changed. Trigger: `company_id` is updated. Consequence: existing `notes` keep the old `company_id`; `EntityNotes` filters on the contact's current company and its id, so those notes vanish from the contact page (rows remain). No migration in the repo moves them; UNVERIFIED on the live database.
- **`/admin/contacts/[id]`, `/admin/companies/[id]`. Edge:** the company page lists only notes with `contact_id IS NULL`, and the contact page only that contact's notes, so a note about a contact never appears on its company. Deal-scoped CRM `notes` (column `deal_id`) have no UI; the deal page's "Project Updates" panel is `project_status_history`, not `notes`.
- **`/admin/companies/[id]`, `/admin/contacts/[id]`. Edge:** `website` and `linkedin_url` are `type=text` inputs with no URL check and are rendered as `<a href>`. Trigger: a `javascript:` value is typed. Consequence: whether React 19 blocks it is UNVERIFIED; the writer is the admin.
- **`/admin/deals/new`, `/admin/deals/[id]/edit`, `/admin/tasks/new`, `/admin/tasks/[id]/edit`. Edge:** the contact and deal pickers refetch on every company change with no cancellation. Trigger: switching company twice quickly. Consequence: a slow response for the first company can overwrite the list for the second, offering contacts from the wrong company. The task pages ignore query errors entirely, so an RLS denial shows an empty picker with no message.
- **`/admin/deals/[id]/edit`. Edge:** `owner_id` is always sent from the select. Trigger: the `profiles` read for project managers fails (it is swallowed to `[]`). Consequence: the select offers only "Current owner (not a PM)", which keeps the existing value; the save still works.
- **`/admin/deals/[id]`. Edge:** the conversation panel renders only when a linked project exists and the viewer profile loaded; otherwise the page says the deal has not become a project, or asks the user to reload. Before plan item F1 the panel was passed `role` instead of `profile` and always errored.
- **`/admin/deals/pipeline`. Edge:** the Pipeline and Deals pages call `useUserRole` but do not wait for it, so `isAdmin` is false for the first render and the Add Deal button appears late.
- **`/admin/tasks`. Edge:** the list prints `task.due_date` raw (`YYYY-MM-DD`); the detail page formats it with a manual split; the project task list and the deal page now use `formatDateOnly` (`components/crm/taskUtils.mjs#formatDateOnly`). Three formats for the same kind of DATE column.
- **`/admin/tasks/[id]/edit`. Edge:** legacy rows hold `open` or `completed`. Trigger: opening the edit page and saving without touching status. Consequence: `normalizeTaskStatus` maps them to `todo` and `done` on load, so the save silently rewrites the stored status.

### 2f. Admin: users and blog

| Route (render) | Data loaded | Data written | Actions called |
| --- | --- | --- | --- |
| `/admin/users` (RC) | `useUserRole`; then `profiles(id, full_name, role, company_id, created_at, requested_staff_access)`, order `created_at` desc, no limit | none directly | `changeUserRole`, `resolveStaffRequest` (both optimistic) |
| `/admin/users/invite` (RC) | `useUserRole` | none directly | `inviteUser` |
| `/admin/blog` (RSC, `force-dynamic`) | `requireRole(['admin'])`; `listAllPosts({ limit: 100 })`: `blog_posts` summary columns, order `updated_at` desc, limit 100 | none | `setPostStatusAction`, `deletePostAction` (PostRowActions) |
| `/admin/blog/new` (RSC + `PostForm`) | `requireRole(['admin'])` | none | `createPostAction` |
| `/admin/blog/[id]` (RSC + `PostForm`) | `getPostById`: `blog_posts` 13 columns eq id maybeSingle | none | `updatePostAction` |

- **`/admin/users`, `/admin/users/invite`, `/admin/*/new`. Edge:** `useUserRole` now returns `error` next to `role`, with `ROLE_LOAD_ERROR` as the message. Trigger: the `profiles` read fails or throws. Consequence: the users, invite and company, contact, deal, task `new` pages skip the redirect and show "Unable to verify your permissions right now. Reload the page to try again." instead of bouncing a real admin to `/admin` (`lib/useUserRole.js#useUserRole`, plan item F6). The list pages that only read `isAdmin` to show or hide an Add button still treat a failed read as "not admin".
- **`/admin/users`. Edge:** optimistic updates restore a whole-list snapshot taken when the call started. Trigger: two role changes overlap and the first fails. Consequence: the rollback also reverts the second row's successful change in the UI until reload (section 8a).
- **`/admin/blog`. Edge:** the list is capped at 100 (`MAX_LIMIT`); post 101 and older are silently absent.
- **`/admin/blog/new`. Edge:** see A37 in section 4: what the form does after a successful create decides whether a second submit can duplicate the post.

### 2g. Layout gates (apply to every page above)

| Layout | Check | Redirect |
| --- | --- | --- |
| `app/admin/layout.jsx#AdminLayout` | `requireRole(['admin'])` | `/login/admin` |
| `app/dashboard/layout.jsx#DashboardLayout` | `requireRole(['client'])` | `/login/client` |
| `app/team/layout.jsx#TeamLayout` | `requireRole(['project_manager'])` | `/login/employee` |

- **Edge:** `getAuthenticatedProfile` returns null on a profile read error, so `requireRole` redirects to login. Trigger: a transient `profiles` failure on a full page load. Consequence: a signed-in admin, client or PM is sent to their portal login page; middleware does not move a matching-role user away from `/login/<portal>`, so they see the sign-in form until they sign in again or navigate back, with no data loss (`lib/auth/require-role.js#getAuthenticatedProfile`). Plan item F6 covered the client-side twin (`useUserRole`); this server-side path is unchanged.

## 3. Direct-table access (RLS is the only guard)

### 3a. Reads

All browser client unless noted. 45 call sites.

| # | Site | Table | Columns and embeds | Filter, order, limit |
| --- | --- | --- | --- | --- |
| R1 | `lib/useUserRole.js#useUserRole` | `profiles` | `role` | eq id = auth user, single. An error gives role `null` plus an `error` value (`ROLE_LOAD_ERROR` for pages that show it). |
| R2 | `app/admin/page.jsx#AdminDashboard` | `profiles` | `id, role, company_id` | eq id, single; error ignored |
| R3 | `app/admin/page.jsx#AdminDashboard` | `companies`, `contacts`, `deals`, `tasks` (4 calls) | `id`, count exact, head | none; an `error` or a missing count becomes `null` (shown as a dash) |
| R4 | `/dashboard`, `/dashboard/projects/[id]`, `/team/projects/[id]`, `/admin/projects`, `/admin/projects/[id]`, `/admin/deals/[id]` (viewer) | `profiles` | `*` | eq id = auth user, single |
| R5 | `app/dashboard/briefs/[id]/page.jsx#ClientBriefPage` | `profiles` | `id, role, company_id` | eq id, single; error ignored |
| R6 | `/admin/companies` | `companies` | `*` | order `created_at` desc; no limit |
| R7 | `/admin/companies/[id]`, `/admin/companies/[id]/edit` | `companies` | `*` | eq id (URL), single |
| R8 | `/admin/contacts/new`, `/admin/contacts/[id]/edit`, `/admin/deals/new`, `/admin/deals/[id]/edit`, `/admin/tasks/new`, `/admin/tasks/[id]/edit` | `companies` | `id, name` | order name; no limit |
| R9 | `/admin/contacts` | `contacts` | `*, companies(name)` | order `created_at` desc; no limit |
| R10 | `/admin/contacts/[id]` | `contacts` | `*, companies(name)` | eq id, single |
| R11 | `/admin/contacts/[id]/edit` | `contacts` | `*` | eq id, single |
| R12 | `/admin/deals/new`, `/admin/deals/[id]/edit`, `/admin/tasks/new`, `/admin/tasks/[id]/edit` | `contacts` | `id, first_name, last_name` | eq `company_id`; order `first_name` |
| R13 | `/admin/deals`, `/admin/deals/pipeline` | `deals` | `*, companies(name)` | order `created_at` desc; no limit |
| R14 | `/admin/deals/[id]` | `deals` | `*, companies(name), contacts(first_name, last_name)` | eq id, single |
| R15 | `/admin/deals/[id]` | `profiles` | `full_name` | eq id = `deal.owner_id`, single; error ignored |
| R16 | `/admin/deals/[id]` | `projects` | `id` | eq `source_deal_id` = URL id, maybeSingle |
| R17 | `/admin/deals/[id]/edit` | `deals` | `*` | eq id, single |
| R18 | `/admin/deals/[id]/edit` | `profiles` | `id, full_name` | eq `role = project_manager`; order `full_name`; error becomes `[]` |
| R19 | `/admin/tasks/new`, `/admin/tasks/[id]/edit` | `deals` | `id, title` | eq `company_id`; order title; error ignored |
| R20 | `/admin/tasks` | `tasks` | `*, companies(name)` | order `due_date` asc nulls last; no limit |
| R21 | `/admin/tasks/[id]` | `tasks` | `*, companies(name), deals(title), contacts(first_name, last_name)` | eq id, single |
| R22 | `/admin/tasks/[id]/edit` | `tasks` | `*` | eq id, single |
| R23 | `app/admin/users/page.jsx#UsersPage` | `profiles` | `id, full_name, role, company_id, created_at, requested_staff_access` | order `created_at` desc; no limit; only after `useUserRole` says admin |
| R24 | `components/crm/NotesPanel.jsx#NotesPanel` | `project_status_history` | `*, profiles(full_name)` (FK `changed_by`) | eq `project_id`; order `created_at` desc; no limit; no JS visibility filter |
| R25 | `components/crm/EntityNotes.jsx#EntityNotes` | `notes` | `*` | eq `company_id`; `contact_id = X` or `IS NULL`; order `created_at` desc; no limit |
| R26 | `components/crm/EntityNotes.jsx#EntityNotes` | `profiles` | `id, full_name` | in author ids |

Rows R3, R4, R7, R8, R12, R13 and R19 each cover several call sites, which is how 26 rows give 45 call sites.

- **Edge:** every list in R6, R9, R13, R20, R23, R24, R25 is unbounded. Trigger: a large table. Consequence: the full table is sent to the browser on each page load; there is no pagination or search server-side.
- **R2, R5, R15 (error ignored).** **Edge:** an RLS denial or transient failure returns `data: null` with `error` set and the page continues with missing data (`role` null, owner "—", or a redirect to `/onboarding`).
- **R24. Edge:** `NotesPanel` shows `project_status_history` rows with no `visibility` filter in JavaScript, so a staff viewer sees internal and shared rows with no indicator, and a client sees only what RLS returns. It is safe only while RLS holds (`supabase/migrations/0009_project_realtime_crm.sql`).

### 3b. Writes

All from admin-only screens. 14 call sites: 5 inserts, 5 updates, 4 deletes, no upserts. Updates and deletes attach `.select()` or `{ count: 'exact' }` so a zero-row RLS rejection is reported as an error; inserts return the row with `.select().single()` (the notes insert returns nothing).

| # | Site | Operation | Fields, and where each value comes from |
| --- | --- | --- | --- |
| W1 | `app/admin/companies/new/page.jsx#handleSubmit` | INSERT `companies` | `name` typed (required); `email` typed (required, `type=email`); `phone`, `website`, `industry` typed or null (`website` is `type=text`); `employee_count` `Number()` or null; `created_by` = `auth.getUser().id` |
| W2 | `app/admin/companies/[id]/edit/page.jsx#handleSubmit` | UPDATE `companies` eq id (URL) | same fields minus `created_by`; no `updated_at` guard |
| W3 | `app/admin/companies/[id]/page.jsx#handleDelete` | DELETE `companies` eq id (URL) | none |
| W4 | `app/admin/contacts/new/page.jsx#handleSubmit` | INSERT `contacts` | `company_id` from the select (required); `first_name`, `last_name`, `email` typed; `phone`, `title`, `linkedin_url` typed or null; `status` from the select (`lead`, `prospect`, `customer`, `inactive`); `created_by` = auth user id |
| W5 | `app/admin/contacts/[id]/edit/page.jsx#handleSubmit` | UPDATE `contacts` eq id (URL) | same fields minus `created_by` |
| W6 | `app/admin/contacts/[id]/page.jsx#handleDelete` | DELETE `contacts` eq id (URL), `count: exact` | none |
| W7 | `app/admin/deals/new/page.jsx#handleSubmit` | INSERT `deals` | `company_id` select (JS re-check); `contact_id` select or null; `title`; `description` or null; `value` `Number()` or null; `stage` select; `probability` `Number()` or 0; `expected_close_date` or null; `project_type` select (`PROJECT_CATEGORIES`) or null; `owner_id` = auth user id (the admin) |
| W8 | `app/admin/deals/[id]/edit/page.jsx#handleSubmit` | UPDATE `deals` eq id (URL) | same as W7 with `owner_id` from the Assigned Project Manager select, prefilled with the current owner |
| W9 | `app/admin/deals/pipeline/page.jsx#handleStageChange` | UPDATE `deals` eq id (card) | `stage` from the card's select; optimistic |
| W10 | `app/admin/deals/[id]/page.jsx#handleDelete` | DELETE `deals` eq id (URL) | none |
| W11 | `app/admin/tasks/new/page.jsx#handleSubmit` | INSERT `tasks` | `company_id` select; `deal_id`, `contact_id` selects or null; `title`; `description` or null; `status` select (first offered option); `priority` select; `due_date` or null; `assigned_to` = auth user id (no assignee picker); `created_by` = auth user id |
| W12 | `app/admin/tasks/[id]/edit/page.jsx#handleSubmit` | UPDATE `tasks` eq id (URL) | `company_id`, `deal_id`, `contact_id`, `title`, `description`, `status`, `priority`, `due_date` |
| W13 | `app/admin/tasks/[id]/page.jsx#handleDelete` | DELETE `tasks` eq id (URL), `count: exact` | none |
| W14 | `components/crm/EntityNotes.jsx#handleSubmit` | INSERT `notes` | `company_id` and `contact_id` from props (contact null on the company page); `content` typed (trimmed, no `maxLength`); `visibility` hard-coded `'internal'`; `created_by` = auth user id |

- **W1, W4, W7, W11, W14. Edge:** `created_by`, `owner_id` and `assigned_to` come from `auth.getUser()` in the browser. Whether RLS pins them to `auth.uid()` is for `01b-database-logic.md`; the UI offers no way to set another user except W8's owner select.
- **W2, W5, W8, W12. Edge:** no `updated_at` or version in the payload. Trigger: two admins edit the same row. Consequence: last write wins, with no conflict message.
- **W9 and the users page. Edge:** optimistic whole-list rollback (section 8a).
- **W11. Edge:** every task is assigned to the admin who created it; the task list has no assignee column, so assignment is invisible in the UI.
- **W14. Edge:** the DB constraint allows `visibility` in (`internal`, `client`) and clients read `client` rows; the UI never writes `client`, so no CRM note reaches a client.
- **No UUID validation on any `[id]` write.** **Edge:** a malformed id in the URL reaches `.eq('id', id)` and returns Postgres `22P02` text as the page error.

## 4. Server-action calls from the UI

Source key for fields: **T** typed by the user, **H** hidden input or hard-coded constant, **D** derived from loaded state or a file. 39 call sites, 34 distinct actions. Action internals are in `02-entry-points.md`.

| # | Caller | Action | Fields passed | After the call |
| --- | --- | --- | --- | --- |
| A1 | `components/auth/PortalLoginForm.jsx#handleSubmit` | `signIn` | `portal` H (from `portal.login`); `next` H (from `?next=` via `safeNextForPortal`, omitted when invalid); `email` T (controlled); `password` T | redirect is the success path; an error result is focused |
| A2 | `app/signup/page.jsx#handleSubmit` | `signUp` | `accountType` T (radio `client` or `employee`); `fullName`, `email`, `password` T; `confirmPassword` T (compared in the browser, not read by the action) | redirect to `/auth/confirm?email=` |
| A3 | `app/forgot-password/page.jsx#handleSubmit` | `requestPasswordReset` | `email` T | shows "sent" |
| A4 | `app/auth/confirm/page.jsx#handleResend` | `resendConfirmationEmail` | `email` D (from `?email=`) | an error result or a thrown call sets state `error` and shows "We couldn't resend the email. Check your connection and try again."; success shows "sent again" |
| A5 | `app/auth/reset-password/page.jsx#handleSubmit` | `updatePassword` | `password` T; `confirmPassword` T (browser only) | redirect to the role home |
| A6 | `components/crm/WorkspaceShell.jsx#WorkspaceShell` | `signOut` | none (form action) | redirect `/login` |
| A7 | `app/admin/page.jsx#AdminDashboard` | `signOut` | none (form action) | redirect `/login` |
| A8 | `components/crm/ClientOnboardingForm.jsx#handleSubmit` | `onboardClientCompany` | `companyName`, `contactName`, `phone` T (max 120, 120, 40) | redirect `/dashboard` (NEXT_REDIRECT rethrown) |
| A9 | `app/dashboard/page.jsx#handleStartBrief` | `startBrief` | `briefType` D (clicked card) | `router.push(/dashboard/briefs/{briefId})` |
| A10 | `app/dashboard/page.jsx#handleDeleteDraft` | `deleteBriefDraft` | `briefId` D (loaded draft), after `window.confirm` | removes the draft from local state; also removes it on `result.conflict` |
| A11 | `components/crm/ProjectBriefs.jsx#handleStart` | `startBrief` | `briefType` D; `projectId` D (prop) | push to the wizard |
| A12 | `components/crm/BriefWizard.jsx#flush` | `saveBriefDraft` | `briefId` D; `answers` D (`JSON.stringify(answersRef.current)`) | debounced autosave, section 8c |
| A13 | `components/crm/BriefWizard.jsx#handleSubmit` | `submitBrief` | `briefId` D; `destination` T (`attach` or `new`); attach: `projectId` T (select); new: `projectTitle` T or D `briefDisplayTitle()`, `targetDate` T or D `answers.deadline \|\| answers.start_date` | push `/dashboard/projects/{id}?brief=submitted` |
| A14 | `components/crm/BriefSubmissionForm.jsx#handleBriefSubmit` | `createProject` | `title`, `brief`, `targetDate`, `category` T | `onCreated` pushes to the project page |
| A15 | `app/team/projects/[id]/page.jsx#handleTransition` | `transitionProject` | `projectId`, `fromStatus` D (loaded workspace); `toStatus` D (button); `note` D ("Status moved to X."); `visibility` not sent (action default `shared`) | `window.confirm` first when `toStatus` is `cancelled`; buttons disabled while pending; `loadWorkspace()`; a failure shows in `actionError` beside the buttons |
| A16 | `app/admin/projects/[id]/page.jsx#handleTransition` | `transitionProject` | as A15 plus `visibility` H `'shared'`; `note` D ("Status moved to X by admin.") | same as A15 |
| A17 | `app/team/projects/[id]/page.jsx#handleAddTask` | `createProjectTask` | `projectId` D; `title` T; `dueDate` T (omitted when empty); `priority` T; `clientVisible` T (checkbox as `'true'` or `'false'`). Status, description, assignee never sent. | button disabled while pending; `form.reset()`, `loadWorkspace()`; a failure shows in `actionError` |
| A18 | `components/crm/LeadManagerCard.jsx#loadCandidates` | `listProjectManagerCandidates` | none | candidate list (name, open-project count) |
| A19 | `components/crm/LeadManagerCard.jsx#handleAssign` | `setLeadProjectManager` | `projectId` D; `userId` T (picked button) | notice built from `result.data.{notified, movedToPlanned, warnings}`; `onChanged()` |
| A20 | `components/crm/LeadManagerCard.jsx#handleRemove` | `removeProjectAssignment` | `projectId` D; `userId` D (row) | `onChanged()`; no confirmation |
| A21 | `components/crm/ProjectFiles.jsx#handleUpload` | `createProjectDeliverable` | `projectId` D; `title` D (`file.name`); `fileName`, `mimeType` D (`file.type` or `application/octet-stream`), `sizeBytes` D; `visibility` not sent | then storage upload, then A22 |
| A22 | `components/crm/ProjectFiles.jsx#handleUpload` | `publishDeliverable` | `projectId`; `deliverableId` D (reserve result); `status` H `'submitted'` | `onChanged()` |
| A23 | `components/crm/ProjectFiles.jsx#handleDownload` | `createAttachmentDownloadUrl` | `projectId`; `assetId` D (row); `kind` D (`attachment` or `deliverable`) | `window.open(signedUrl)` |
| A24 | `components/crm/useProjectThread.js#handleDownload` | `createAttachmentDownloadUrl` | `projectId`; `assetId` D; `kind` H `'attachment'` | `window.open(signedUrl)` |
| A25 | `components/crm/ProjectApprovals.jsx#decide` | `updateProjectApproval` | `projectId`, `approvalId` D; `status` H (`approved` or `rejected` by button) | `onChanged()`; rendered with `canDecide` only on team and admin project pages |
| A26 | `components/crm/NotificationsPanel.jsx#markRead` | `markNotificationsRead` | `notificationId` D (one, or every unread id) | local read set updated only when `ok`; a not-ok result or a thrown call shows an inline status line and leaves the items unread |
| A27 | `app/dashboard/projects/[id]/page.jsx#ClientProjectPage` | `markNotificationsRead` | `notificationId` D (unread ids mapped to the open Messages or Files tab) | optimistic `read_at`; failure swallowed |
| A28 | `components/crm/NotesPanel.jsx#handleSubmit` | `postProjectNote` | `projectId` D; `note` T (trimmed); `visibility` not sent | `load()` |
| A29 | `components/crm/useProjectThread.js#handleSend` | `postProjectMessage` | `projectId` D; `body` T (trimmed); `clientGeneratedId` D (`crypto.randomUUID()`, kept across retries, reset on success); `attachmentIds` D (staged files with status `ready`); `visibility` not sent | `load()` |
| A30 | `components/crm/useProjectThread.js#handleSaveEdit` | `editProjectMessage` | `projectId`, `messageId` D; `body` T | `load()` |
| A31 | `components/crm/useProjectThread.js#handleFileChange` | `reserveAttachment` | `projectId` D; `fileName`, `mimeType` D, `sizeBytes` D; `visibility` not sent | storage upload |
| A32 | `components/crm/useProjectThread.js#handleFileChange` | `finalizeAttachment` | `projectId`, `attachmentId` D | staged status `ready` |
| A33 | `components/crm/useProjectThread.js#retryStagedAttachment` | `finalizeAttachment` | same as A32 | staged status `ready` |
| A34 | `app/admin/users/page.jsx#handleRoleChange` | `changeUserRole` | `userId` D; `role` T (select: `project_manager` or `client`) | optimistic |
| A35 | `app/admin/users/page.jsx#handleStaffRequest` | `resolveStaffRequest` | `userId` D; `decision` H (`approve` or `decline`) | optimistic |
| A36 | `app/admin/users/invite/page.jsx#handleSubmit` | `inviteUser` | `email`, `fullName` T; `role` T (select offers `project_manager` only) | redirect `/admin/users` |
| A37 | `app/admin/blog/PostForm.jsx#PostForm` | `createPostAction` or `updatePostAction` (the page passes one as a prop) | `id` H (edit only); `title`, `slug`, `excerpt`, `body`, `seoTitle`, `seoDescription`, `coverImageUrl`, `status` T | create: the action ends with `redirect('/admin/blog/{id}')`; update: "Saved." banner |
| A38 | `app/admin/blog/PostRowActions.jsx#toggleStatus` | `setPostStatusAction` | `id` D (row); `status` D (opposite of current) | server revalidates `/admin/blog` |
| A39 | `app/admin/blog/PostRowActions.jsx#remove` | `deletePostAction` | `id` D (row), after an in-page Confirm step | server revalidates `/admin/blog` |

**Exported actions with no UI caller:** `createProjectApproval`, `updateProjectTask`, `assignProject`, `enqueueNotification`. Read-model functions with no caller: `listProjectTasks`, `listProjectApprovals`, `listProjectDeliverables`.

- **A14. Edge:** the form marks only the title required, but `createProject` requires a brief of 1 to 5000 characters and a valid category, and a 3 to 120 character title. Trigger: submitting with those blank. Consequence: the action's message appears in the form banner; nothing is created.
- **A13. Edge:** `submitBrief` reads the answers stored in `project_briefs`, not the ones in the form post. Trigger: the forced flush before submit fails. Consequence: the wizard refuses to submit ("We could not save your latest answers") instead of submitting stale answers (`components/crm/BriefWizard.jsx#handleSubmit`).
- **A13. Edge:** the target date input shows `destination.targetDate || suggestedDate`. Trigger: the user clears the field while a deadline answer exists. Consequence: the field falls back to the suggested date and that is what is submitted; the date cannot be cleared.
- **A12/A13. Edge:** destination `attach` lists every project except `cancelled`. Trigger: attaching to a `delivered` project. Consequence: accepted; the server rejects only `cancelled` (`supabase/migrations/0043_project_briefs.sql`, `submit_project_brief`).
- **A15, A16. Edge:** the project status note is a fixed string with default or explicit `shared` visibility. Consequence: every status change adds a client-visible line; the UI cannot send an internal note.
- **A15, A16. Edge:** only `cancelled` is confirmed. Trigger: moving to `on_hold` or `delivered` by mis-click. Consequence: `on_hold` can be left again, but `delivered` is terminal and is applied at once with no confirmation.
- **All actions that omit `visibility` (A15, A21, A28, A29, A31). Edge:** the action default is `shared`. Consequence: no UI path creates an `internal` message, attachment, deliverable or note, so staff cannot keep private notes on a project, and the thread shows no visibility badge (`app/actions/project-actions.js`).
- **A21. Edge:** the browser sends `file.type`. Trigger: a browser reports an empty type for a valid `.docx`. Consequence: it becomes `application/octet-stream`, which the action rejects ("This file type is not supported."). The UI has no `accept` attribute and no size check, so type and size errors appear only after the reserve call.
- **A26, A27. Edge:** `markNotificationsRead` drops ids that are not UUIDs and rejects an empty list or a list with repeated ids (`invalid`); both callers send unique ids from loaded rows.
- **A29. Edge:** `clientGeneratedId` is the idempotency key (unique on `(sender_id, client_generated_id)`, `on conflict do nothing` in `0032_project_asset_lifecycle_hardening.sql`). Trigger: the post succeeds but the response is lost, the user presses Send again. Consequence: the retry reuses the same id and does not create a second message.
- **A37 create. Edge:** after a successful create the action redirects to `/admin/blog/{id}` (plan item F7), so the same form is now an update form for that row. Before F7 the new-post form stayed open showing "Saved." and a second submit hit the unique slug index ("That slug is already taken.") or, with a changed title, created a second post. A failed create returns `{ ok: false, error, fieldErrors }` and the page stays; whether React 19 clears the typed values is UNVERIFIED (section 2a).

## 5. Storage from the browser (bucket `project-files`)

The bucket is private. The storage policies accept only the reserved path, two folders deep: `{project_id}/{attachment_id}/{safe_filename}` for attachments and `{project_id}/{deliverable_id}/...` for deliverables (`0009_project_realtime_crm.sql`, `0013_project_notes_and_deliverables.sql`). The browser never lists, deletes or signs; it only uploads, and downloads go through `createAttachmentDownloadUrl`.

| Flow | Steps (site) | What a failure leaves |
| --- | --- | --- |
| Thread attachment | 1 `reserveAttachment` (RPC `reserve_project_attachment`, row `pending`, visibility `shared`) -> 2 `storage.upload(storagePath, file, { upsert: false })` -> 3 `finalizeAttachment` (row `ready`, checks the object exists) -> 4 `postProjectMessage` with `attachmentIds` links the row. All of steps 1 to 3 run when the file is picked, before Send (`components/crm/useProjectThread.js#handleFileChange`). | Fail at 1: nothing. Fail at 2: staged `failed`, `uploaded` false; the `pending` row stays. Fail at 3: staged `failed`, `uploaded` true; retry skips the upload and only finalizes. Tab closed after 1: `pending` row with no object. Tab closed after 3: `ready` row with `message_id` null. |
| Thread retry and remove | `retryStagedAttachment` re-uploads only when `uploaded` is false, then finalizes; `removeStagedAttachment` drops a `failed` entry from the staging list. The failure reason (the action's or storage's message) shows beside the file. Send is disabled with a hint while any staged file is `pending` or `failed` (`sendBlockedReason`). | The `File` lives only in React state; a reload loses it. |
| Deliverable upload | `createProjectDeliverable` (row `draft`) -> `storage.upload(storagePath, file)` -> `publishDeliverable('submitted')`; no retry (`components/crm/ProjectFiles.jsx#handleUpload`). | Fail after the first call: a `draft` row with no or partial object. |
| Download | `createAttachmentDownloadUrl` reads `project_attachments` (`status = ready`) or `project_deliverables` (`status <> draft`) under RLS, then `createSignedUrl(path, 60)`; the browser calls `window.open(signedUrl, '_blank', 'noopener,noreferrer')`. | Signed URL expires after 60 seconds. |
| Inline preview, thumbnails, browser delete | none | n/a |

Constraints enforced server-side only: allowed types PDF, DOCX, PNG, JPEG, plain text; 1 byte to 10 MiB; file name 1 to 255 characters (`app/actions/project-actions.js`). The reservation RPC allows up to 50 MiB, so the action is the tighter bound.

- **Edge:** a staged thread file is finalized before the message is sent. Trigger: the user picks a file, then abandons the message or reloads. Consequence: a `ready` attachment with `message_id` null stays on the project; the workspace attachment query has no `message_id` filter and the row is `shared`, so every participant, clients included, sees it in the Files panel. The cron cleanup deletes only stale `pending` rows (older than 24 hours), never `ready` ones (`0032_project_asset_lifecycle_hardening.sql`, `0048_durable_attachment_cleanup.sql`).
- **Edge:** a stored object whose upload response is lost. Trigger: the upload completes server-side but the browser sees an error. Consequence: the staged file is `failed` with `uploaded` false; retry calls `upload` again with `upsert: false` and the object already exists, so the retry fails again and the file can never finalize. The exits are Remove (drops the staged entry only; the `pending` row and its object are reclaimed by the cleanup job after 24 hours) or leaving the page. A `ready` file offers no Remove.
- **Edge:** the upload insert policy needs the attachment `pending` and `uploaded_by` = caller (`0009_project_realtime_crm.sql`, policy "Reservation owners can upload pending project files"). A retry after finalization is therefore rejected by RLS.
- **Edge:** an interrupted deliverable upload leaves a `draft` row. Trigger: the upload or publish call fails. Consequence: the workspace read model does not filter deliverables by status and deliverable RLS is visibility-only, so a client sees the draft's title with a Download button that always fails (`status <> draft` check in the action). Nothing cleans the row up.
- **Edge:** `window.open` runs after an `await`. Trigger: a popup blocker that requires a direct user gesture. Consequence: the new tab may be blocked and the UI shows no message because the call itself succeeded. UNVERIFIED in browsers.

## 6. Realtime and presence

One registry, two consumers, two private topics per project.

### 6a. Topics and events

| Topic | Who may join | Events broadcast to it | Source of the event |
| --- | --- | --- | --- |
| `project:<id>:shared` | any participant (`private.can_subscribe_project_topic`) | `project_message_created`, `project_message_updated` (shared messages); `project_status_changed`; `project_task_changed` (only tasks that are or were client-visible); `project_approval_changed` (project-level approvals, or approvals on shared deliverables); presence | triggers in `0009_project_realtime_crm.sql`, `0032_project_asset_lifecycle_hardening.sql`, `0050_realtime_project_updates_and_presence.sql` |
| `project:<id>:internal` | staff who can view internal records (`private.can_view_internal`) | internal messages; `project_status_changed`; every `project_task_changed` and `project_approval_changed` | same triggers |

Payloads carry identifiers only (`project_id`, plus `message_id`, `task_id` or `approval_id`, and for messages `visibility`). The UI treats an event as a signal to re-read through the RLS-protected read model, never as data to render. The browser cannot send broadcasts (no insert policy for `broadcast` on `realtime.messages`); it can only track presence (`0050`, policy "Project participants can track project presence"). The topic string is built by `projectTopic` in `lib/crm/projectRealtime.js`; `sharedProjectTopic` and `internalProjectTopic` in `lib/crm/project-contract.mjs` have no UI caller, so the format exists in three places (`projectTopic`, the contract helpers, the SQL).

### 6b. Consumers

| Consumer | Mounted by | Subscribes to | Events it acts on | Local state it updates |
| --- | --- | --- | --- | --- |
| `useProjectThread` (`components/crm/useProjectThread.js#useProjectThread`) | `ProjectThread` on `/dashboard/projects/[id]` (Messages tab), `/team/projects/[id]`, `/admin/projects/[id]`, and `/admin/deals/[id]` when a linked project exists and the viewer profile loaded | shared; plus internal when `profile.role` is not `client`; only after the thread id is known | `project_message_created`, `project_message_updated` (when `payload.project_id` equals the open project and `payload.visibility` equals the topic's visibility), and `resync` | `load()`: `userId`, `messages` (replaced with the newest 20), `nextCursor`, `threadId`, `isLoading`, `error` |
| `useProjectLive` (`components/crm/useProjectLive.js#useProjectLive`) | the three project pages | shared; plus internal for non-clients | all five events when `payload.project_id` equals the open project, plus `resync`; presence `sync` | events are collected in a Set and flushed after 250 ms to the page's `onChange(events)`; presence updates `viewers` |
| Page `onChange` | client project page | | workspace events (anything other than message events, including `resync`) | `loadWorkspace()`: `profile`, `workspace`, `notifications`, `manager`; a burst of only message events runs `refreshNotifications()` instead |
| Page `onChange` | team and admin project pages | | workspace events | `loadWorkspace()`: `profile`, `workspace`; message-only bursts are ignored (the thread reloads itself) |
| `ProjectPresence` | the three project pages (client page: inside the Overview tab panel) | | `viewers` | renders "Also here now: <names>"; null when empty; deliberately not a live region |

### 6c. Registry lifecycle (`lib/crm/projectRealtime.js#subscribeProjectTopics`)

| Step | Behaviour |
| --- | --- |
| Authorize | `await supabase.realtime.setAuth()` before any join, because a private join is authorised against the socket's JWT. On failure: `console.warn`, nothing subscribes, no retry until the hook's dependencies change. |
| Open | The first consumer of a topic creates `supabase.channel(topic, { config: { private: true } })`, registers handlers for the five broadcast events, adds a presence `sync` handler on `:shared` topics, and subscribes. The registry is a `Map` per supabase client in a `WeakMap`, so later consumers join the same channel object. |
| Join | First `SUBSCRIBED`: `joined = true`; the tracked presence payload is sent with `channel.track(...)`. Later `SUBSCRIBED` (after a drop): every listener receives the synthetic `resync` event, and presence is tracked again. `CHANNEL_ERROR` and `TIMED_OUT` are only `console.warn`ed. |
| Presence | `useProjectLive` passes `presence: { userId: profile.id, name: profile.full_name }`, tracked on the shared topic only. `uniqueViewers` drops the viewer's own id and de-duplicates by `userId`; a blank name becomes "Someone". |
| Ref counting | Each consumer increments `refs` per topic after auth. `release` decrements; the last consumer deletes the registry entry and calls `supabase.removeChannel`. |
| Teardown | The returned function sets `cancelled`, removes this consumer's listeners, clears its presence payload (`untrack` only if other consumers remain), then releases. Safe to call before the async auth finished (nothing is opened afterwards). `useProjectLive` also clears its debounce timer and `viewers`. |
| Missed events | The only recovery is `resync` after a re-join. There is no polling and no refetch on tab visibility. |

### 6d. Realtime edge cases

- **Edge:** the first join is not a resync. Trigger: another user posts or changes status between the initial `load()` and the first `SUBSCRIBED` (the thread subscribes only after its load finishes, plus an async `setAuth`). Consequence: that event is never delivered and nothing refetches, so the thread or workspace is stale until the next event or a reload.
- **Edge:** `resync` fires once per topic. Trigger: a staff viewer subscribed to both topics reconnects. Consequence: the thread calls `load()` twice (it does not debounce); the pages debounce through the `Set`.
- **Edge:** every message event replaces the list. Trigger: the user has pressed "Load older messages" and then any message event arrives. Consequence: `setMessages` replaces the list with the newest 20 and resets `nextCursor`, so older pages vanish and the scroll effect (`[messages.length]`) jumps to the end.
- **Edge:** the edit box lives inside the message list. Trigger: the message being edited falls out of the newest 20 after a live `load()`. Consequence: the editor disappears while `editingId` and the draft text stay in state.
- **Edge:** two workspace loads race. Trigger: a user transition awaits `loadWorkspace()` while a live event starts another. Consequence: there is no request token, so whichever response arrives last wins and an older response can overwrite a newer one until the next event.
- **Edge:** realtime events cover messages, status, tasks and approvals only. Files, deliverables, brief submissions, notes, notifications and every direct-table CRM screen never update live (the workspace reload does refresh files and deliverables as a side effect of any workspace event).
- **Edge:** a malformed or inaccessible project id in the URL. Trigger: `/team/projects/not-a-uuid`. Consequence: `useProjectLive` still runs once the profile loads, builds `project:not-a-uuid:shared` (no UUID check in `projectTopic`) and the join is denied by the policy regex; only a `console.warn` results.
- **Edge:** presence is visible across roles. Trigger: any admin or PM opens a client's project. Consequence: every client viewer sees their full name in "Also here now", including staff who are not assigned to the project; names only, no contact details, by design (`components/crm/useProjectLive.js`).
- **Edge:** messages inserted by a path with no `auth.uid()` (service role, cron). Consequence: `private.broadcast_project_message` returns without sending, so no live update. The status, task and approval triggers have no such guard.
- **Edge:** authorisation is evaluated when a channel joins. Trigger: a PM is removed from a project or a user is demoted while their tab is open. Consequence: they may keep receiving identifier-only signals and appear in presence until they reconnect; the follow-up read returns nothing under RLS. Supabase's caching of the join decision is UNVERIFIED here.
- **Edge:** the sender is a subscriber too. Consequence: posting a message calls `load()` explicitly and again when its own event arrives (two reads); expected from a server-side `realtime.send`, UNVERIFIED in a browser.
- **Edge:** publishing a deliverable, posting a project note, attaching a file and assigning a manager emit no event of their own (the only broadcast triggers are message created, message updated, status, task, approval). Trigger: staff publish a deliverable while the client has the project open. Consequence: the client's Files tab and badge update only on the next status, task or approval event, a reconnect, or a reload; the in-app notification row exists, but the client page re-reads notifications only after message events.
- **Edge:** the deal page mounts `ProjectThread` only. Consequence: it shows messages live, but has no presence, no workspace reload and a `NotesPanel` that never updates live.

## 7. Read-model contracts

### 7a. `lib/crm/project-contract.mjs`: constants to columns

| Export | Backed by | Rule or note |
| --- | --- | --- |
| `PROJECT_CATEGORIES` | `projects.category` CHECK; `deals.project_type` (through `lib/projectTypes.js`); `BriefSubmissionForm` select | five values; the labels are display text |
| `PROJECT_STATUSES` | `projects.status` CHECK; `project_status_history.from_status`, `to_status` | nine values |
| `ALLOWED_TRANSITIONS`, `canTransition` | `transition_project_status` RPC guards | the team and admin pages offer every target of the loaded status |
| `TERMINAL_PROJECT_STATUSES` | `delivered`, `cancelled` | `/admin` open-project count, needs-a-manager rule, assignment actions |
| `MESSAGE_VISIBILITIES` = `RECORD_VISIBILITIES` | `visibility` on `project_messages`, `project_attachments`, `project_status_history`, `project_deliverables` | clients read `shared` only |
| `canViewInternal`, `canPostVisibility` | action role checks | clients may post only `shared` |
| `TASK_STATUSES`, `TASK_PRIORITIES` | `project_tasks.status`, `project_tasks.priority`; also reused by the CRM `tasks` forms, whose columns are free text defaulting to `open`/`medium` | priority is three tiers since `0022` |
| `APPROVAL_STATUSES`, `APPROVAL_DECISION_STATUSES` | `project_approvals.status`; reviewer may set `approved` or `rejected` only | |
| `DELIVERABLE_STATUSES`, `DELIVERABLE_PUBLISH_STATUSES` | `project_deliverables.status`; publish may produce `submitted`, `approved`, `rejected` | |
| `ATTACHMENT_STATUSES` | `project_attachments.status` (`pending`, `ready`) | only `ready` rows are read |
| `PROJECT_BRIEF_MIN_LENGTH`, `PROJECT_BRIEF_MAX_LENGTH` | `projects.brief` (DB allows 1 to 10000; app caps at 5000) | `renderBriefSummary` may produce up to 10000 |
| `normalizeProjectTitle` | `projects.title` CHECK 3 to 120 | |
| `sharedProjectTopic`, `internalProjectTopic` | realtime topic strings | no UI caller |

### 7b. `lib/crm/projects.js`: output fields to source

| Output | Source | Transformation, role rule |
| --- | --- | --- |
| `project.{id, company_id, category, title, brief, status, target_date, budget_amount, currency, created_at, updated_at}` | `projects` (`PROJECT_FIELDS`, 13 columns) | `clientSafeProject` drops `source_deal_id` and `created_by` for clients; `budget_amount` and `currency` are shown to clients on purpose |
| `project.company` | `companies(id, name)` | staff only; never fetched for clients |
| `project.createdBy` | `profiles(id, full_name, avatar_url)` for `projects.created_by` | built from the raw project, so it reaches clients too; no current screen renders it |
| list `assignee` | earliest `project_assignments` row (`created_at` asc) -> `profiles` | any role; under client RLS the assignment read returns nothing, so `null` |
| `thread` | `project_threads` (`id, project_id, created_at`) eq `project_id` | a missing thread throws |
| `assignments[]` with `user`, `assignedBy` | `project_assignments` (5 columns) | `[]` for clients (query skipped) |
| `statusHistory[]` with `changedBy` | `project_status_history` (8 columns) | `sharedOnly` for clients |
| `attachments[]` with `uploadedBy` | `project_attachments` where `status = ready` | includes unlinked rows (`message_id` null); `sharedOnly` for clients |
| `tasks[]` with `createdBy`, `assignee` | `project_tasks` (13 columns) | `clientVisibleOnly` (`client_visible`) |
| `approvals[]` with `requestedBy`, `reviewedBy` | `project_approvals` (9 columns) | no JS filter; RLS `0041` hides approvals on internal deliverables from clients |
| `deliverables[]` with `createdBy` | `project_deliverables` (12 columns) | `sharedOnly`; no status filter, so drafts are included |
| thread `messages[]` with `sender`, `attachments[]` | `project_messages` (9 columns), newest first, keyset `(created_at, id)`, `limit` min(n, 100), UI asks 20; attachments: every `ready` attachment of the project, narrowed to the page's message ids in JS | `sharedOnly` for clients; `nextCursor` is computed from the raw page, not the filtered one |
| `listNotifications` rows | `notifications_outbox` (10 columns) eq `user_id` | RLS `0041` returns `in_app` rows only; `payload` is turned into text by `notificationText` |
| `getProjectManagerNames` | RPC `project_manager_names(p_project_ids)` | name only; `available: false` when the RPC errors |
| participant profiles | `profiles(id, full_name, avatar_url)` for every actor id | a profile hidden by RLS becomes `null` and the UI shows "Unknown" or "CD Sportswear team" |

- **Edge:** `getProjectWorkspace` returns `null` for a PM with no assignment and for a client whose company does not own the project. Trigger: a stale or guessed id. Consequence: the page shows "Project not found." with no distinction between "no access" and "does not exist".
- **Edge:** the per-page message attachment query fetches every ready attachment of the project and filters in JavaScript. Trigger: a project with many files. Consequence: that query grows with the project, not with the page of 20 messages.
- **Edge:** a message whose sender profile is hidden by `private.shares_project_with` shows "Unknown". Trigger: RLS on `profiles`. Consequence: sender names vanish for people the viewer does not share a project with.

### 7c. Briefs (`lib/crm/briefs.js`, `lib/crm/brief-templates.mjs`)

| Field | Source | Transformation, limits |
| --- | --- | --- |
| `project_briefs.{id, company_id, project_id, created_by, brief_type, title, answers, status, template_version, submitted_at, created_at, updated_at}` | `BRIEF_COLUMNS` | drafts reach only their author; submitted briefs reach project participants |
| `answers` (jsonb) | `saveBriefDraft` | `sanitizeBriefAnswers` keeps known fields only; text 200, url 500, textarea 3000 characters (input `maxLength`); JSON at most 56000 bytes (server) |
| progress bar | `stepProgress(type, answers)` | answered over total fields |
| display sections | `briefSections`, `formatAnswer` | skips empty answers |
| suggested project title | `briefDisplayTitle` | `"<Type> — <brand_name or business_name>"`, at most 120 characters |
| suggested target date | `answers.deadline` or `answers.start_date` | date fields |
| prefill | `prefillBriefAnswers` from `companies(name, website, industry)` | run inside `startBrief` (server), not by the page |
| `projects.brief` on submit | `renderBriefSummary` | plain text, at most 10000 characters |

### 7d. Blog (`lib/crm/blog.js`, `lib/crm/blog-contract.mjs`)

| Form field | Column | Limit or default |
| --- | --- | --- |
| `title` | `blog_posts.title` | 1 to 200 |
| `slug` | `slug` | derived from the title when blank; 80 characters; `^[a-z0-9]+(-[a-z0-9]+)*$`; unique index |
| `excerpt` | `excerpt` | 320; derived by `excerptFrom(body)` when blank |
| `body` | `body` | 1 to 100000; the form has no client maximum |
| `seoTitle`, `seoDescription` | `seo_title`, `seo_description` | 70, 200 |
| `coverImageUrl` | `cover_image_url` | https only (action) |
| `status` | `status` | `draft` or `published` |
| (action) profile id | `author_id` | not editable |
| (database) | `published_at` | set by a trigger, not by the app |

### 7e. Labels (`lib/crm/labels.mjs`)

Pure display mapping with no source table: `projectStatusLabel`, `projectStatusTone`, `projectStatusMeaning`, `projectStatusBadgeClass`, `projectCategoryLabel`, `taskStatusLabel`, `approvalStatusLabel`, `CLIENT_ACTION_STATUSES` (`client_review`). **Edge:** an unknown value falls back to the raw string with underscores replaced; the admin projects page deliberately keeps its own mechanical Title Case labels.

## 8. Client-side state

### 8a. Optimistic updates

| Site | Optimistic change | Rollback |
| --- | --- | --- |
| `app/admin/deals/pipeline/page.jsx#handleStageChange` | sets the card's `stage` at once; that card's select is disabled while saving | restores the whole-list snapshot taken at call time (`setDeals(previousDeals)`) |
| `app/admin/users/page.jsx#handleRoleChange`, `#handleStaffRequest` | sets the role, or clears `requested_staff_access` and sets `project_manager` on approve | restores the whole-list snapshot |
| `app/dashboard/projects/[id]/page.jsx#ClientProjectPage` | sets `read_at = now` on unread notifications for the open tab | none; a failure is swallowed |
| `components/crm/NotificationsPanel.jsx#markRead` | none; the local read set updates only when `ok` | n/a; a failed call shows an inline status message and the items stay unread |
| `app/dashboard/page.jsx#handleDeleteDraft` | none; the draft is removed after `ok` or on `conflict` | n/a |

- **Edge:** whole-list rollback. Trigger: call A fails after call B (another row) succeeded. Consequence: restoring A's snapshot also reverts B's success on screen; the database keeps B.

### 8b. Refetch and revalidation

| Screen | Refresh mechanism |
| --- | --- |
| Project pages (client, team, admin) | `loadWorkspace()` after each own action and after every live workspace event or reconnect; `ProjectFiles`, `ProjectApprovals`, `LeadManagerCard` call it through `onChanged` |
| `ProjectThread` | its own `load()` after send, edit, and on live message events |
| `NotesPanel`, `EntityNotes` | their own `load()` after a post; never on live events |
| `ProjectBriefs` | once on mount, never |
| Admin CRM forms | `router.push` to the detail page, which refetches on mount |
| `/team`, `/admin/blog*` (RSC) | `revalidatePath` from the actions |

### 8c. BriefWizard autosave (`components/crm/BriefWizard.jsx#flush`)

| Aspect | Behaviour |
| --- | --- |
| Source of truth | the local `answers` state, mirrored in `answersRef`; the server's sanitised copy is never read back into state |
| Trigger | each edit sets `dirty` and schedules `flush` after 900 ms; leaving a step also flushes |
| Concurrency | one request in flight; every caller awaits it; edits typed during the request get their own save |
| Failure | exponential backoff `900 ms * 2^failures`, capped at 60 s; a non-retryable result (`retryable === false`, RLS `42501` or check `23514`) sets `stopped` until the next edit |
| Unload | `beforeunload` warns when `dirty` or a save is in flight; unmount flushes pending edits |
| Submit | forces `dirty`, awaits `flush`, then calls `submitBrief`; a failed save blocks the submit |
| Save label | "Saving…", "Saved <time>", or the failure message |

- **Edge:** a hard tab close inside the 900 ms window, or after a non-retryable failure. Consequence: the unsaved edits are lost; `beforeunload` shows the browser's warning only for a normal navigation.
- **Edge:** a submitted brief opened for editing. Consequence: `saveBriefDraft` returns `submitted: true`; the page redirects submitted briefs that have a project to the project page.
- **Edge:** the project target date input cannot be cleared while a suggested date exists (section 4, A13).

### 8d. Browser storage

| Key | Writer | Reader | Value | Lifetime |
| --- | --- | --- | --- | --- |
| `localStorage` `cws.portal.tour.seen.v1` | `PortalTour#writeSeenKey` on Skip, Finish or Escape | `PortalTour#readSeenKey` on mount | ISO timestamp | per browser, not per user; cleared by "Replay tour" (`clearSeenKey`) |

No `sessionStorage` or IndexedDB in scope.

- **Edge:** the key is per browser. Trigger: a second client signs in on the same browser. Consequence: they never see the tour; a client on a fresh browser sees it again.
- **Edge:** storage unavailable (private mode). Consequence: every read or write is wrapped in `try/catch`; the tour opens on every `/dashboard` visit.
- **Edge:** "Replay tour" clears the key before the tour is finished. Trigger: the client navigates away mid-tour. Consequence: the key stays cleared and the tour opens again on the next visit.

### 8e. URL parameters carrying data

| Param | Page | Read at | Set by | Notes |
| --- | --- | --- | --- | --- |
| `next` | `/login/<portal>` | `PortalLoginForm` (`safeNextForPortal`) -> hidden `next` | middleware (`requestedPortalPath`) | an invalid value is dropped |
| `error` | `/login/<portal>` | `PortalLoginForm` | middleware, `signIn`, `requireRole` | any value except `configuration` shows the portal-mismatch text |
| `email` | `/auth/confirm` | `ConfirmContent` | `signUp` redirect | PII in the URL |
| `reason` | `/auth/reset-password` | `InviteAwareForm` | invite link, middleware | `invite` changes the copy only |
| `pm` | `/admin/projects` | once on mount | `/admin` card, assignment email | `none` presets the filter |
| `brief` | `/dashboard/projects/[id]` | once on mount, then removed with `history.replaceState` | `BriefWizard` after submit | `submitted` shows the received banner |
| `tab` | pages using `Tabs` | `Tabs` once on mount | `Tabs.writeUrl` (`replaceState`) | the first tab removes the param; other params survive |
| route `[id]` | all detail pages | `useParams` | links | not UUID-validated on direct-table pages |

### 8f. In-memory state lost on reload

| State | Where | Effect of a reload |
| --- | --- | --- |
| Staged thread attachments, including the `File` | `useProjectThread` | the list and the file are gone; `pending` and `ready` rows remain on the server |
| Unsent message draft | `useProjectThread` (`body`) | lost; it survives a tab switch because `Tabs` keeps every panel mounted |
| Message idempotency id | `messageAttemptIdRef` | regenerated; a retry after reload is a new message |
| Brief answers | server (`project_briefs.answers`) | kept, up to the last successful save |
| Admin form fields | page state | lost |

## 9. Corrections to the scoping inventory

The inventory (`scope/04-client-data-access.md`) was written against `95f02c8`. Corrections after reading the code at `1c17666` and the working tree:

| Inventory claim | Current finding |
| --- | --- |
| "Exactly one realtime subscription site: `useProjectThread`" | Two consumers (`useProjectThread`, `useProjectLive`) share one ref-counted registry (`lib/crm/projectRealtime.js`), carrying five broadcast events and presence on the shared topic. Topics are built by `projectTopic`, not inline. |
| Realtime events: message created and updated only | Also `project_status_changed`, `project_task_changed`, `project_approval_changed` (`0050`), plus a synthetic `resync` after a re-join. Status, task and approval changes now reload the workspace live. |
| "No reconnect handling" | `resync` is emitted on every re-join after the first; only the initial-join gap remains (section 6d). |
| "No `localStorage`" | `PortalTour` uses `localStorage` (`cws.portal.tour.seen.v1`). |
| Admin project page shows a hand-picked subset of transitions | It now shows every `ALLOWED_TRANSITIONS` target, so `on_hold` is no longer a dead end. |
| E16: project task due dates show the previous day west of UTC | True at `HEAD`; fixed in the working tree (F3, `formatDateOnly`). `ProjectOverview` already formatted `target_date` in UTC at `HEAD`. |
| E13: admin home counts show 0 on failure | True at `HEAD` for companies, contacts, deals, tasks (the "Open projects" card already showed a dash until loaded); fixed in the working tree (F6): a failed count is a dash plus an alert. |
| `listNotifications` used on the project page only | Also used by `/dashboard` for unread badges and by the live refresh on the project page. |
| No tabs, no manager card, no presence | Added: `Tabs` (`?tab=`), `ProjectManagerCard`, `ProjectPresence`, `PortalTour`, `lib/crm/labels.mjs`, RPC `project_manager_names`. |
| E19 "server behaviour UNVERIFIED" | Confirmed: `submit_project_brief` rejects only `cancelled`, so `delivered` projects accept new briefs. |
| E9 "no UI creates approvals" | Confirmed and sharper: `create_project_approval` (`0010`) is the only insert path in the migrations and `createProjectApproval` has no UI caller, so no code path produces an approval row; the Approve and Reject buttons can never render in practice. |
| Count: 44 reads | 45 reads: the deal page now also reads the viewer's profile (plan item F1). Writes unchanged at 14. |

Status of the inventory's edge cases, as read in the working tree (the fix-branch files are listed in section 10):

| Id | Topic | Status |
| --- | --- | --- |
| E1 | Deal conversation passed `role` not `profile` | fixed in the working tree (F1): the page loads the viewer profile, passes it, and shows a reload hint when the profile read fails |
| E2 | Every UI-created project record is `shared` | still true (section 4) |
| E3 | Thread attachments finalized before Send | still true (section 5) |
| E4 | A failed or pending staged file blocks Send silently | fixed in the working tree (F5): Send is disabled with a hint, the failure reason shows beside the file, a failed file can be retried or removed. A `ready` file still cannot be removed. |
| E5 | Interrupted deliverable upload leaves a visible draft | still true (section 5) |
| E6 | Realtime gaps | partly fixed (resync, workspace events); initial-join gap and list replacement remain |
| E7 | An action failure replaces the workspace | fixed in the working tree (F4): `actionError`, pending buttons, confirm before `cancelled`. A failed `loadWorkspace` still replaces the page until the next successful load. |
| E8 | CRM task status drift and overdue | fixed in the working tree (F2) |
| E9 | Missing collaboration UI | still true |
| E10 | Form validation weaker than the server | still true |
| E11 | Stale data and whole-list rollback | still true |
| E12 | Unbounded selects | still true |
| E13 | RLS denial shown as empty or zero | partly fixed (F6): admin counts show a dash, `useUserRole` exposes `error`. Lists still show "No X yet" on a denial; the `/admin` profile read and `getAuthenticatedProfile` still treat a read error as no role. |
| E14 | Uncontrolled React 19 forms | UNVERIFIED in a browser; F7 makes a successful new-post create redirect to the edit page, so the duplicate-submit half is addressed |
| E15 | Visibility filtering asymmetry | still true |
| E16 | Display bugs | project task due dates fixed (F3, `formatDateOnly`); the back link now follows the viewer's role (F11); the BriefWizard target date still cannot be cleared |
| E17 | Free-text URLs rendered as links | still true |
| E18 | Silent failures | resend-confirmation and mark-read now show a message (F8); the realtime `setAuth` failure and the deal owner-name lookup error remain silent |
| E20 | Notes placement | still true |
| (aside) | `ClientOnboardingForm` named "Crystal Web Solution" to clients | fixed in the working tree (F9): the copy uses `SITE.name` |

## 10. Unverified items and fix-branch status

UNVERIFIED:

1. Whether `createBrowserClient` returns one client per page (the registry assumes so; with two clients each consumer would open its own socket). Needs `@supabase/ssr` source.
2. React 19 form reset and double-submit behaviour on the uncontrolled forms (section 2a).
3. Whether `window.open` after an `await` is blocked (section 5).
4. Supabase Realtime caching of the join decision after a role change (section 6d).
5. The `.in(...)` URL-length threshold for large project lists (section 2b).
6. Whether `javascript:` hrefs on `company.website` and `contact.linkedin_url` are blocked by React 19.
7. Live-database state: foreign keys from `projects` to `companies` and `deals`, and whether a trigger moves `notes.company_id` when a contact changes company.
8. The exact server-side password rule behind `minLength={6}`.

Fix branch (`claude/funny-bardeen-i83gco`). The bug-fix agent edited these UI files while this chapter was written. The chapter describes them as they stood at the last check, 2026-10-01 19:55 UTC, when none had changed for eight minutes. Files differ from `HEAD` as follows.

| Plan item | UI files changed in the working tree |
| --- | --- |
| F1 | `app/admin/deals/[id]/page.jsx` |
| F2 | `app/admin/tasks/new/page.jsx`, `app/admin/tasks/[id]/edit/page.jsx`, `app/admin/tasks/page.jsx`, `app/admin/tasks/[id]/page.jsx`, new `components/crm/taskUtils.mjs` |
| F3 | `components/crm/ProjectTasks.jsx`, `components/crm/taskUtils.mjs` (`app/admin/deals/[id]/page.jsx` also uses `formatDateOnly`) |
| F4 | `app/team/projects/[id]/page.jsx`, `app/admin/projects/[id]/page.jsx` |
| F5 | `components/crm/useProjectThread.js`, `components/crm/ProjectThread.jsx` |
| F6 | `lib/useUserRole.js`, `app/admin/page.jsx`, `app/admin/users/page.jsx`, `app/admin/users/invite/page.jsx`, and the `new` pages for companies, contacts, deals and tasks |
| F7 | `app/actions/blog-actions.js` (server side; `PostForm` is unchanged) |
| F8 | `app/auth/confirm/page.jsx`, `components/crm/NotificationsPanel.jsx` |
| F9 | `components/crm/ClientOnboardingForm.jsx` |
| F11 | `components/crm/ProjectOverview.jsx`, with `role` passed by `app/team/projects/[id]/page.jsx` and `app/admin/projects/[id]/page.jsx` |

F10 changes server files (`lib/appUrl.mjs`, `app/auth/actions.js`, `app/admin/users/actions.js`, `lib/supabase/admin.js`) and is covered in `02-entry-points.md`.

## Counts

| Item | Count |
| --- | --- |
| Page routes | 39 (9 auth and entry, 3 client, 2 team, 25 admin) |
| Direct-table read call sites | 45 |
| Direct-table write call sites | 14 (5 insert, 5 update, 4 delete) |
| Server-action call sites | 39 across 34 distinct actions |
| Realtime | 2 private topics per project, 5 broadcast events plus presence, 2 consumers, 1 registry |
| Browser storage call sites | 3 `upload()` calls; 2 download call sites through `createAttachmentDownloadUrl`; 0 browser deletes |
| Browser storage keys | 1 `localStorage` key |
| Manifest `data/ui.json` | 95 nodes (39 page, 30 component, 26 lib) and 324 edges (148 reads, 62 calls, 39 submits, 37 redirects, 14 table writes, 8 gets, 7 delivers, 5 sets, 3 uploads, 1 broadcasts) |
