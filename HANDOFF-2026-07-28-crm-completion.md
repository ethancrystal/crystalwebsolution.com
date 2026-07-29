# Handoff — CRM completion, auth fix, project delivery lifecycle (July 28 2026)

Pushed to `main` on `https://github.com/ethancrystal/crystalwebsolution.com.git`. Also mirrored on `codex/contentful` where the two branches overlap (marketing nav, globals.css).

```bash
git clone https://github.com/ethancrystal/crystalwebsolution.com.git
cd crystalwebsolution.com
git checkout main   # CRM + full feature set lives here
```

## Commits from today (on `main`)

- `97187eb` feat: complete CRM admin CRUD, client portal, and project delivery lifecycle
- `efac2eb` feat: add Login/Sign up links to marketing nav (merged from `codex/contentful`)
- `88564f8` fix: stop swallowing Next.js's internal redirect signal in auth forms — **critical, see below**

Earlier same-day commits (marketing site fixes, merged in via `codex/contentful`): Approach connecting-path SVG fix (`e6fc09f`), Services/Hero/Footer cleanup (`6e401bf`), Mark shard-assembly animation, Contact button crop fix.

## What's live now

**CRM admin** (`/admin/*`, staff/admin only via middleware):
- Companies, Contacts, Deals — full CRUD (list/new/detail/edit/delete)
- Tasks — full CRUD, sorted by due date, overdue highlighting
- Deals Pipeline (`/admin/deals/pipeline`) — Kanban board, stage-select per card
- Notes panel (`components/crm/NotesPanel.jsx`) — wired into Companies/Contacts/Deals detail pages

**Client portal** (`/dashboard`, any authenticated user):
- Clients see their own company's projects (deals) and a "start a project" brief-submission form
- Brand-new clients with no company yet get a short company-setup step first (via `onboard_client_company` RPC), then the brief form
- `/dashboard/projects/[id]` — client-facing project detail page: status timeline (brief_submitted → in_progress → in_review → delivered), assigned project manager, and the shared conversation/file thread
- `components/crm/ProjectThread.jsx` — per-deal message thread + file upload/download, shared between the client project page and the admin deal detail page

**Marketing site nav**: `SITE.authNav` (Log in / Sign up) — compact link in the top bar, full entries in the fullscreen menu overlay.

## ⚠️ Migrations NOT applied to live Supabase yet

`supabase/migrations/0002_crm_security_hardening.sql` and `0003_project_delivery.sql` are written and committed but **have not been run against the live database**. Until they are:
- `deals.project_status`, `project_messages`, `project_files`, the `project-files` Storage bucket, and `onboard_client_company()` all reference schema that doesn't exist yet — the client portal (brief submission, thread, files, status timeline) will error on use.
- The `0002` RLS hardening (profile privilege-escalation fix, missing DELETE policies, tightened INSERT checks) is also not yet live.

Apply both via the Supabase MCP (`mcp__supabase__*`, needs OAuth — see `mcp__supabase__authenticate`) or the Supabase dashboard SQL editor, in order: `0001` (if not already applied) → `0002` → `0003`.

## Critical bug fixed today: auth forms were swallowing successful logins

`app/login/page.jsx`, `app/signup/page.jsx`, and `app/auth/reset-password/page.jsx` each wrap their server action call (`signIn`/`signUp`/`updatePassword`) in a try/catch. All three server actions call `next/navigation`'s `redirect()` on success, which works by **throwing** a special `NEXT_REDIRECT`-digest error for the framework to intercept. The catch blocks were treating that throw as a real failure and calling `setError(err.message)` — so **every successful sign-in, sign-up, and password reset was silently broken**, surfacing Next.js's generic "An error occurred in the Server Components render" message instead of redirecting.

Fix: each catch block now checks `err?.digest?.startsWith('NEXT_REDIRECT')` and re-throws before falling through to the generic error handler. Applied identically in both `main` (this repo) and `codex/contentful` (`C:\Users\moizjmj\Crystal Web Solution`, the separate marketing-site checkout that also carries copies of these auth pages).

**If you add more server actions that call `redirect()` and wrap them in a client-side try/catch, you need this same guard** — it's a general Next.js App Router footgun, not specific to this codebase.

## Repo topology (still relevant — see also CLAUDE.md)

- **This repo** (`crystalwebsolution.com`, `ethancrystal/crystalwebsolution.com` on GitHub) is the production site. `main` (deployed here) and `codex/contentful` (marketing-site source of truth, merged into `main` before each deploy) both matter.
- A *separate*, similarly-named repo (`Crystal-Web-Solution`, `ethancrystal/Crystal-Web-Solution`) exists with unrelated/stale branches — do not confuse the two. Always check `git remote -v` if unsure which checkout you're in.
- Deploys are done via `vercel deploy --prod --yes` from a checkout with `.vercel/repo.json` linked (run `vercel link --yes --project=crystalwebsolution-com` if missing), OR happen automatically via Vercel's GitHub integration on push to `main` — the latter has been the more reliable path this session; manual CLI deploys repeatedly stalled in an unresolved "Building…" state in this environment even though the underlying deploy succeeded. Check `vercel ls` / `vercel inspect <url>` and the actual aliases rather than trusting the CLI's local wait.
