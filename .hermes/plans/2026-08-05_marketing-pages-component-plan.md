# Marketing Pages — Component Plan & Per-Page Composition

> **For Hermes:** Use subagent-driven-development skill to implement per task (task-by-task, with two-stage review). This is a DESIGN/STRUCTURE plan, not code yet.

**Goal:** Define *which* shared component each marketing page uses and *how* the component tree is structured, so the 5 inner pages (About, Services, Service detail, Process, Contact) and the 2 wrapped pages (Reviews, Embroidery) are **coherent with the Crystal Web Solution design system** (dark canvas, `text-plate`, `eyebrow`, `page-title`, `btn`, magnetic/quiet motion language) yet **distinct from each other** and from the homepage.

**Architecture:** All inner pages share one **server-rendered shell** (`MarketingShell` → `MarketingHeader` + page body + `MarketingFooter`) and compose from a small set of **presentational blocks** (`PageHero`, `ContentSection`, `ServicePage`, `ContactForm`). Uniqueness comes from *content + prop variation* (eyebrow/title/lede per page, `tone` alternation on `ContentSection`, which sections a page includes) — NOT from new bespoke components. This keeps the system DRY and keeps inner pages free of the homepage WebGL runtime (Regression Boundary §0.20).

**Tech Stack:** Next.js 15 App Router (RSC), plain JSX + global CSS, the existing `components/marketing/*` primitives. No new runtime, no TS, no Tailwind.

**Repo:** `C:\Users\moizjmj\Crystal Web Solution` · branch `agent/marketing-inner-pages` · PR #57 (draft).

---

## Current State / Verified Facts

- **Shared primitives (already built, read-verified):**
  - `MarketingShell` — `MarketingHeader` + `{children}` + `MarketingFooter`. Server component.
  - `PageHero({ eyebrow, title, lede, children })` — `<section class="mkt-hero"><div class="text-plate">…</div></section>`. Renders one `<h1 class="page-title mkt-hero-title">`.
  - `ContentSection({ eyebrow, title, children, tone='default', id })` — `<section class="mkt-section mkt-section--{tone}">`. `tone` ∈ likely `default | alt` (alternates the plate).
  - `ContactForm({ variant })` — `variant='home' | 'marketing'`. Posts to `/api/contact`. (Homepage uses `home`; inner pages use `marketing`.)
  - `ServicePage` — composes `PageHero` + `ContentSection`s (hero, problem, capabilities, deliverables, process, idealClient, faq, related, finalCta) + `ContactForm variant="marketing"`.
- **CSS:** `.mkt-*` block in `app/globals.css` (77 rules), namespaced — safe to extend.
- **Design tokens (homepage, reuse):** dark canvas, `--font-display`/`--font-body`, `text-plate`, `eyebrow`, `page-title`, `btn`/`btn-solid`/`btn-ghost`, `case`/`subpage` legacy classes for wrapped pages.
- **Routes exist:** `/about`, `/services`, `/services/[slug]`, `/process`, `/contact`, `/reviews` (wrapped), `/embroidery-screen-printing-web-design` (wrapped).

## The Coherence Rule (the spine of this plan)

> Every inner page = `MarketingShell` + exactly one `PageHero` + 1–N `ContentSection`s + (where relevant) `ContactForm`. The **shell and primitives are identical everywhere**; what differs per page is the **eyebrow/title/lede copy**, the **sequence and count of `ContentSection`s**, the **`tone` alternation**, and the **page-specific data** (services list, FAQ, etc.). No page invents a new layout container.

This is what makes them coherent (same skeleton, same tokens) yet unique (different content shape and rhythm).

---

## Per-Page Component Plan

### 1. `/about` — *the studio story*
**Tree:**
```
MarketingShell
└─ PageHero            eyebrow="Studio" title="About" lede="<positioning line>"
   └─ children: CTA row (Link → /contact, Link → /work)
└─ ContentSection tone="default"  eyebrow="Who we are"  title="…"
   └─ children: prose paragraph(s)
└─ ContentSection tone="alt"      eyebrow="How we work" title="…"
   └─ children: 3–4 principle bullets (reuse .mkt-grid / .mkt-list)
└─ ContentSection tone="default"  eyebrow="Proof"       title="…"
   └─ children: stat row (SITE.projectsShipped, SITE.experience, city)
└─ MarketingFooter
```
**Uniqueness lever:** narrative + a "principles" section other pages don't have. Tone alternates default/alt/default.

