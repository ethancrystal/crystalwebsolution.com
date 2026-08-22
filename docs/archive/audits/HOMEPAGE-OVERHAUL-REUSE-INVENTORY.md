# Homepage Overhaul — Audit & Reuse Inventory

Deliverable #1 of the "CWS Homepage — Visual & Layout Overhaul" brief. Written
**before** any code, per §5.1 and the repo's Page Implementation Template.

Branch: `feat/homepage-overhaul` · Base commit: `8af0f21` · Audited 2026-08-17.

---

## A. Audit corrections — the brief vs. the repository

The brief's §0.1 says "do not re-derive — verify against real files first". Five
of its stated premises do not survive that check, and two of them change what is
buildable at all.

### A1. `Facts.jsx` and `Recognition.jsx` do not exist — BLOCKING for §1.6/§1.7

The brief treats both as shipped and load-bearing (§0.1 lists `Facts.jsx` as "your
animated counter component, already built"; §0.3 asserts CWS "already has this" for
both; §1.6 and §1.7 assign them work). Neither file is in `components/sections/`.

They did exist. `git log --diff-filter=D` shows both deleted in `a0158e0`
*"feat: redesign homepage journey and selected work"*. Their removal was a
deliberate homepage redesign, not an accident.

Consequences:

- **§1.6 (Facts)** — the brief itself asks for "None required structurally". With
  the component gone there is nothing to verify. **No work; closed as N/A.**
- **§1.7 (Recognition)** — asks to "restyle as a single quiet row". There is
  nothing to restyle. Rebuilding it is **out of scope and blocked on fact
  verification**; see §D1 below.

### A2. Services is already a hover-reveal list — §1.3's diagnosis is wrong

§1.3 states "current cards are static text blocks". They are not.
`components/sections/Services.jsx` already implements, in 184 lines:

- a shared ghost numeral marker that glides between rows via `gsap.quickTo`;
- per-row activation lighting the matching 3D emblem through the `lib/beacon.js`
  singleton (`light(i)` / `dim()`);
- a **scroll-driven auto-advance** that walks rows 01→08 in lockstep with
  `ServiceRail.jsx` for visitors who never hover, using the same
  `scrollState`/`beatProgress` inputs;
- `pointer: coarse` and `prefers-reduced-motion` guards on both effects.

This is more sophisticated than the LxL pattern §1.3 asks us to build toward. The
genuinely missing pieces are the two smaller ones: **capability chips** and the
**`/services/[slug]` link**. Scope for §1.3 narrows accordingly.

### A3. `Approach.jsx` has a React hooks-rule violation

`useCardMouseReveal()` is called inside a `.map()` callback (line 96). Hooks may not
be called in loops. It survives today only because `STEPS.length` is a module
constant, so call order never changes — but it is a latent bug and React's lint
rule would reject it. §1.4 rewrites this component anyway, so the fix lands with it.

The same file also carries **dead Tailwind class names** — `p-2 rounded-[28px]`,
`block text-center`, `w-8 h-8 mx-auto mb-6` — in a repository whose CLAUDE.md
states "No TypeScript, no Tailwind". No Tailwind is configured, so these classes
resolve to nothing and are pure noise. Removed as part of §1.4.

There is also a no-op `useEffect` (lines 48–52) that reads `matchMedia` and returns.

### A4. `Approach` copy has drifted from `docs/CONTENT.md`

§1.4 says "No copy changes — the four steps in `docs/CONTENT.md` §4 already read as
BAB→PAS". The live steps do not match that document:

| `docs/CONTENT.md` §4 | Live in `Approach.jsx` |
| --- | --- |
| 01 Discover | Brief & Discovery |
| 02 Design | Design |
| 03 Build | Development |
| 04 Launch | Deployment |

Live copy is preserved as-is (`plans/New Plan` §0.7 Content Preservation). The
drift is recorded here, not silently resolved — reconciling the content bible with
shipped copy is a content decision, not a layout one.

### A5. Stack version

The brief says "Next.js 14 App Router". This repo is **Next 15.5.22** (15.5.23
pending in the dependency PR) on **React 19**. No pattern in this plan depends on
the difference, but assumptions carried from 14 should be re-checked.

---

## B. Reuse inventory — what each change consumes

Every item below is an existing component, hook, class or data export. **Nothing new
is introduced.** No new primitive was required, so §0.2's "name it explicitly"
clause is not triggered.

### §1.1 Hero — inline stat

| Consumes | Source | Note |
| --- | --- | --- |
| `SITE.projectsShipped` | `lib/site.js:9` | `'60+ projects shipped'`. The brief says import "from wherever `Facts.jsx` sources it"; `Facts.jsx` is deleted (A1), and `lib/site.js` is the real single source — already consumed by `app/about/page.jsx:67`. **Not** a new hardcoded number. |
| `Reveal` | `components/Reveal.jsx` | Same delay-chained entrance as the existing hero CTA. |
| `--font-mono` | `app/globals.css` | Brief requires a single mono line, not a stat block. |
| `.hero-stat` | new class, existing tokens only | Styled with `--muted`/`--font-mono`; no new hex values (§3). |

