# CD Sportswear INC — UI/UX Review

**Repository reviewed:** `crystalwebsolution.com`  
**Review scope:** Static code review of the Next.js route structure, marketing components, global styling, responsive rules, accessibility patterns, and documented CRM journeys. No production code was changed.

## Executive summary

The site has a distinctive, high-end point of view: a dark cinematic palette, procedural 3D stage, scroll-driven storytelling, strong motion primitives, reduced-motion handling, and a coherent procedural-visual rule. The component architecture is also unusually intentional: the homepage is composed from named “beats,” marketing subpages have their own shell, and the CRM has documented user journeys.

The main UX risk is **cognitive load**. The site asks visitors to understand a long, continuous scroll experience, a fullscreen WebGL background, several abstract section names, and a hidden navigation menu before they have a simple mental model of what the studio does and what to do next. The best improvements are therefore clarity and prioritization: make the value proposition more concrete above the fold, give users a persistent wayfinding model, turn service/work discovery into faster decision paths, and make the same system perform reliably on touch devices and low-power hardware.

## What is working well

- **Strong visual differentiation:** The fixed WebGL stage and procedural art give the studio a memorable identity instead of a generic agency template.
- **Clear component ownership:** `Experience.jsx` and `components/sections/*` make the homepage sequence understandable and maintainable.
- **Good motion safeguards:** `prefers-reduced-motion` is handled in `app/styles/responsive.css`; pointer-dependent hero behavior is skipped for coarse pointers in `Hero.jsx`.
- **Accessible global foundations:** the root layout includes a skip link, semantic `<main>`, language metadata, and a focus-managed fullscreen menu.
- **Conversion intent is present:** the hero and contact section both use “Start a project,” and the contact copy explains what a visitor gets back.
- **Responsive intent is thoughtful:** mobile-specific spacing, one-column service rows, mobile menu sizing, and overflow safeguards are already documented in the CSS.
- **CRM UX principles are strong on paper:** progressive disclosure, “who has the ball,” action-required states, and real-time status communication are the right foundations for the portal.

## Highest-priority improvements

### P0 — Make the homepage’s value proposition concrete within the first viewport

**Evidence:** `components/sections/Hero.jsx:79-119` uses “Built to be unforgettable.” followed by an evocative paragraph and one CTA.

**Issue:** The headline is memorable but does not immediately tell a qualified visitor what the business sells. “Brands and interactive 3D experiences” appears inside a longer paragraph, while the site’s actual offer spans websites, brand systems, motion, and automation.

**Recommendation:** Keep the expressive headline, but add a compact descriptor directly above or below it:

> Websites, brand systems, motion, and AI automation for businesses ready to stand apart.

Then make the proof line more decision-useful, for example: `8 services · 6 selected projects · 1 connected team`. Keep the longer brand copy below that.

**Expected impact:** Faster comprehension, stronger first-visit conversion, and less dependence on the visitor opening the menu or scrolling to Services.

### P0 — Give the homepage a visible wayfinding model

**Evidence:** `components/Experience.jsx:31-41` renders nine major beats; `components/Nav.jsx` exposes only a logo, CTA, login, and hamburger; `components/Nav.jsx:27-42` detects light sections but does not expose the current section to the user.

**Issue:** The page behaves like a long cinematic film, but users still need to know where they are, what remains, and how to return to a useful section. The desktop-only scroll count disappears below 900px in `app/styles/nav.css:228-232`, exactly where mobile users need orientation most.

**Recommendation:** Add a compact “journey rail” or bottom/side index with 5–7 plain-language anchors: `Intro`, `About`, `Services`, `Process`, `Work`, `Reviews`, `Contact`. On mobile, use a small expandable “01 / 07 · Services” control rather than a permanent rail. Highlight the active anchor with `aria-current="location"`.

**Expected impact:** Lower abandonment during long scrolls, faster navigation to high-intent sections, and better usability for returning visitors.

### P0 — Make touch/mobile behavior a first-class experience, not a fallback

**Evidence:** `components/sections/Hero.jsx:29-34` disables refraction for coarse pointers; `components/sections/Services.jsx:50-65` disables pointer animation for coarse pointers; `app/styles/responsive.css` mostly changes layout rather than interaction patterns.