### 2. `/services` — *the offer index*
**Tree:**
```
MarketingShell
└─ PageHero            eyebrow="Services" title="Services" lede="<one-line value>"
└─ ContentSection tone="default" eyebrow="What we do" title="…"
   └─ children: <ServiceGrid> — 8 cards (slug, title, short desc, link)
└─ ContentSection tone="alt" eyebrow="Not sure where to start" title="…"
   └─ children: CTA → /contact (or /process)
└─ MarketingFooter
```
**Uniqueness lever:** the `ServiceGrid` (the only page with a card index). New tiny presentational component `ServiceGrid` (maps `SERVICE_PAGES` → `Link` cards). Coherent because cards reuse `eyebrow`/`page-title`/`btn` tokens.
**Decision needed:** build `ServiceGrid` as a new `components/marketing/ServiceGrid.jsx` (recommended — it's a *class* of problem, reused by `/services` now and possibly homepage later) OR inline the map inside `/services/page.jsx`. Recommend `ServiceGrid.jsx` (systems over one-offs).

### 3. `/services/[slug]` — *one offer, deep* (driven by `ServicePage`)
**Tree (already implemented in `ServicePage`):**
```
MarketingShell
└─ <nav class="mkt-breadcrumb"> Home / Services / {title}
└─ PageHero            eyebrow=`page.eyebrow` (e.g. "Service 01") title=`page.title` lede=`page.hero`
└─ ContentSection tone="default" eyebrow="The problem"   title=… children=`page.problem`
└─ ContentSection tone="alt"     eyebrow="What you get"  title=… children=`page.capabilities` (grid)
└─ ContentSection tone="default" eyebrow="Deliverables"  title=… children=`page.deliverables` (list)
└─ ContentSection tone="alt"     eyebrow="How we work it" title=… children=`page.process` (steps)
└─ ContentSection tone="default" eyebrow="For you if"    title=… children=`page.idealClient`
└─ ContentSection tone="alt"     eyebrow="FAQ"           title=… children=`page.faq` (Q/A)
└─ ContentSection tone="default" eyebrow="Related"       title=… children=`page.relatedSlugs` (links)
└─ ContentSection tone="alt"     eyebrow="Start"         title=… children=<ContactForm variant="marketing"/>
└─ MarketingFooter
```
**Uniqueness lever:** this is the *longest, most structured* page (8 sections, strict tone alternation). Each of the 8 services differs only by `lib/servicePages.mjs` data — same skeleton. Coherent + data-driven.

### 4. `/process` — *the method*
**Tree:**
```
MarketingShell
└─ PageHero            eyebrow="Process" title="Process" lede="<how we engage>"
└─ ContentSection tone="default" eyebrow="The engagement" title="…"
   └─ children: <ProcessSteps> — numbered phases (Discover → Design → Build → Launch → Care)
└─ ContentSection tone="alt" eyebrow="What you can expect" title="…"
   └─ children: bullet list (cadence, check-ins, deliverables)
└─ ContentSection tone="default" eyebrow="Project brief" title="…"
   └─ children: <ContactForm variant="marketing"/>
└─ MarketingFooter
```
**Uniqueness lever:** the `ProcessSteps` sequence (the only page with an ordered phase list). New tiny `ProcessSteps.jsx` (or inline `ol` in `process/page.jsx`; recommend inline `ol` styled with `.mkt-steps` since it's single-use — avoid a one-off component). Tone default/alt/default.

### 5. `/contact` — *the conversion page*
**Tree:**
```
MarketingShell
└─ PageHero            eyebrow="Contact" title="Contact" lede="<direct line>"
└─ ContentSection tone="default" eyebrow="Project brief" title="…"
   └─ children: <ContactForm variant="marketing"/>
└─ ContentSection tone="alt" eyebrow="Direct" title="Prefer email or a call?"
   └─ children: email + phone + socials (from SITE)
└─ MarketingFooter
```
**Uniqueness lever:** form is the *hero content* (not buried) — highest-intent page. Shortest content section set; the form is foregrounded. Coherent via `ContactForm` shared with service pages, but distinct by placement (top, not bottom).

### 6. `/reviews` (wrapped) — *social proof*
**Structure (already wrapped):** `MarketingShell` + existing `reviews-index` markup (hero `page-title`, rating cards, mailto CTA). **No PageHero/ContentSection** — it keeps its legacy `reviews-*` classes inside the shell.
**Coherence:** shell + header/footer match; body is bespoke-but-on-brand (legacy `case`/`subpage` pattern). **Uniqueness:** the only page built around third-party testimonials.

### 7. `/embroidery-screen-printing-web-design` (wrapped) — *vertical case*
**Structure (already wrapped):** `MarketingShell` + existing `case` markup (eyebrow, `page-title`, body, `case-next` link). Legacy `case` classes.
**Coherence/Uniqueness:** niche vertical landing page; differs from everything else by being a single-industry case narrative.

---

## Recommended New/Changed Components (minimal)

| Component | Action | Why |
|---|---|---|
| `components/marketing/ServiceGrid.jsx` | **Add** | Class-level: card index reused conceptually by `/services` (and a future homepage). Maps `SERVICE_PAGES` → `Link` cards using existing tokens. |
| `ProcessSteps` (inline `ol.mkt-steps` in `process/page.jsx`) | **Add (inline)** | Single-use ordered list; no need for a standalone component (avoid one-off component anti-pattern). |
| `MarketingShell` / `PageHero` / `ContentSection` / `ContactForm` / `ServicePage` | **Keep as-is** | Already the coherence spine. |
| `/about`, `/services`, `/process`, `/contact` page files | **Refine** (if needed) | Ensure each follows the tree above; mostly already correct. Add `ServiceGrid` to `/services`. |
| `.mkt-*` CSS | **Extend** | Add `.mkt-grid`, `.mkt-list`, `.mkt-steps`, `.mkt-stat-row`, `.mkt-breadcrumb` styling (namespaced, on-brand). |

**Decision to confirm with user:** build `ServiceGrid.jsx` as a shared component (recommended) vs inline map.

---

## Design Principles (resolve the coherence-vs-uniqueness tradeoff)

1. **One skeleton, many stories.** Every inner page uses the same `MarketingShell` + `PageHero` + `ContentSection` spine. Uniqueness lives in *content and prop variation*, never in a new layout container. *(Resolves: "should this page have its own layout?" → No, vary the blocks.)*
2. **Tokens are non-negotiable; composition is free.** You may reorder/add `ContentSection`s and change `tone`, but you may not introduce off-token colors, fonts, or spacing. *(Resolves: bespoke styling temptation.)*
3. **Tone alternates by default.** Consecutive sections flip `default`↔`alt` so the dark canvas stays legible without new background treatments. *(Resolves: "this section needs a different bg" → use `tone`, don't add CSS.)*
4. **Data, not markup, differentiates services.** The 8 `/services/[slug]` pages are one component fed by `lib/servicePages.mjs`. Adding a service = add data, not a page. *(Resolves: per-service custom pages → forbidden.)*
5. **The form is a first-class block, placed by intent.** On `/contact` it leads; on service pages it closes. Same component, deliberate placement = distinct feel. *(Resolves: "where does the form go?" debate.)*

## Design Definition-of-Done (per page)
- [ ] Uses `MarketingShell`; exactly one `<h1>` (via `PageHero`).
- [ ] All text uses existing tokens (`eyebrow`, `page-title`, `btn`, `text-plate`); no new color/font/spacing values.
- [ ] `tone` alternates between consecutive `ContentSection`s.
- [ ] No homepage WebGL/runtime import (§0.20).
- [ ] Responsive at 360/768/1024/1440; `prefers-reduced-motion` respected.
- [ ] Reuses `ContactForm` where a form appears (never a second implementation).
- [ ] `pnpm build` clean; route returns 200; title single-suffix.

## Metrics (DesignOps, light — right-sized to solo/2-person team)
- **Consistency:** 0 off-token values across inner pages (grep `.mkt-*` + visual pass).
- **Adoption:** 100% of inner pages use `MarketingShell` + `PageHero` (already true).
- **Cycle time:** time from "new inner page request" → shipped (target: < 1 session via copy-in data).
- **Outcome:** contact-form submissions from `/contact` + `/services/[slug]` (ties design to the business goal).

## Open Questions
1. Build `ServiceGrid.jsx` as shared component, or inline the map in `/services`? (Recommend: shared.)
2. Should `/about` "principles" use 3 or 4 items, and pull from a data file or hardcode? (Recommend: 4, hardcoded in page or `lib/site.js`.)
3. Any page allowed to break the `tone` alternation for emphasis? (Recommend: no — use `tone`, never break the rule.)

## Execution Handoff
Plan complete. Ready to implement via subagent-driven-development — one subagent per page/component task, two-stage review (spec compliance → code quality). Awaiting go-ahead (and the `ServiceGrid` decision) before editing files.
