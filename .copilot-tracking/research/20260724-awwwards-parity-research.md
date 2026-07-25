<!-- markdownlint-disable-file -->

# Research: Bring Crystal Web Solution to Awwwards-caliber parity

## Task

Plan the work required to raise crystalwebsolution.com to the craft bar represented by the sites
listed on https://www.awwwards.com/websites/United%20States/ — i.e. the quality level that wins
Site of the Day / Site of the Month recognition, not a specific clone of any named site.

## Scoping principle (carried over from this repo's own precedent)

`TRIONN-ADAPTATION.md` in this repo already establishes the house rule for benchmark sites: study
structure and interaction *mechanics* as reference, never copy another site's actual copy, client
names, testimonials, logos, or media. This plan applies the same rule to the Awwwards list —
Awwwards entries are read as a **genre/quality benchmark**, not a list of designs to reproduce.
Nothing in this plan calls for scraping or reproducing a named site's proprietary content.

## External research: how Awwwards actually scores a site

Source: https://www.awwwards.com/about-evaluation/ (fetched 2026-07-24)

Four weighted criteria, minimum 18 jury members over a 5-day voting window (3 outlier scores
auto-dropped):

| Criterion  | Weight | What it evaluates |
|------------|--------|--------------------|
| Design     | 40%    | Visual craft — composition, typography, color, hierarchy, polish |
| Usability  | 30%    | Navigation clarity, load/perf, accessibility, mobile UX, findability |
| Creativity | 20%    | Originality of concept and interaction — is this differentiated? |
| Content    | 10%    | Depth/quality of the actual copy and case material |

Award tiers: Honorable Mention (jury score ≥ 6.5), Site of the Day (top daily scores), Developer
Award (SOTD winners scoring > 7 on separate dev-guideline judging), Site of the Month (top 8
SOTDs per month, re-reviewed with user votes), Site of the Year (all monthly winners + curator
picks).

**Planning implication:** the 4-way weighting is a useful phase structure — Design and Usability
are 70% of the score combined, so polish/performance work should not be treated as an afterthought
behind "creative" visual work.

## External research: what's actually listed on the Awwwards US page

Source: https://www.awwwards.com/websites/United%20States/ (fetched 2026-07-24)

Sample of current entries (names only, no content reproduced): Spotify Wrapped Party (current
Site of the Day + Developer Award), Dragonfly Redux (recent SOTD), several agency/portfolio sites,
one law-firm site (Blair Defense Criminal Lawyers) confirming legal-services sites do compete and
win in this category, several café/local-business sites, several SaaS/fintech product sites.

Visible filter/tag vocabulary on the page (i.e. what Awwwards itself considers the relevant craft
axes): **Animation, 3D, Portfolio, E-commerce, Architecture, Photography, UI design, Responsive
Design, Interaction Design, Microinteractions, Storytelling, Typography, Header Design, WebGL,
React, Framer, Webflow, Next.js, GSAP.**

Notably: React, Next.js, GSAP, and WebGL are first-class tags on that page — CWS's actual stack
(Next.js 14, GSAP, React Three Fiber) is not a disadvantage here; it is squarely the toolchain
Awwwards' own filter taxonomy expects for this category.

## Current state: Crystal Web Solution

### Stack (from `package.json`, confirmed 2026-07-24)

- Next.js 14.2.15 (App Router), React 18.3.1, no TypeScript
- `@react-three/fiber` 8.17, `@react-three/drei` 9.114, `@react-three/postprocessing` 2.16, `three` 0.169
- `gsap` 3.12.5, `lenis` 1.1.14, `split-type` 0.3.4
- Plain global CSS (`app/globals.css`), no Tailwind
- `@supabase/ssr` + `@supabase/supabase-js` are listed dependencies but per project `CLAUDE.md`
  "no application code uses Supabase currently" — worth a follow-up audit, since `/admin`,
  `/dashboard`, `/login`, `/signup`, `/api/auth/*` routes DO exist in the current build output,
  meaning an auth/dashboard feature has landed since that note was written. That work is out of
  scope for this plan but the metadata/robots implications (should `/admin`, `/dashboard` be
  `noindex`?) are flagged under Usability below.
- `shadcn` is a devDependency only — unused in application code (repo has deliberately stayed
  Tailwind-free); not a blocker for this plan, just noted as dead weight worth removing separately.
- No lint or test script configured (`CLAUDE.md` is explicit about this); `next build` is the only
  automated correctness signal.

### Architecture already in place (from `CLAUDE.md` + direct file reads this session)

- Single fixed WebGL stage (`components/Scene.jsx`) with the DOM scrolling over it — a virtual
  camera flies a continuous 3D space past a refracting crystal, glass showcase slabs, an
  assembling brand mark, and drifting particles (`components/three/*`).
- One `gsap.ticker`-driven Lenis smooth-scroll clock (`components/SmoothScroll.jsx`); all
  per-frame cross-boundary state lives in module-level singletons (`lib/scrollState.js`,
  `lib/pulse.js`, `lib/chime.js`), never React state — this is a deliberate, documented
  performance decision.
- Camera choreography is data-driven: `lib/journey.js` (`STOPS`/`CLUSTERS`) + `lib/beatProgress.js`
  (`measureBeats` against real DOM section positions, not a naive `index / (N-1)` split).
- Zero binary/image/video assets anywhere — every visual (icons, avatars, textures, project
  thumbnails via `components/ProjectVisual.jsx`) is procedurally generated. This is a real,
  unusual differentiator versus most Awwwards entries (which lean on photography/video) and is
  worth foregrounding as a Creativity-criterion strength, not diluting.
