# Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 findings confirmed during a multi-agent review of `preview` vs `main` (ahead of promoting `preview` -> `main` via PR #59): one real data-exposure bug in the CRM notification pipeline, two frontend correctness/perf bugs, two accessibility gaps, one dormant styling bug, and three housekeeping items (stray tracked files).

**Architecture:** One new migration (`0023`) fixing the notification-recipient security gap. Targeted edits to three existing components. Two `git rm` cleanups. No new tables, no new components, no schema redesign — every fix is the smallest change that closes the specific gap found.

**Tech Stack:** Next.js 15 App Router (plain JSX, no TypeScript), Supabase (Postgres/Auth/RLS), `node --test` + `node:assert/strict` for CRM contract tests (regex-over-source-text, this repo's established convention).

## Global Constraints

- Package manager is `pnpm` — never use `npm`/`yarn`.
- No TypeScript, no Tailwind.
- Never edit an already-applied migration file — this fix is a new migration (`0023`), not an edit to `0015`.
- Every migration is applied via the Supabase MCP `apply_migration` tool (project ref `wmnjosiikehsuaqucvja`) and verified with a direct query in the same session — never left applied-but-unverified.
- `pnpm test` and `pnpm build` must both pass after every task. One pre-existing, unrelated failure (`tests/crm/auth-portals.test.mjs`, a stale cookie-redirect-count assertion) is expected and out of scope — do not attempt to fix it here.
- `STATUS.md` gets a new dated session-update section recording what was found and fixed, in the same style as prior sessions' entries.

---

## Task 1: Migration `0023` — visibility-aware notification recipients (SECURITY)

**Confirmed bug:** `private.project_notification_recipients(p_project_id, p_exclude_user_id)` in `supabase/migrations/0015_project_notifications_and_message_editing.sql:33` returns the union of assigned staff (`project_assignments`) and every profile whose `company_id` matches the project (i.e. every client-side user) — with no awareness of message/deliverable visibility. `post_project_message`, `update_project_message`, and `publish_project_deliverable` all insert `notifications_outbox` rows (both `in_app` and `email` channels) for every one of those recipients regardless of `p_visibility`. Concretely: a staff member posts an `internal`-only message and the client company still receives an email containing a 200-character excerpt of it. The read path (`lib/crm/projects.js`'s `sharedOnly` filter) correctly hides internal messages in the UI — only the notification/email pipeline bypasses that filter.

**Files:**
- Create: `supabase/migrations/0023_visibility_aware_notification_recipients.sql`
- Test: `tests/crm/migration-0023-visibility-aware-notifications.test.mjs`

**Interfaces:**
- Produces: `private.project_notification_recipients(p_project_id uuid, p_exclude_user_id uuid, p_visibility text default 'shared'::text) returns table (user_id uuid)` — new optional third param. When `p_visibility = 'internal'`, returns only `project_assignments` rows (staff); when `'shared'` (or omitted, the default), returns the existing staff + client-company union unchanged.
- `post_project_message` and `update_project_message` pass their own `p_visibility` argument through to the recipient call.
- `publish_project_deliverable` passes `v_deliverable.visibility` (the deliverable's own visibility column, already read into `v_deliverable` earlier in the function) through to the recipient call.
- `transition_project_status` and `update_project_approval` are unaffected — status transitions and approval decisions have no `internal`/`shared` visibility concept and should keep notifying every recipient; do not add a visibility param to those two.

- [ ] **Step 1: Write the failing test**

```js
// tests/crm/migration-0023-visibility-aware-notifications.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0023_visibility_aware_notification_recipients.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('drops the old 2-arg project_notification_recipients signature before recreating it', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /drop function if exists private\.project_notification_recipients\(uuid,\s*uuid\)/i,
    'must drop the exact live 2-arg signature -- appending a trailing param creates a second overload instead of replacing it',
  );
});

test('project_notification_recipients gains a visibility param defaulting to shared', async () => {
  const sql = await readMigration();
  assert.match(sql, /p_visibility text default 'shared'::text/i);
});

test('internal visibility excludes client-company profiles, shared keeps the existing union', async () => {
  const sql = await readMigration();
  // The internal branch must select only from project_assignments, not join profiles by company_id.
  assert.match(sql, /if p_visibility = 'internal' then/i);
});

test('post_project_message and update_project_message forward p_visibility to the recipient call', async () => {
  const sql = await readMigration();
  const createOrReplaceBlocks = sql.split(/create or replace function/i).slice(1);
  const postMessage = createOrReplaceBlocks.find((b) => /public\.post_project_message/i.test(b));
  const updateMessage = createOrReplaceBlocks.find((b) => /public\.update_project_message/i.test(b));
  assert.ok(postMessage, 'post_project_message must be recreated in this migration');
  assert.ok(updateMessage, 'update_project_message must be recreated in this migration');
  assert.match(postMessage, /project_notification_recipients\([^)]*p_visibility[^)]*\)/i);
  assert.match(updateMessage, /project_notification_recipients\([^)]*p_visibility[^)]*\)/i);
});

test('publish_project_deliverable forwards the deliverable\'s own visibility to the recipient call', async () => {
  const sql = await readMigration();
  const createOrReplaceBlocks = sql.split(/create or replace function/i).slice(1);
  const publishDeliverable = createOrReplaceBlocks.find((b) => /public\.publish_project_deliverable/i.test(b));
  assert.ok(publishDeliverable, 'publish_project_deliverable must be recreated in this migration');
  assert.match(publishDeliverable, /project_notification_recipients\([^)]*v_deliverable\.visibility[^)]*\)/i);
});

test('grants stay locked down -- no bare execute-to-public regression', async () => {
  const sql = await readMigration();
  assert.doesNotMatch(sql, /grant execute on function[^;]*to public/i);
});
```

- [ ] **Step 2: Write the migration**

  - `drop function if exists private.project_notification_recipients(uuid, uuid);` then `create or replace function private.project_notification_recipients(p_project_id uuid, p_exclude_user_id uuid, p_visibility text default 'shared'::text) returns table (user_id uuid) ...` — when `p_visibility = 'internal'`, `select assignment.user_id from public.project_assignments as assignment where assignment.project_id = p_project_id and assignment.user_id <> p_exclude_user_id` only; otherwise (the `'shared'` default and any other value) keep the exact existing union query from `0015` unchanged.
  - `create or replace function public.post_project_message(...)` — identical body to `0015`'s version except the notification insert's `from private.project_notification_recipients(p_project_id, v_user_id) as recipient` becomes `from private.project_notification_recipients(p_project_id, v_user_id, p_visibility) as recipient`.
  - `create or replace function public.update_project_message(...)` — same one-line change, passing that function's own `p_visibility` param through.
  - `create or replace function public.publish_project_deliverable(...)` — same one-line change, passing `v_deliverable.visibility` (already fetched via `select * into v_deliverable from public.project_deliverables ... for update` earlier in the function) through.
  - Re-apply the same `revoke ... from public` / grant pattern this repo uses after every `drop function` + `create function` pair (see migration `0021` for the precedent this repo already hit this exact class of regression once).
  - Copy each function's full body from `0015` and `0015`'s later patches (`0016`, `0017`) verbatim except for the one changed line per function — do not restate logic from memory; read the live function source via the Supabase MCP `execute_sql`/`list_migrations` tools or the concatenated migration files to get the exact current body before editing.

  - Details: see "Confirmed bug" and "Interfaces" above.

- [ ] **Step 3: Apply and verify live**

  - Apply via the Supabase MCP `apply_migration` tool against project ref `wmnjosiikehsuaqucvja`.
  - Verify via `execute_sql`: confirm `pg_get_function_arguments` on `private.project_notification_recipients` shows the new 3-arg signature and the old 2-arg overload is gone (`\df private.project_notification_recipients` equivalent via `pg_proc`/`pg_get_function_identity_arguments`).
  - Verify via `execute_sql`: confirm `proacl` on all three recreated functions (`post_project_message`, `update_project_message`, `publish_project_deliverable`) does not include a bare `=X/postgres` (PUBLIC) grant — same check pattern used after migration `0021`.
  - Functional check: insert a test `internal`-visibility message on a project with both a staff assignment and a client-company profile (reuse or create disposable test rows the same way the Phase 1 CRM verification session did — see `STATUS.md`'s "Phase 1 CRM verification" section for the pattern), confirm `notifications_outbox` gains rows only for the staff `user_id`, not the client's.

- [ ] **Step 4: Run tests and build**

  - `pnpm test` — the new test file plus the full suite must pass (same one pre-existing `auth-portals` failure expected, nothing else).
  - `pnpm build` — must pass clean.

---

## Task 2: `ProjectThread.jsx` — stop churning the Realtime subscription on unrelated actions

**Confirmed bug:** `components/crm/ProjectThread.jsx:65`'s `load` `useCallback` depends on the whole `profile` prop object. The parent page (`app/team/projects/[id]/page.jsx` and its admin/dashboard equivalents) creates a brand-new `profile` object every time `loadWorkspace()` runs — including when it's called by unrelated actions like `ProjectFiles`'s `onChanged={loadWorkspace}` after a file upload. Every such call gives `load` a new identity, which re-runs the effect at line 77-95 (`deps: [threadId, load]`), tearing down and resubscribing the Supabase Realtime channel and re-fetching messages for no reason related to the thread itself.

**Files:**
- Modify: `components/crm/ProjectThread.jsx`
- Test: `tests/crm/project-thread-stable-callback-deps.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/crm/project-thread-stable-callback-deps.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('load() useCallback depends on stable profile primitives, not the whole profile object', async () => {
  const source = await readFile('components/crm/ProjectThread.jsx', 'utf8');
  const loadCallbackMatch = source.match(/const load = useCallback\(async \(\) => \{[\s\S]*?\}, \[([^\]]*)\]\);/);
  assert.ok(loadCallbackMatch, 'load useCallback must exist with a dependency array');
  const deps = loadCallbackMatch[1];
  assert.doesNotMatch(deps, /(?<!\?\.\w+\s*)\bprofile\b(?!\?\.)/, 'must not depend on the whole profile object -- use profile?.id / profile?.role instead');
  assert.match(deps, /profile\?\.\w+/, 'must depend on at least one stable primitive derived from profile');
});
```

- [ ] **Step 2: Fix the dependency array**

  - Change `}, [projectId, profile]);` at line 65 to depend on the stable fields the callback body actually reads from `profile` — trace `listProjectMessages(supabase, { profile }, projectId)`'s usage inside `lib/crm/projects.js` to confirm exactly which `profile` fields matter (likely `profile?.id` and `profile?.role`, possibly `profile?.company_id`) and depend on those primitives instead of the object.
  - Do not change the `{ profile }` value passed into `listProjectMessages` itself — only the `useCallback` dependency array.

- [ ] **Step 3: Run tests and build**

  - `pnpm test`, `pnpm build` — both clean.
  - Manual/browser sanity check optional but recommended: open a team project page, trigger an unrelated action (e.g. task creation), confirm via browser devtools Network/WS panel that the thread's Realtime channel does not resubscribe.

---

## Task 3: `ServiceEmblem.jsx` — stop hiding the tooltip button from assistive tech

**Confirmed bug:** `components/marketing/ServiceEmblem.jsx:132` wraps the entire `<ServiceEmblem3D>` output — including the real, focusable tooltip-toggle `<button>` it renders internally (`components/three/ServiceEmblem3D.jsx:111-119`) — inside `<span ... aria-hidden="true">`. The button stays in the tab order (keyboard-focusable) but is invisible to screen readers: a WCAG 4.1.2 violation.

**Files:**
- Modify: `components/marketing/ServiceEmblem.jsx`
- Test: `tests/marketing/serviceEmblem3d.test.jsx` (extend existing file)

- [ ] **Step 1: Write the failing test**

  - Extend `tests/marketing/serviceEmblem3d.test.jsx` (or add a case to it) rendering `ServiceEmblem` with `variant="3d"` and a `signal` that has a blurb, and assert the rendered tooltip-toggle `<button>` is NOT a descendant of any ancestor element carrying `aria-hidden="true"` (e.g. via testing-library's `getByRole('button', { name: /show service summary/i })` plus walking `closest('[aria-hidden="true"]')` and asserting it's null, or asserting it does not equal the outer wrapping span).

- [ ] **Step 2: Fix the markup**

  - In `components/marketing/ServiceEmblem.jsx`'s `variant === '3d'` branch (around line 132), stop applying `aria-hidden="true"` to the outer `<span>` that wraps the whole `<ServiceEmblem3D>` component. Instead, either: (a) pass an `aria-hidden` prop down into `ServiceEmblem3D` that it applies only to its own `<Canvas>` (which already receives `aria-hidden="true"` directly — see `components/three/ServiceEmblem3D.jsx:96`), making the outer span's `aria-hidden` redundant and removable; or (b) if the outer span genuinely needs `aria-hidden` for the SVG-variant's parity, move it to a narrower wrapper that excludes the tooltip button/tooltip text. Prefer (a) since `ServiceEmblem3D`'s `<Canvas>` is already correctly marked `aria-hidden="true"` on its own.
  - Do not touch `components/three/ServiceEmblem3D.jsx`'s own `aria-hidden="true"` on its `<Canvas>` (line 96) — that one is correct as-is (the canvas is genuinely decorative).

- [ ] **Step 3: Run tests and build**

  - `pnpm test` (`pnpm vitest run tests/marketing/serviceEmblem3d.test.jsx` for a fast targeted check), `pnpm build` — both clean.

---

## Task 4: `ServiceEmblem3D.jsx` — cache the reduced-motion check instead of calling `matchMedia` every frame

**Confirmed bug:** `components/three/ServiceEmblem3D.jsx:52`'s `useFrame` callback calls `state.gl.domElement.ownerDocument.defaultView.matchMedia('(prefers-reduced-motion: reduce)')` on every frame (~60x/sec per mounted emblem), allocating a new `MediaQueryList` each call. This violates this repo's own CLAUDE.md rule: "No allocation inside `useFrame`."

**Related, same file:** lines 58-64 — when reduced motion is active, rotation is correctly halted (gated at line 53) but the hover glow/emissive-color animation runs unconditionally regardless of the reduce flag. Fix this in the same pass using the same cached value.

**Files:**
- Modify: `components/three/ServiceEmblem3D.jsx`
- Test: `tests/marketing/serviceEmblem3d.test.jsx` (extend existing file, or add a small unit assertion on source structure)

- [ ] **Step 1: Write the failing test**

```js
// addition to tests/marketing/serviceEmblem3d.test.jsx or a new tests/marketing/serviceEmblem3dReducedMotion.test.jsx
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('matchMedia is not called inside the useFrame callback', async () => {
  const source = await readFile('components/three/ServiceEmblem3D.jsx', 'utf8');
  const useFrameBody = source.match(/useFrame\(\(state, delta\) => \{([\s\S]*?)\n  \}\);/);
  assert.ok(useFrameBody, 'useFrame callback must exist');
  assert.doesNotMatch(useFrameBody[1], /matchMedia/, 'matchMedia must not be called inside useFrame -- read it once outside and cache in a ref/state');
});

test('reduced motion also gates the glow/emissive animation, not just rotation', async () => {
  const source = await readFile('components/three/ServiceEmblem3D.jsx', 'utf8');
  const useFrameBody = source.match(/useFrame\(\(state, delta\) => \{([\s\S]*?)\n  \}\);/)[1];
  // crude structural check: the glow block (glow.current +=) must be inside an `if` that also
  // covers the same reduce condition rotation uses, or itself checks the cached reduce flag.
  const glowLineIndex = useFrameBody.indexOf('glow.current +=');
  const reduceCheckBeforeGlow = useFrameBody.slice(0, glowLineIndex).lastIndexOf('reduce');
  assert.notEqual(reduceCheckBeforeGlow, -1, 'glow animation must be reachable through a reduce-aware branch');
});
```

  (Treat these as structural sanity checks the implementer can loosen/adjust to match the actual refactor shape — the point is "no matchMedia call inside useFrame" and "glow respects reduce", not the exact regex.)

- [ ] **Step 2: Fix `EmblemMesh`**

  - Add a `useEffect` that reads `window.matchMedia('(prefers-reduced-motion: reduce)')` once on mount, stores its `.matches` value in a ref (e.g. `const reduceRef = useRef(false)`), and subscribes to its `'change'` event to keep the ref updated; return a cleanup that removes the listener (per this repo's "every animation-related useEffect returns a teardown" rule).
  - In `useFrame`, read `reduceRef.current` instead of calling `matchMedia` — no allocation on the per-frame path.
  - Gate the glow/emissive block (lines 58-64) on the same `reduceRef.current` flag: when reduced motion is active, either freeze `glow.current` at its current value (no lerp) or snap directly to the unlit state — implementer's choice, but it must stop animating every frame under reduced motion.

- [ ] **Step 3: Run tests and build**

  - `pnpm test`, `pnpm build` — both clean.

---

## Task 5: `ImageBlock.jsx` — fix the discarded CSS Modules import

**Confirmed bug (currently dormant — component is unused outside its own test):** `components/marketing/ImageBlock.jsx:1` does `import './ImageBlock.module.css';` for its side effect only and discards the CSS Modules export object. The JSX then uses literal, unscoped class name strings (`mkt-image-block`, `mkt-image-block__placeholder`, `mkt-image-block__image`) that will never match the hashed class names Next.js's CSS Modules loader actually generates (e.g. `ImageBlock_mkt-image-block__abc123`), so none of the intended styling can ever apply once this component is wired up.

**Files:**
- Modify: `components/marketing/ImageBlock.jsx`
- Test: `tests/marketing/imageBlock.test.jsx` (extend existing file)

- [ ] **Step 1: Write the failing test**

  - Extend `tests/marketing/imageBlock.test.jsx` to render `ImageBlock` with a `placeholder` and assert the rendered `<figure>`/`<img>` elements' `className` values are NOT the literal source strings (`mkt-image-block`, `mkt-image-block__placeholder`, `mkt-image-block__image`) but come through the CSS Modules `styles` object — in a `vitest` + jsdom environment without an actual CSS Modules transform, this typically means asserting `import styles from './ImageBlock.module.css'` is used (a source-text regex check, mirroring this repo's CRM test convention) rather than a runtime class-name assertion, since jsdom/vitest's CSS handling may not replicate Next.js's build-time hashing exactly. Check `vitest.config.js` for whether a CSS modules mock/transform is already configured before deciding between a source-regex test and a runtime-render test.

- [ ] **Step 2: Fix the import and JSX**

  - Change `import './ImageBlock.module.css';` to `import styles from './ImageBlock.module.css';`.
  - Replace each literal class name in JSX with the corresponding `styles.*` key. The actual exported keys (verified from `components/marketing/ImageBlock.module.css`) are `mkt-image-block`, `mkt-image-block--blur`, `mkt-image-block__placeholder`, `mkt-image-block__image` — since these contain hyphens, reference them as `styles['mkt-image-block']`, `styles['mkt-image-block--blur']`, etc. (bracket notation, not dot notation, because of the hyphens).
  - Preserve the existing `className` prop passthrough and the conditional `mkt-image-block--blur` logic exactly as-is, just swap the literal strings for `styles[...]` lookups.

- [ ] **Step 3: Run tests and build**

  - `pnpm test`, `pnpm build` — both clean.

---

## Task 6: Stop tracking `.hermes/` in git

**Confirmed issue:** `.hermes/` (containing binary `.zip` desktop attachments plus fully extracted duplicate copies of already-committed marketing components, styles, and plan docs — 16 files, confirmed via `git ls-files .hermes`) is tracked in git on `preview`. A `.gitignore` entry was already added in this same diff but only prevents *future* additions; the directory remains tracked and would ship into `main` on merge.

**Files:**
- Untrack: `.hermes/` (16 files under `git ls-files .hermes`)

- [ ] **Step 1: Confirm nothing under `.hermes/` is a unique, needed source of truth**

  - Diff each file under `.hermes/desktop-attachments/*_extracted/` against its real, currently-tracked counterpart (e.g. `.hermes/desktop-attachments/qXQIjc-2_extracted/components/marketing/SubpageExperience.jsx` vs `components/marketing/SubpageExperience.jsx`) to confirm they're stale duplicates, not divergent content that would be lost. `.hermes/plans/*.md` are working notes from an earlier planning pass — confirm their content is superseded by (or already folded into) `docs/plans/2026-08-06-marketing-inner-pages-enhancement-plan.md` and `docs/plans/2026-08-08-inner-pages-entrance-reveals.md` before removing.

- [ ] **Step 2: Untrack**

  - `git rm -r --cached .hermes` (keeps the files on disk for whoever's Hermes session owns them, just stops git from tracking/shipping them — the `.gitignore` entry already added in this diff then takes over). If Step 1 finds the content is genuinely fully superseded and safe to delete outright, `git rm -r .hermes` instead — default to `--cached` (untrack-only) unless Step 1 gives a clear "safe to delete" signal.

- [ ] **Step 3: Verify**

  - `git status --short` shows `.hermes/` no longer appears as tracked; `git diff main...preview --stat` no longer lists `.hermes/*` paths after this change is committed.

---

## Task 7: Remove stray scratch files; keep and wire up the live-check script

**Confirmed issue:** `layout_summary.txt` and `task_complete.txt` are workflow-progress scratch notes at the repo root with zero references anywhere else in the codebase — pure clutter. `scripts_livecheck.mjs` is a real, working Playwright smoke-test script (loads each marketing route against a local dev server, checks for console/page errors and correct nav-variant rendering) but isn't wired into `package.json` and sits at the repo root instead of a `scripts/` directory.

**Files:**
- Delete: `layout_summary.txt`, `task_complete.txt`
- Move: `scripts_livecheck.mjs` -> `scripts/livecheck.mjs`
- Modify: `package.json`

- [ ] **Step 1: Delete the scratch files**

  - `git rm layout_summary.txt task_complete.txt`.

- [ ] **Step 2: Relocate and wire up the live-check script**

  - `git mv scripts_livecheck.mjs scripts/livecheck.mjs` (create `scripts/` if it doesn't already exist as a tracked directory — check first, this repo may already have one for other tooling).
  - Add a `package.json` script, e.g. `"livecheck": "node scripts/livecheck.mjs"`, with a one-line comment/README note (or a leading comment in the file itself) stating it expects a dev server already running on port 3115 (`BASE = 'http://localhost:3115'` — confirm this matches `pnpm dev`'s actual port; adjust the constant or note the mismatch if it uses the default 3000 instead).

- [ ] **Step 3: Verify**

  - `pnpm test`, `pnpm build` — both clean (neither of these files affects either).
  - `git status --short` confirms the two scratch files are gone and `scripts_livecheck.mjs` no longer exists at the root.

---

## Task 8: Update `STATUS.md`

- [ ] Add a new dated session-update section documenting: the multi-agent review that found these 8 issues, the confirmed notification-visibility leak and its fix (migration `0023`), the `ProjectThread.jsx`/`ServiceEmblem.jsx`/`ServiceEmblem3D.jsx` fixes, the `ImageBlock.jsx` dormant-bug fix, and the `.hermes/` + stray-file cleanup — matching the style of the `2026-08-09, CRM remaining-decisions batch` section already in the file.
- [ ] Update the "Still open" known-gaps list: remove the `public/*.csv` entry only if it was separately resolved (it wasn't, as of this plan — leave it); do not conflate it with this plan's scope.

---

## Dependencies

- Supabase MCP tools (`apply_migration`, `execute_sql`) against project ref `wmnjosiikehsuaqucvja` for Task 1.
- `pnpm` for all test/build verification.

## Success Criteria

- Migration `0023` applied and verified live: internal-visibility messages/deliverables no longer generate `notifications_outbox` rows for client-company profiles.
- `ProjectThread.jsx`'s Realtime channel no longer resubscribes on unrelated workspace actions.
- The 3D service emblem's tooltip button is reachable by assistive tech (not nested under `aria-hidden="true"`).
- `ServiceEmblem3D.jsx` no longer calls `matchMedia` inside `useFrame`, and reduced-motion gates both rotation and glow.
- `ImageBlock.jsx`'s CSS Modules classes actually resolve (verified even though the component is currently unused).
- `.hermes/` is untracked; `layout_summary.txt`/`task_complete.txt` are gone; `scripts_livecheck.mjs` is relocated and wired into `package.json`.
- `pnpm test` and `pnpm build` both pass clean (only the pre-existing unrelated `auth-portals` failure remains).
- `STATUS.md` reflects all of the above.