**Issue:** The most differentiated interactions are pointer- and hover-oriented. On touch devices, the visitor may get a visually quieter site without an equally clear replacement for hover affordances, row activation, service detail discovery, or 3D feedback.

**Recommendation:** Add explicit touch states:

- Make every service row visibly expandable/tappable, with a chevron and `aria-expanded`.
- Use a simple active-card treatment on tap rather than relying on hover or scroll auto-advance.
- Replace “scroll” microcopy with a visible “Explore services” or “See selected work” action on short mobile screens.
- Test at 320px, 375px, 390px, 768px, and landscape phone widths.
- Add a low-power/static-scene mode when WebGL initialization or frame rate is poor, not only when motion is reduced.

**Expected impact:** Better mobile comprehension and fewer dead-end interaction moments.

### P1 — Reduce abstraction in section naming and copy

**Evidence:** `components/Experience.jsx:33-40` includes `About`, `Services`, `Approach`, `Stories`, `Mark`, `Lab`, `Motion`, and `Contact`; `components/sections/Contact.jsx:19-23` uses “From idea to outcome,” while `Services.jsx:146-149` uses “Focused vision. Measured execution.”

**Issue:** The language is stylish but several labels are not self-explanatory. “Mark,” “Lab,” and “Motion” require interpretation. A visitor evaluating a service provider should not have to decode the information architecture.

**Recommendation:** Keep the expressive section headlines, but pair them with persistent plain-language labels:

- `Mark` → `Brand systems`
- `Lab` → `Experiments / capabilities`
- `Motion` → `Motion design`
- `Stories` → `Client stories`
- `Approach` → `How we work`

Use the plain-language label in navigation, page landmarks, eyebrow text, and analytics; reserve the poetic phrase for the large display headline.

**Expected impact:** Better scanability, clearer SEO/AI comprehension, and stronger alignment between navigation and user expectations.

### P1 — Improve service discovery from “browse” to “choose”

**Evidence:** `components/sections/Services.jsx:167-214` renders eight rows with descriptions, capability chips, and “More info”; `app/services/page.jsx:69-93` repeats the full service grid and FAQ.

**Issue:** Eight services create choice overload, and the homepage does not visibly group them by the problems they solve. The FAQ says “describe the problem, not the service,” but the UI still asks visitors to browse service names.

**Recommendation:** Add a problem-first entry point above the grid:

- “I need a new website”
- “My brand feels inconsistent”
- “I need to automate a manual process”
- “I need motion or an interactive experience”
- “I’m not sure yet”

Each option can reveal the relevant service cluster without replacing the full service list. Add an always-visible “Not sure? Send the brief” action.

**Expected impact:** Higher service-page engagement and less decision fatigue for non-expert buyers.

### P1 — Strengthen work/case-study comparison and proof

**Evidence:** `app/work/page.jsx:63-72` introduces six projects and renders `WorkLibrary`; the page’s copy explains the range but does not expose a fast comparison model in the page code.

**Issue:** Visitors need to quickly answer: “Have they solved a problem like mine?” A library of projects is useful, but the browsing model should expose industry/problem/service/result at a glance.

**Recommendation:** Add filter chips or a lightweight segmented control for `Website`, `Brand`, `Commerce`, `Local service`, `Learning`, `Immersive`. Each card should show one proof line: the problem, the primary service, and the outcome. Do not rely on visual style alone to distinguish projects.

**Expected impact:** Faster proof matching and more case-study opens from high-intent visitors.

### P1 — Make the contact form feel lower-risk and more informative

**Evidence:** `components/sections/Contact.jsx:22-37` asks users to send a brief and offers email as a secondary path; the exact field experience is in `components/marketing/ContactForm.jsx`.

**Recommendation:** Add three trust cues adjacent to the form:

1. **What happens next:** “We reply with fit, scope, timeline, and the first move.”
2. **Expected response time:** only if the business can keep it accurate.
3. **No-pressure language:** “No sales call required; a brief is enough to start.”

Use a short first step with progressive disclosure: project type, desired outcome, timing, then optional budget/context. Preserve a visible email fallback.

**Expected impact:** More completed enquiries and better lead quality.