- `SectionReveal.jsx` (GSAP clipPath entrance reveals) and `BorderGlow.jsx` (mouse-tracking mesh
  gradient border glow, currently used on Motion.jsx's project rail) are the two shared
  micro-interaction primitives; both already ported/adapted from 21st.dev-style component research
  earlier in this engagement (see PR #34, branch `claude/21st-services-approach-glow`).
- Reduced-motion handling exists but is applied inconsistently — `About.jsx` explicitly checks
  `prefers-reduced-motion` and short-circuits its SMIL/GSAP work; not confirmed for every other
  animated section (Approach's connector-line animation, Motion's card transforms, Lab's flying
  carousel) — this is a concrete Usability-criterion gap to close.
- Real content only, by explicit house rule: `app/work/page.jsx`'s copy states outright it will
  not "attach invented scopes, outcomes, awards, or performance numbers." Currently exactly 3
  `VERIFIED_CLIENTS` plus a separate `PROJECTS` array (6 entries: tucker-trips,
  talk-to-my-lawyer, style, zeus-towing-services, prestige-online-learning, crystal-web-solution
  itself) used by the homepage Motion rail and `/work/[slug]` case-study pages. Case-study pages
  (`app/work/[slug]/page.jsx`) are currently thin: eyebrow, title, one-paragraph summary, a
  services list, one `ProjectVisual` banner, a body of paragraphs, and a "next case" link — no
  problem/process/outcome structure, no supplied metrics, no testimonial placement.
- SEO/metadata baseline exists (`app/layout.jsx`): per-page metadata via App Router `metadata`
  export, OG/Twitter cards, canonical URLs, a hand-written `ProfessionalService` JSON-LD block,
  `robots.txt`/`sitemap.xml` routes. No `noindex` currently set on `/admin`, `/dashboard`,
  `/login`, `/signup` — those are product surfaces, not marketing pages, and should very likely be
  excluded from indexing.
- A very recent, already-shipped round of polish (this engagement, branch
  `claude/21st-services-approach-glow`, PR #34) covered: Services/Approach hover and connector
  micro-interactions, a Marquee edge-mask, Motion rail BorderGlow cards + SectionReveal wrap, a
  Reviews-page visual pass, and footer hierarchy — plus a just-fixed hover-crop bug on the Motion
  rail cards (BorderGlow's `overflow: auto` content wrapper clipping the card's hover lift). All of
  that work has shipped **visually unverified in a live browser** — every attempt to connect
  `mcp__claude-in-chrome__*` this session returned "Browser extension is not connected." Real
  browser QA of that existing PR is still outstanding and should be treated as a prerequisite,
  not a parallel task, for any of the new work below — no point layering more unverified CSS on
  top of unverified CSS.

## Gap analysis against the 4 Awwwards criteria

**Design (40%)** — Strong foundation (bespoke WebGL scene, procedural visuals, dark
cyan/violet/blue palette, custom display/mono type pairing). Gaps: no documented type scale beyond
scattered `clamp()` values per component; inconsistent use of the accent palette across sections
built in different rounds; the Reviews/Work/case-study subpages are plain "subpage" template
without the same visual density as the homepage's 3D-backed sections, so parity drops off sharply
once a user leaves `/`.

**Usability (30%)** — No performance budget or Core Web Vitals baseline exists yet (no Lighthouse
run recorded in this engagement). A fixed always-on WebGL canvas plus `@react-three/postprocessing`
is a real mobile/low-end-GPU risk that has not been profiled. Reduced-motion support is partial.
No visible focus-state audit across custom cursor / magnetic / data-cursor interactive elements
(a custom cursor is a common Awwwards-entry pattern that actively fights keyboard/screen-reader
usability if not paired with a visible-focus fallback). Product routes are not excluded from
search indexing.

**Creativity (20%)** — The core conceit (one continuous 3D journey, camera-driven scroll,
zero-asset procedural visuals) is already a genuinely distinctive idea versus a typical agency
site. The gap is depth of execution in secondary moments: page-to-page navigation (`/work/[slug]`)
currently exits the 3D world entirely into a flat template, which breaks the "one continuous
space" premise the homepage sells. No sound design. No signature "hero moment" comparable to what
wins Developer Award-tier recognition (e.g., Spotify Wrapped Party's current SOTD/Developer Award
win is built around one unmistakable interactive centerpiece).

**Content (10%)** — Deliberately, correctly conservative (real clients only, no invented metrics).
The gap is depth within that constraint: case studies are currently summary-only; there is room to
add real process/outcome detail supplied by actual clients without inventing anything, and to
surface the 3 `VERIFIED_CLIENTS`' supplied reviews more prominently across the funnel (they
currently live mainly on `/reviews` and `/work`).

## Recommendation feeding the plan

Given Usability + Design are 70% of how these sites are actually scored, and given this session's
own standing rule ("if it needs a browser to verify, don't ship it as done"), the plan is
sequenced: (1) close out visual QA debt on already-shipped work, (2) establish a performance/
accessibility baseline before adding more visual weight, (3) extend the existing 3D-journey design
language into the subpages instead of leaving them flat, (4) add one deliberate signature
interaction moment, (5) deepen real content within the existing no-invented-content rule, (6)
Awwwards submission readiness (the platform has its own technical submission requirements —
custom favicon, load screen, no broken states — most of which fall out of steps 1-3 for free).
