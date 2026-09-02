# Phase 3 — Admin CRUD Duplication Audit & Extraction (2026-09-02)

Executed per `docs/plans/refactor-architecture-cleanup-2.md` Phase 3
(TASK-014 through TASK-018). TASK-019's version bump is deferred, see the
end.

## Verdict

The duplication is real, but it is not where the line counts pointed.
The eight `app/admin/<entity>/{new,[id]/edit}/page.jsx` files (3,322
lines) share their **page chrome and CSS**, not their **form logic**.
The chrome was extracted into one component; the form logic was left
exactly as it was, because the differences between entities are
behaviour, not boilerplate.

| | before | after |
|---|---|---|
| eight form pages | 3,322 lines | 1,965 lines |
| shared shell (`components/crm/AdminFormShell.jsx`) | — | 347 lines |
| inline `<style jsx>` blocks across the eight pages | 8 (~150 lines each) | 0 |

## TASK-014 / TASK-015 — what is actually duplicated

Read side by side: `companies`, `contacts`, `deals`, `tasks` × `new`,
`edit`.

**Identical across all eight** (extracted):
- page wrapper (`.crm-admin-page` gradient background)
- header with title + "Back to …" link
- error banner
- the form card and its CSS
- field / label / input / button / cancel-control CSS

**Entity-specific** (left alone, on purpose):

| concern | companies | contacts | deals | tasks |
|---|---|---|---|---|
| admin-only redirect on `new` | yes | yes | yes | **no** |
| lists loaded on mount | — | companies | companies (+ contacts on company change) | companies (+ contacts and deals on company change) |
| "create a company first" empty state on `new` | — | yes | — | yes |
| `handleChange` shape | `(field, value)` | `(field) => (e) =>` | `(field, value)` + clears `contact_id` | `(field) => (e) =>` + clears `deal_id`/`contact_id` |
| submit-time validation | — | — | "Please select a company." | — |
| payload coercion | `employee_count` → number/null | — | `value`/`probability` → number, `owner_id` from session | `assigned_to`/`created_by` from session |
| post-update "no rows changed" check on `edit` | yes | **no** | yes | **no** |
| extra `edit` state | — | — | admin-only owner select; `error && !form` fatal branch | — |

A generic `EntityForm` / `useEntityForm` that took a field schema would
have had to encode every one of those rows as configuration to avoid
changing behaviour, which is more code and less legible than the four
pages are now. That option was rejected (`GUD-001`: audit before
extracting; v1 Phase 2 hit the same "obvious duplication that wasn't"
pattern).

### Two visual families, not one

The pages had drifted into two chrome styles. This matters because the
phase is a no-visual-change refactor:

| | `card` (companies, deals) | `container` (contacts, tasks) |
|---|---|---|
| frame class / max-width | `.crm-form-card`, 700px | `.crm-form-container`, 800px |
| field classes | `.crm-field`, `.crm-field-row` | `.crm-form`, `.crm-form-row`, `.crm-form-grid` |
| label | 0.85rem, weight 600 | 0.9rem, normal weight |
| input padding / focus | `0.75rem`, `#64c8ff` | `0.75rem 1rem`, `rgba(100,200,255,.6)` |
| cancel control | `.crm-button-secondary` (filled) | `.crm-cancel-link` (text) |
| actions row | gap 1rem, margin-top 2rem | gap 1.5rem, margin-top 1rem |

The shell keeps both as an explicit `variant` prop. Each variant's CSS is
the per-family **union** of the two pages' inline blocks (deals ⊇
companies, tasks ⊇ contacts; the extra rules are no-ops on the smaller
page, which has no `select:disabled` or `textarea`). Collapsing the two
families into one look is a design decision for the owner, not a
refactor, and is listed under follow-ups.

## TASK-016 — the shape

`components/crm/AdminFormShell.jsx`:

```jsx
<AdminFormShell
  variant="card" | "container"
  title="Edit Deal"
  backHref={`/admin/deals/${id}`}
  backLabel="Back to Deal"
  error={error}            // banner above the form
  loading={isLoading}      // renders <SkeletonDetail fields={skeletonFields} /> alone
  skeletonFields={9}
  fatalError={...}         // renders only the error banner (deals edit's `error && !form`)
>
  <form …>…entity fields, unchanged…</form>
</AdminFormShell>
```

Why styled-jsx `:global()` under a namespace class: styled-jsx scopes a
component's rules to elements *that component* renders. The entity
pages render their own `<input>`s, so the field rules are emitted as
`:global(.crm-admin-form--card .crm-field)` etc. The namespace class is
only ever rendered by the shell, so nothing else on the site can match
them. The CRM uses styled-jsx per page throughout (30 files), so a
global `app/styles/*.css` file would have been the odd one out and would
have collided with the same class names the detail pages scope locally.

## TASK-017 / TASK-018 — evidence of zero behaviour change

One entity per commit, in the order companies → deals → contacts → tasks
(`0f1b81a`, `655a4d4`, `9bfe6a2`, `2d84ec0`), each gated on:

1. **Characterization test** `tests/crm/admin-form-shell.test.jsx`:
   renders the pre-refactor page (frozen under
   `tests/crm/fixtures/admin-forms-pre-phase3/`) and the new page with
   identical mocks, and asserts **byte-identical markup** after stripping
   the raw `<style>` elements (styled-jsx isn't transformed under
   vitest) and the shell's namespace class. `new` pages for contacts and
   tasks are compared in their empty state, `edit` pages after the row
   has loaded; the skeleton and `fatalError` states are asserted
   separately. 10/10.
2. **CSS equivalence**: a selector-by-selector diff of every old
   `<style jsx>` block against the shell — for each old selector, the
   same declarations must exist under the expected namespaced selector
   (`max-width` allowed to move into the variant rule). All eight pages:
   22, 22, 23, 23, 25, 23, 26, 24 selectors, every declaration present.
3. `pnpm build` after each family: clean, 57/57 routes, First Load JS
   shared by all unchanged at 227 kB; per-route sizes within ±0.4 kB.
4. `pnpm test` 451/452 (the one failure is the pre-existing
   `tests/email.test.mjs` domain assertion fixed on PR #165, unrelated).

**Not done here**: a real create/edit run in a browser against Supabase.
The pages are gated by `useUserRole` / RLS and this environment has no
admin session. The DOM + CSS equivalence above is stronger evidence of
"nothing changed" than a screenshot, but the owner should still click
through one create and one edit per entity on the preview deployment
before merging.

## Pre-existing gaps found (not fixed — behaviour changes)

- `contacts` and `tasks` **edit** pages don't check that the update
  affected a row. If RLS silently filters the row, the user is redirected
  to the detail page as if the save succeeded. `companies` and `deals`
  edit both throw `Update failed - no rows changed (check permissions).`
  Recommend a follow-up that adds `.select()` + the same check to the two
  missing pages.
- `tasks/new` has no admin redirect guard, unlike the other three `new`
  pages. Whether that's intended (PMs may create tasks) or an omission
  depends on the RLS policy for `tasks` inserts; worth confirming against
  `supabase/migrations/` before touching it.

## Follow-ups (owner decisions)

- **Unify the two chrome families?** One shell now makes it a
  two-line change, but it alters the look of two of the four entities.
- `app/admin/companies/[id]/page.jsx` and `app/admin/users/invite/
  page.jsx` carry the same `card` CSS inline and could adopt the shell.
- Delete `tests/crm/fixtures/admin-forms-pre-phase3/` and the old/new
  pairs in the characterization test once the extraction has shipped and
  been exercised in production — they exist to prove this refactor, not
  as permanent coverage.

## TASK-019 — versioning

Deferred, as for Phases 1 and 2: PRs #162, #163 and #165 all currently
claim `v1.17`, so the next number depends on merge order. Bump
`VERSION`/`CHANGELOG.md` when this branch is queued to merge, with the
title `vX.NN — extract shared admin CRUD form scaffolding`.
