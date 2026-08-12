# Navigation Models & UI Pattern Catalog

Reach for a proven pattern before inventing a control. Each established pattern carries built-in user expectations, keyboard behavior, and accessibility affordances. Inventing your own re-pays all of that from scratch — usually badly. Pick the pattern that fits the *task shape*, not the one that looks novel.

---

## Part 1 — Navigation models

Choose by the size and shape of the destination set, not by fashion.

| Model | Use when | Avoid when | Notes |
|---|---|---|---|
| **Top nav (horizontal bar)** | 2–7 top-level destinations, marketing or app shell | >7 items; deep hierarchy | Mark the current item; keep stable across pages |
| **Sidebar nav** | Many sections, app/dashboard, deep IA | Tiny content sites; mobile-first with few items | Collapsible; show current section + parent |
| **Bottom tab bar (mobile)** | 3–5 primary, frequently-switched destinations | >5 items; secondary actions | Persistent; each tab keeps its own scroll/state |
| **Hamburger / drawer** | Secondary or overflow nav, small screens | Primary actions you want discovered | Hides destinations — costs discoverability |
| **Breadcrumbs** | Deep hierarchical content (>2 levels) | Flat sites; linear flows | Show the path *and* current location; not a replacement for back |
| **Tabs (in-page)** | Switching views of the *same* object | Navigating to *different* objects/pages | Don't lose state when switching back |
| **Command palette (⌘K)** | Power users, large action/destination space | Sole nav for novices | Augments, never replaces, visible nav |
| **Wizard / stepper** | Linear multi-step task with order dependency | Tasks the user wants to do out of order | See the wizard pattern below |

**Rules that hold across all models:** always show the current location; keep nav stable (don't reorder between visits); use user-vocabulary labels, not internal module names; back/up must always work; never trap focus in a nav region.

---

## Part 2 — Pattern catalog

### Forms
The highest-friction surface in most products. The dedicated form rules:

- **One column.** Multi-column forms break the natural top-to-bottom scan and hurt completion. Group related fields with headings.
- **Top-aligned labels**, always visible. Placeholder-as-label is an anti-pattern — it disappears on focus, fails contrast, and breaks screen readers.
- **Mark the minority.** If most fields are required, mark the *optional* ones (and vice versa). Don't asterisk everything.
- **Match input to data:** native `type="email/tel/number/date"`, correct `inputmode`, `autocomplete` tokens, sane keyboard on mobile.
- **Validate at the right time:** validate a field on *blur* (after the user leaves it), not on every keystroke; re-validate on submit. Never block typing.
- **Errors are inline, specific, and recoverable:** at the field, in plain language, saying how to fix it — not a summary at the top alone. Move focus to the first error on submit.
- **Preserve input on error.** Never clear what the user typed. Never lose data on navigation/back.
- **Defaults & smart formatting:** prefill known values; format as-you-go (card numbers, phone) without fighting the cursor.
- **Minimize fields.** Every field is a cost. Ask only what you need now; defer the rest. Combine first/last name unless you truly need them apart.
- **Submit is one clear primary action.** Disable-on-submit to prevent double-submit; show progress; never silently no-op.
- Long forms: chunk into a wizard (below) or save-as-you-go with autosave + a saved indicator.

### Search
- Show what's searchable; provide a clear input with a labeled affordance (icon alone is mystery-meat — pair with text or `aria-label`).
- **Debounce** type-ahead (~200–300ms); show a loading state; never block typing.
- Distinguish **no-results** (valid query, nothing matched → suggest broadening, fix typos, clear filters) from **empty** (no query yet → show recent/popular or guidance).
- Preserve the query and scroll position on back. Reflect active filters visibly with a one-tap clear.
- For autocomplete: keyboard-navigable (↑/↓/Enter/Esc), announce result count to screen readers, don't auto-select on blur.

### Tables / data grids
- Right-align numbers; left-align text; consistent units; format large numbers.
- **Sticky header** on scroll; make sort state visible and announced.
- For large sets: pagination *or* virtualization (don't render 10k rows). State total count.
- Row actions discoverable without hover-only reveal (hover-reveal fails touch and keyboard).
- Bulk selection: select-all scope must be explicit ("all 20 on page" vs "all 4,300").
- Provide empty, loading (skeleton rows), and error states for the table body specifically.
- Don't overload tables with what a card list or detail view does better.

### Modals / dialogs
Use sparingly — modals interrupt and trap. Reach for a modal only when the task **must** be completed or dismissed before continuing.
- **Trap focus** inside while open; return focus to the trigger on close.
- **Esc closes**; clicking the backdrop closes *non-destructive* dialogs; provide a visible close control.
- Label with `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
- Don't stack modals. Don't put long flows, complex forms, or scrolling-heavy content in a modal — use a page.
- Confirmation dialogs: name the specific object and consequence ("Delete 3 invoices? This can't be undone."), and make the safe choice the default focus.

### Wizards / steppers
For linear, order-dependent, multi-step tasks (onboarding, checkout, setup).
- Show **progress** (step N of M) and let users go back without losing data.
- One coherent decision per step; don't fragment a single thought across steps.
- Validate per step; summarize before the final commit.
- Allow save-and-resume for long flows. Don't force a wizard onto a task users want to do non-linearly.

### Other common patterns (use the established one)
- **Disclosure / accordion** — progressive reveal of secondary detail; keep triggers keyboard-operable and labeled with expanded state.
- **Toast / snackbar** — transient confirmation; never for errors that need action; never the only place critical info appears.
- **Inline editing** — edit in place for quick single-field changes; show edit affordance, confirm/cancel, and saved state.
- **Date/time pickers, selects, comboboxes, tooltips, drag-and-drop** — prefer native elements or a vetted accessible component. These are the most commonly broken custom controls; if you must build one, follow the [WAI-ARIA Authoring Practices] pattern exactly (roles, keyboard, focus).

---

## When *not* to use a pattern
- A modal where a page or inline expansion would do (don't trap the user).
- A wizard for a task users want to do out of order.
- A table for content that's really a list of cards.
- A dropdown for 2 options (use radios/segmented control) or for 200 (use search/combobox).
- Tabs to navigate to genuinely different pages (use real navigation).
- Custom controls where a native element already solves it accessibly.

Cross-reference: state design for each pattern lives in `state-inventory.md`; the words inside them in `microcopy.md`; keyboard/focus requirements in `accessibility-wcag-aa.md`.