Deliberately **not** doing the "2–3 orbiting glyph/shard elements" half of §1.1:
`Sparks.jsx` and `Particles.jsx` are scene-level actors positioned against
`lib/journey.js` `CLUSTERS`, and adding hero-local orbiters means touching the 3D
scene graph — materially higher risk than the rest of this pass, and §1.1 also
forbids touching `CLUSTERS`/`STOPS`. Recorded as a follow-up (§D2).

### §1.3 Services — capability chips + service links

| Consumes | Source | Note |
| --- | --- | --- |
| `SERVICES` | `lib/services.mjs` | 8 entries, each with `n`, `title`, `signal`, `desc`. |
| `SERVICE_SLUG_BY_SIGNAL` | `lib/servicePages.mjs:430` | Maps a service's `signal` → its page slug. This is the existing, correct join — no slug string is constructed by hand. |
| `SERVICE_PAGES[].capabilities` | `lib/servicePages.mjs:52+` | First 3 per service, per §1.3. |
| `.case-services` / `.case-services li` | `app/globals.css:2204` | Reused **verbatim** per §1.3, including the mono/uppercase/cyan pill treatment. |
| `SectionReveal` | `components/SectionReveal.jsx` | Already wraps each row. |

The row's existing hover/marker/beacon machinery (A2) is left untouched.

### §1.4 Approach — accordion

| Consumes | Source | Note |
| --- | --- | --- |
| `SectionReveal` | `components/SectionReveal.jsx` | Existing header reveals stay. |
| `useCardMouseReveal` | `components/CardHoverReveal.jsx` | Kept, but hoisted out of the `.map()` to satisfy the hooks rule (A3). |
| `scrollState` singleton pattern | `lib/scrollState.js`, per `AGENTS.md` | §1.4 requires the active step to reach the 3D actor **without** new props across the DOM/canvas boundary. Follows the `FocusVeil`/`FocusDimmer` precedent. |
| `lib/beacon.js` | existing `light()` / `dim()` | Already the established DOM→canvas channel for exactly this (Services uses it). Preferred over inventing a second mechanism. |
| existing `--cyan` / `--violet` | `app/globals.css` | Replaces the per-step inline `rgba()` literals currently hardcoded in the component. |

### §2.2 Section numbering

| Consumes | Source |
| --- | --- |
| `ScrollProgress.jsx` | existing singleton, per §2.2 — no new counter |
| `.eyebrow` | `app/globals.css` |

---

## C. Untouched by contract

Per §5.4 and §6, this pass does not modify:

- `lib/journey.js` (`CLUSTERS`, `STOPS`) or `lib/beatProgress.js` (`BEAT_IDS`)
- homepage section order in `components/Experience.jsx`
- `components/sections/Contact.jsx` behaviour — `plans/New Plan` §0.18 protects
  field names, honeypot, API payload, success/error behaviour
- `Mark.jsx`, `Lab.jsx`, `Motion.jsx` (§1.8, lowest priority)
- anything under `supabase/`, `app/api/`, `app/admin/`, `app/dashboard/`,
  `app/team/`, `lib/crm/`, `lib/supabase/`

---

## D. Blocked / deferred, with reasons

### D1. Recognition bar — BLOCKED on fact verification

Rebuilding §1.7 means publishing four award claims — Site of the Day (Awwwards
2026), Best Use of WebGL (CSS Design Awards 2025), Honorable Mention (FWA 2025),
Best Agency Site (Webby 2024). Those strings exist **only** in `docs/CONTENT.md`
§8. They appear nowhere in code: a repo-wide grep for `Awwwards`, `CSS Design
Awards` and similar returns nothing outside that one document.

`plans/New Plan` §0.7 lists **"Awards"** among the things the agent must not
invent — and the brief's own §4 repeats it. Since the component that once rendered
them was deliberately deleted, re-adding them would put unverifiable award claims
back onto the production homepage on the strength of a content draft. That is the
owner's call, not an implementation detail.

**Needs from owner:** confirmation each award is real, with a citation URL, before
any Recognition bar ships.

### D2. Hero orbiting shards — deferred

Half of §1.1. Requires editing scene-level 3D actors (`Sparks.jsx` /
`Particles.jsx`) whose placement is tied to `journey.js` `CLUSTERS`. Higher risk
than the rest of this layout pass and better reviewed on its own.

### D3. Client logo strip — BLOCKED, as the brief itself predicts

§2.9/§4: `lib/site.js` `socials: []` is empty **on purpose** (the file's own
comment explains unclaimed profiles are a negative SEO signal). No client logos
exist in the repo. Not buildable without real assets. Flagged, not filled.

### D4. §2.3 Nav mega-menu — not attempted

Explicitly "lowest priority; do only if time remains after §1".

---

## E. Test impact

Per §5.3, a pure layout pass should not require test changes. Two existing suites
assert on the sections being edited and will be re-run; any that encode the old
markup get updated in the same commit:

- `tests/sectionArchitecture.test.mjs`
- `tests/marketing.test.mjs` / `tests/content.test.mjs`

New coverage is added only where a real contract appears: the Services→
`/services/[slug]` link mapping is a route contract worth asserting, since a broken
`signal`→slug join would silently produce dead links.