### P1 — Make the CRM dashboard match its documented “who has the ball” model

**Evidence:** `docs/ux/crm-flow.md:7-24` and `docs/ux/crm-journey.md:20-44` define project health, milestone progress, action-required items, file states, team contact, and sign-off.

**Recommendation:** Treat the dashboard as an action center, not a data overview. The first viewport should contain:

- Project status and health
- `3 of 5 milestones complete`
- A prominent `Needs your action` list
- `Waiting on CD Sportswear` / `Waiting on you`
- Project team contact card
- Latest update with timestamp

For file statuses, use text plus icon and color, not color alone; announce real-time changes through `aria-live="polite"` as already specified in the UX docs.

**Expected impact:** Fewer client follow-ups, faster approvals, and a clearer collaboration loop.

## Secondary improvements

### Improve navigation semantics and active state

The fullscreen menu is carefully implemented (`components/Menu.jsx:15-79`), including focus return, Escape handling, inert state, and a Tab loop. Add an active destination state and a small persistent “Close menu” text label for first-time users who may not recognize the animated burger state. Ensure the current page is exposed with `aria-current="page"`.

### Add a clearer loading and failure story for WebGL

The architecture has `Loader`, `CanvasFeatureBoundary`, and reduced-motion handling, which is a solid base. Add visible fallback copy if the scene fails to initialize or the device is low-power. The site should still communicate offer, proof, and CTA without the canvas.

### Audit text contrast over animated backgrounds

The use of `.text-plate`, focus veils, glass nav, and multiple background stages is visually effective but creates a recurring contrast risk. Test the hero, services, and contact sections against the brightest canvas states at WCAG AA thresholds. Prefer a deterministic text scrim/plate when contrast drops rather than making text shadows do all the work.

### Reduce motion density at decision moments

The page uses scroll choreography, decode text, magnetic buttons, marquee content, 3D camera movement, and pointer effects. Keep motion in the hero and transition zones, but quiet the interface around service selection, case-study metadata, and the contact form. This creates a stronger visual rhythm: spectacle → clarity → action.

### Standardize CTA labels

Use one primary intent consistently: `Start a project`. Secondary CTAs should be explicit about destination/action: `See selected work`, `Explore services`, `How we work`, `Read the case study`. Avoid generic arrows as the only affordance.

## Suggested information architecture

```text
Home
├── Intro / value proposition
├── Services (problem-first entry)
├── How we work
├── Selected work
├── Client stories / reviews
├── About the studio
└── Start a project

Services
├── Websites
├── Brand systems
├── Motion / interactive
├── AI + workflow automation
└── Not sure? Send the brief

Work
├── Filter by problem or service
└── Case study

Client access
├── Dashboard / action center
├── Project timeline
├── Files + approvals
└── Team / support
```

## Recommended implementation sequence

1. **Clarify the hero** with a one-line service descriptor and proof line.
2. **Add responsive wayfinding** with plain-language labels and active state.
3. **Replace hover-only service discovery** with tap/keyboard-expandable rows.
4. **Add problem-first service paths** and stronger case-study metadata.
5. **Refine contact form hierarchy** with next-step and trust cues.
6. **Rework CRM dashboard first viewport** around action-required and ball-in-court states.
7. **Run device/accessibility QA** across mobile sizes, keyboard navigation, reduced motion, contrast, WebGL failure, and slow connections.

## Validation checklist

- Can a first-time visitor explain the offer after 5 seconds on the homepage?
- Can a visitor reach Services, Work, or Contact without opening the fullscreen menu?
- Can a touch user discover every service detail without hover?
- Can a keyboard user operate the menu, service rows, accordions, and form?
- Does the homepage remain useful if WebGL fails or is disabled?
- Do service and case-study pages expose clear problem/service/outcome information before decorative motion?
- Does the client dashboard answer “What changed?” and “What do I need to do?” immediately?

## Review limitations

This was a static repository review. The attached mount showed intermittent filesystem transport errors, and the pinned `pnpm install --frozen-lockfile` process did not complete during the review window, so no rendered-browser visual QA or performance profiling was claimed. The repository metadata scan completed successfully; the deeper archaeology scan could not complete because its temporary clone directory was inaccessible on the attached mount.
