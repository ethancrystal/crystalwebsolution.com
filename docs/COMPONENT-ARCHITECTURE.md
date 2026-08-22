# Component architecture — Crystal Web Solution

*Synthesized 2026-08-19 from a full read of `components/`, `lib/`, and the `app/` route
tree by six parallel mapping agents, merged, then adversarially verified against source.*

**Report only.** Nothing in this document authorizes deleting, merging, or removing any
file. Per `CLAUDE.md`, orphan and duplication findings require owner confirmation before
any action is taken on them.

---

## 1. The shape in one paragraph

Crystal Web Solution is a **Next.js App Router site with a single persistent WebGL stage and a DOM that scrolls over it**, plus a completely separate Supabase-backed CRM sharing nothing but the build. Architecturally it is a *one-clock, singleton-bus* system: `components/SmoothScroll.jsx` owns the only Lenis instance and drives it from `gsap.ticker`, writing per-frame scroll numbers into plain mutable module objects (`lib/scrollState.js`, `lib/pulse.js`, `lib/beacon.js`, `lib/motionScale.js`, `lib/pointerState.js`, `lib/motionFlight.mjs`); `components/Scene.jsx` mounts one R3F Canvas whose actors *read* those objects inside `useFrame`. No props, context, or events ever cross the DOM/canvas boundary, so the import graph systematically understates the coupling. Layered on that spine are three parallel surfaces that reuse the primitives but not the journey: the homepage nine-beat scroll composition (`components/Experience.jsx`), the marketing subpages (`components/marketing/MarketingShell.jsx` → `SubpageExperience.jsx`, each with its own small `IdleScene` canvas), and the CRM (`components/crm/*`, `components/auth/*`), which is pure client React + styled-jsx over Supabase RLS and server actions, with zero animation infrastructure. Data — services, projects, brand, SEO origin — lives in flat `lib/*.mjs` constant modules that are the join keys between DOM, canvas, and route metadata.

## 2. Tier map

### primitive
Leaf, reusable, no knowledge of the journey or of any singleton. **Entry rule:** it renders or decorates one element, takes everything it needs as props, and could be dropped into any page without changing behaviour elsewhere.

| Component | Role |
|---|---|
| `components/BrandLogo.jsx` | Wordmark `<img>` whose alt doubles as SEO anchor text |
| `components/Magnetic.jsx` | Elastic cursor-follow wrapper via `gsap.quickTo`, coarse/reduced-motion gated |
| `components/CardHoverReveal.jsx` | `useCardMouseReveal` hook writing rAF-throttled `--mouse-x/--mouse-y` |
| `components/BorderGlow.jsx` | Conic-masked pointer-reactive card border (see §6) |
| `components/GlyphMask.jsx` | Pointer-masked glyph "decrypt" texture (see §6) |
| `components/DecodeText.jsx` | Per-character scramble-to-reveal text; the Hero headline's entry (`sections/Hero.jsx:6,85,92`) |
| `components/ProjectVisual.jsx` | Procedural gradient project artwork, four positional variants |
| `components/marketing/ServiceEmblem.jsx` | Per-service SVG glyph with `static` / animated / `3d` variants |
| `components/marketing/ImageBlock.jsx` | Blur-to-image `<figure>` cross-fade |
| `components/marketing/Layout.jsx` | `mkt-layout--N` column-grid div |
| `components/crm/Skeleton.jsx` | Shimmer placeholders (`Skeleton`, `SkeletonTable`, `SkeletonDetail`) |
| `components/crm/Spinner.jsx` | Circular loader + `LoadingState` wrapper |

### pattern
Reusable choreography or composition recipes — they wrap arbitrary children and impose motion/structure. **Entry rule:** it wraps `children`, encodes a shared timing/structure decision, and any two call sites should look identical because of it.

| Component | Role |
|---|---|
| `components/SectionReveal.jsx` | Standard one-shot directional clip-path entry using `lib/easing.js` tokens |
| `components/Reveal.jsx` | Plainer rise-and-fade entry (single call site — see §5) |
| `components/SectionHandoff.jsx` | Scrubbed directional mask + settle, the DOM counterpart to a camera move |
| `components/FocusVeil.jsx` | Gradient veil over `[data-quiet]`; **writes `scrollState.focus`** |
| `components/Marquee.jsx` | Infinite ticker on the shared `gsap.ticker`, speed from `scrollState.velocity` |
| `components/ScrollProgress.jsx` | Top progress bar scaled from `scrollState.progress` in the ticker |
| `components/ProjectHandoffLink.jsx` | Striped wipe-out overlay before `router.push` |
| `components/marketing/PageHero.jsx` | Eyebrow + h1 + lede on `.text-plate`, staggered via `SectionReveal` |
| `components/marketing/ContentSection.jsx` | Same recipe at h2 inside a `mkt-section--{tone}` plate |
| `components/marketing/CaseGallery.jsx` | Four-variant `ProjectVisual` grid for a case study |
| `components/marketing/CaseNavRail.jsx` | Prev/next case rail with arrow-key `router.push` |
| `components/marketing/ProcessStepsRail.jsx` | Ref-owner pairing the steps `<ol>` with `ProcessRail` |
| `components/marketing/ServiceGrid.jsx` | Eight-offer index cards |
| `components/marketing/PostBody.jsx` | Token→React blog renderer, no `dangerouslySetInnerHTML` |

### section-beat
A DOM section that occupies a slot in the homepage scroll journey, or a page-scoped decorative block. **Entry rule (homepage):** it needs an `id`, a `STOPS` entry, a `CLUSTERS` depth, a `BEAT_IDS` slot, and a position in `Experience.jsx` — all five or none.

| Component | Role |
|---|---|
| `components/sections/Hero.jsx` | `id="hero"`, quiet; decode headline, writes `pulse` via `blast()` |
| `components/sections/About.jsx` | `id="about"`, quiet; SVG word grid, SMIL scatter |
| `components/sections/Services.jsx` | `id="services"`, quiet; rows + chips, writes `beacon.index` |
| `components/sections/Approach.jsx` | `id="approach"`, quiet; APG accordion, writes `approachBeacon.step` |
| `components/sections/Stories.jsx` | `id="stories"`, quiet; reviews tablist |
| `components/sections/Mark.jsx` | `id="mark"`; SplitType scatter-to-place statement |
| `components/sections/Lab.jsx` | `id="lab"`; sticky DOM/CSS-3D card flight off `LAB_WINDOW` |
| `components/sections/Motion.jsx` | `id="motion"`; selected-work rail of `ProjectHandoffLink` cards |
| `components/sections/Contact.jsx` | `id="contact"`, quiet; CTA + `ContactForm variant="home"` + footer |
| `components/marketing/ServiceThreadArc.jsx` | Services-page decorative arc, one-shot IO draw-in |
| `components/marketing/FoundingRail.jsx` | About-page decorative tick rail, one-shot IO draw-in |
| `components/marketing/ProcessRail.jsx` | Process-page rail, ScrollTrigger-scrubbed fill |
| `components/marketing/ContactPulseLinks.jsx` | Contact links that fire `blast()` on hover/focus |

### canvas-actor
Lives inside an R3F `<Canvas>`; reads singletons in `useFrame`; never renders DOM. **Entry rule:** it is a three.js object, allocates nothing per frame, and gets all cross-boundary input from a singleton read.

| Component | Role |
|---|---|
| `components/three/CameraRig.jsx` | Segment lookup + damped camera, parallax, roll; owns `pointerState` |
| `components/three/FocusDimmer.jsx` | Damps `gl.toneMappingExposure` from `scrollState.focus` |
| `components/three/Crystal.jsx` | Refracting hero icosahedron, roars on `pulse.t` |
| `components/three/Sparks.jsx` | Transient pulse burst point cloud |
| `components/three/Particles.jsx` | Persistent ambient drift field over `VOLUME` |
| `components/three/ServiceRail.jsx` | Eight signal instruments igniting across the services span |
| `components/three/ApproachCompass.jsx` | Four orbiting step markers, spring-driven glow |
| `components/three/BackdropMorph.jsx` | Vast wireframe shell drifting hue/z with progress |
| `components/three/Lights.jsx` | Static rig + Lightformer environment at `CLUSTERS` depths |
| `components/three/Effects.jsx` | Bloom/Vignette, DoF branch behind `motionFlight` |
| `components/three/ServiceEmblem3D.jsx` | Standalone mini-Canvas for `/services/[slug]` |
| `components/three/FlyingCarousel.jsx` | Motion-beat flight stage (see §6) |
| `components/three/CanvasFeatureBoundary.jsx` | Error boundary isolating an additive canvas feature — **not a three.js object**; a React class boundary scoped to canvas subtrees (wraps postprocessing at `three/Effects.jsx:42-49`) |

### shell-layout
Composition roots and chrome that mount other tiers. **Entry rule:** it decides *what exists on a page*, not what anything looks like.

| Component | Role |
|---|---|
| `app/layout.jsx` | Fonts, sitewide metadata, Organization/WebSite JSON-LD, intro-seen bootstrap |
| `app/page.jsx` | Four-line server route mounting `Experience` |
| `components/Experience.jsx` | Homepage root: SmoothScroll + Scene + chrome + nine beats |
| `components/Scene.jsx` | The one fixed WebGL stage — DOM wrapper (`:23`) hosting the Canvas (`:24`) |
| `components/marketing/IdleScene.jsx` | The subpage Canvas host — same shape as `Scene.jsx` (`:41` wrapper → `:42` Canvas); mounts Lights + Crystal + Particles, no journey |
| `components/SmoothScroll.jsx` | The single Lenis/`gsap.ticker` clock; sole writer of progress/velocity |
| `components/Loader.jsx` | Session-scoped intro curtain |
| `components/Nav.jsx` | Homepage header, tone-flip IO, owns Menu state |
| `components/Menu.jsx` | Fullscreen overlay nav with full focus trap |
| `components/marketing/MarketingShell.jsx` | Server pass-through for every subpage |
| `components/marketing/SubpageExperience.jsx` | Client runtime for subpages |
| `components/marketing/SubpageNav.jsx` | Subpage header |
| `components/marketing/MarketingHeader.jsx` | Static no-JS header (see §6) |
| `components/marketing/MarketingFooter.jsx` | Subpage footer from `lib/site.js` |
| `components/marketing/ServicePage.jsx` | One service record → PageHero + ContentSections |
| `components/crm/WorkspaceShell.jsx` | Role-aware CRM chrome, collapsible sidebar |

### feature-panel
A CRM/marketing panel bound to one data shape, usually with its own fetching or mutation. **Entry rule:** it knows a table, contract field, or server action by name.

| Component | Role |
|---|---|
| `components/crm/ProjectThread.jsx` | Realtime message thread + attachments (largest file in family) |
| `components/crm/ProjectFiles.jsx` | Deliverable upload/publish/signed-download |
| `components/crm/NotesPanel.jsx` | Project notes: direct read, `postProjectNote` write |
| `components/crm/EntityNotes.jsx` | Company/contact notes on the direct-table path |
| `components/crm/ProjectApprovals.jsx` | Approve/reject via `updateProjectApproval` |
| `components/crm/ProjectOverview.jsx` | Project summary card |
| `components/crm/ProjectTasks.jsx` | Task list, `readOnly` for clients |
| `components/crm/ProjectTimeline.jsx` | Status-history timeline |
| `components/crm/ProjectOperations.jsx` | Assignments/lifecycle card (see §6) |
| `components/crm/NotificationsPanel.jsx` | Notification list + `markNotificationsRead` |
| `components/MagnifiedBento.jsx` | Services magnifier panel (`'use client'`, `motion/react`) |
| `components/marketing/WorkLibrary.jsx` | `/work` index: filters, count tween, staggered rows |

### form
User input with validation and a submit path. **Entry rule:** it owns field state and calls a server action or API route.

| Component | Role |
|---|---|
| `components/marketing/ContactForm.jsx` | The single contact form, `variant`-parameterised; writes `pulse` on focus |
| `components/auth/PortalLoginForm.jsx` | Three-portal sign-in via the `signIn` server action |
| `components/crm/BriefSubmissionForm.jsx` | New-project brief via `createProject` |

### schema-seo
Emits structured data only. **Entry rule:** its entire output is a `<script type="application/ld+json">` or `<meta>`-adjacent payload.

| Component | Role |
|---|---|
| `components/marketing/BreadcrumbSchema.jsx` | BreadcrumbList JSON-LD, escaped via `safeJsonLd` |
| `components/marketing/FaqSchema.jsx` | FAQPage JSON-LD from `page.faq` |
| `components/marketing/ServiceSchema.jsx` | Service JSON-LD + Organization provider |

### utility
Non-rendering modules: singletons, pure policy, data, hooks, edge gate. **Entry rule:** it exports no React element.

| Module | Role |
|---|---|
| `lib/scrollState.js` | `{ progress, velocity, focus }` — the primary DOM→canvas bus |
| `lib/pulse.js` | `{ t, x, y }` + `blast()` |
| `lib/beacon.js` | `beacon.index`, `approachBeacon.step` + light/dim writers |
| `lib/pointerState.js` | `{ x, y }` NDC pointer |
| `lib/motionScale.js` | Self-written reduced-motion gate `{ value }` |
| `lib/motionFlight.mjs` | Motion-stage lifecycle + subscriber list |
| `lib/journey.js` | `STOPS`, `CLUSTERS`, `VOLUME`, mutable `LAB_WINDOW`/`MOTION_WINDOW` |
| `lib/beatProgress.js` | `BEAT_IDS`, `beatProgress`, `measureBeats(limit)` |
| `lib/sceneActivity.mjs` | Beat activity-window math for idling actors |
| `lib/easing.js` | Named easing/duration/stagger tokens |
| `lib/renderQuality.mjs` / `lib/useRenderQuality.js` | Device tier policy + hook |
| `lib/experienceFeatures.mjs` / `lib/useExperienceFeatures.js` | Feature-gate policy + hook |
| `lib/services.mjs` / `lib/servicePages.mjs` / `lib/serviceSignals.mjs` / `lib/serviceSignalGeometry.mjs` | The eight offers and their signal-keyed extensions |
| `lib/projects.js` / `lib/reviews.js` / `lib/site.js` / `lib/seo.mjs` | Content and brand constants |
| `lib/crmFlag.js` / `middleware.js` / `lib/auth/roles.mjs` / `lib/useUserRole.js` | CRM gating and role resolution |

## 3. The singleton contract

| Singleton | Shape | WRITERS | READERS | Invariants |
|---|---|---|---|---|
| `lib/scrollState.js` → `progress`, `velocity` | numbers, 0–1 / px·s⁻¹ | `components/SmoothScroll.jsx:25-26` (native fallback), `:61-62` (Lenis path) | `ScrollProgress.jsx`, `Marquee.jsx`, `sections/Lab.jsx`, `sections/Services.jsx`, `three/CameraRig.jsx`, `three/Crystal.jsx`, `three/Particles.jsx`, `three/BackdropMorph.jsx`, `three/ApproachCompass.jsx`, `three/ServiceRail.jsx`, `three/FlyingCarousel.jsx` | Exactly one writer. `progress = lenis.scroll / lenis.limit`; anything compared against it must be measured against the same `lenis.limit`. Reduced-motion path forces `velocity = 0` |
| `lib/scrollState.js` → `focus` | 0 or 1 | `components/FocusVeil.jsx:45`, `:68` (teardown) | `three/FocusDimmer.jsx` only | Single writer, single reader — an invisible DOM↔canvas pair with no import edge between them |
| `lib/pulse.js` | `{ t, x, y }`, `blast(x,y)` | `sections/Hero.jsx:64`, `marketing/ContactForm.jsx:133`, `marketing/ContactPulseLinks.jsx:16,17,27,28` | `three/Crystal.jsx`, `three/Sparks.jsx` | Consumers latch on `pulse.t` changing; never reset by readers. **Four writer sites** across two surfaces |
| `lib/beacon.js` → `beacon.index` | index or null | `sections/Services.jsx` (`light`/`dim`) | `three/ServiceRail.jsx` | Hover override; must dim on pointerleave or the rail stays latched |
| `lib/beacon.js` → `approachBeacon.step` | index or -1 | `sections/Approach.jsx` | `three/ApproachCompass.jsx` | Accordion collapsed default (-1) means scroll math owns the highlight |
| `lib/pointerState.js` | `{ x, y }` NDC | `three/CameraRig.jsx:33-34`, `:39-40` | `three/CameraRig.jsx:76-77` | **Same file writes and reads it.** Exists so other actors can subscribe without a second `window` listener; nothing does yet |
| `lib/motionScale.js` | `{ value }` 1 or 0 | itself (module-load `matchMedia` listener) | `three/CameraRig.jsx`, `three/ServiceRail.jsx` | Self-owned; no component may write it |
| `lib/motionFlight.mjs` | `{ progress, active, enabled, prewarm, ready }` | production: only `setMotionReady` from `three/FlyingCarousel.jsx:500,520,598`. `updateMotionFlight`/`resetMotionFlight` (`lib/motionFlight.mjs:15,47`) called only from `tests/latestFeatures.test.mjs` | `three/CameraRig.jsx`, `three/Effects.jsx`, `three/FlyingCarousel.jsx` | Guards differ: `enabled && active` in `CameraRig.jsx:48` and `FlyingCarousel.jsx:533`; `enabled && ready && active` in `Effects.jsx:18`. `enabled` and `ready` both default `false` (`lib/motionFlight.mjs:1-6`) with no production writer |
| `lib/journey.js` → `LAB_WINDOW`, `MOTION_WINDOW` | `{ start, end }` | `lib/beatProgress.js` (`measureStickyWindow`, mutated in place) | `sections/Lab.jsx`, `three/FlyingCarousel.jsx` | Mutated, never reassigned — importers hold the object identity |
| `lib/beatProgress.js` → `beatProgress` | map id→fraction | `lib/beatProgress.js:measureBeats`, called from `SmoothScroll.jsx` under a `<body>` ResizeObserver | `three/CameraRig.jsx`, `three/ServiceRail.jsx`, `three/ApproachCompass.jsx`, `sections/Services.jsx` | `hero` pinned to 0, `contact` pinned to 1 |

**Contract risks**

- **`lib/pulse.js` has four writer sites in three files** across two surfaces (homepage `Hero`, marketing `ContactForm`/`ContactPulseLinks`). It is the only singleton with multi-surface write authority; any new `blast()` caller silently competes for the same crystal.
- **`motionFlight.enabled`, `.active`, `.prewarm`, `.progress` have no production writer.** The only production write is `setMotionReady`, from `components/three/FlyingCarousel.jsx` — a file with no importer (§6). Every flight guard — `enabled && active` in `three/CameraRig.jsx:48` and `three/FlyingCarousel.jsx:533`, `enabled && ready && active` in `three/Effects.jsx:18` — therefore evaluates false in production, making Effects' DepthOfField branch and CameraRig's locked-stop path unreachable.
- **`pointerState` is a write-with-one-reader-in-the-same-file.** `components/three/CameraRig.jsx` is currently both sides; the indirection is forward-looking, not load-bearing.
- **`scrollState.focus` is a one-writer/one-reader pair with no import edge** — `FocusVeil.jsx` ↔ `three/FocusDimmer.jsx`. Deleting or relocating either breaks legibility with no compile error.

## 4. The three coupling planes

**(a) Import graph.** Two roots: `app/page.jsx` → `components/Experience.jsx` → (SmoothScroll, Loader, Nav, ScrollProgress, FocusVeil, dynamic `Scene`, nine beats), and every marketing route → `components/marketing/MarketingShell.jsx` → `SubpageExperience.jsx` → (SmoothScroll, FocusVeil, ScrollProgress, SubpageNav, MarketingFooter, dynamic `IdleScene`). The two shells duplicate the chrome stack deliberately. `components/three/*` is reachable only through `Scene.jsx`, `IdleScene.jsx`, and `marketing/ServiceEmblem.jsx`'s dynamic import of `ServiceEmblem3D`. The CRM subtree is a third, disjoint root under `app/dashboard|team|admin`. `lib/*` is the only shared floor.

**(b) Singleton plane.** Everything in §3. This plane carries *all* DOM→canvas signalling. `components/sections/Approach.jsx` and `components/three/ApproachCompass.jsx` never import each other; they are joined only through `lib/beacon.js`. A refactor tool following imports alone will not see these edges — they are the reason a "harmless" section rewrite can silently freeze a 3D actor.

**(c) Id/ordering plane — verified in sync.** Four ordered lists must agree:

| Plane | Location | Order |
|---|---|---|
| `CLUSTERS` keys | `lib/journey.js:2-12` | crystal(hero), about, services, approach, stories, mark, lab, motion, contact |
| `STOPS` array | `lib/journey.js:14-24` | 9 entries, each `look` referencing the matching `CLUSTERS` key in the same order |
| `BEAT_IDS` | `lib/beatProgress.js:14` | `['hero','about','services','approach','stories','mark','lab','motion','contact']` |
| Section DOM ids | `Hero.jsx:71`, `About.jsx:173`, `Services.jsx:145`, `Approach.jsx:126`, `Stories.jsx:48`, `Mark.jsx:128`, `Lab.jsx:279`, `Motion.jsx:36`, `Contact.jsx:14` | same nine |
| `Experience.jsx` render order | `components/Experience.jsx:32-40` | Hero, About, Services, Approach, Stories, Mark, Lab, Motion, Contact |

**No mismatch found.** Note the render order differs from the *import* order in `Experience.jsx:9-17` (Services/Approach/Stories/Mark are imported before About) — cosmetic only, but it makes the file a poor place to read the journey order from; `lib/beatProgress.js:14` is the canonical list.

Related, also verified: `[data-quiet]` is carried by six beats — `Hero.jsx:74`, `About.jsx:176`, `Services.jsx:145`, `Approach.jsx:126`, `Stories.jsx:48`, `Contact.jsx:14`. `Mark`, `Lab`, `Motion` deliberately omit it, so `FocusVeil.jsx:48`'s `gsap.utils.toArray('[data-quiet]')` yields exactly six triggers.

## 5. Duplication candidates

**Recommendations only — no file may be removed or consolidated without explicit owner confirmation.** Every **Merge** verdict below describes a target shape, not an approved action.

| Components | Why they look overlapping | Evidence | Recommended action |
|---|---|---|---|
| `components/three/ServiceRail.jsx` vs `lib/serviceSignalGeometry.mjs` | Both build the eight signal geometries | `ServiceRail.jsx:134` defines a local `createSignalGeometries()` and calls it at `:274`; `lib/serviceSignalGeometry.mjs:212` exports a function of the same name whose comment reads "used by the homepage rail" — but `ServiceRail.jsx` never imports the module. The comment is contradicted by the import graph | **Merge** — point `ServiceRail` at the lib module, or correct the comment. Highest-confidence duplication in the repo |
| `components/marketing/ServiceEmblem.jsx` vs `components/three/ServiceEmblem3D.jsx` | Same eight-service vocabulary, same `SERVICE_SIGNAL_META` | `ServiceEmblem.jsx` dynamically imports `ServiceEmblem3D` as its `3d` variant; `ServiceEmblem3D.jsx:21` imports `getSignalGeometry` from the shared lib | **Keep both, stated reason:** SVG/static variants must render without shipping a WebGL chunk; the 3D one is behind `next/dynamic(ssr:false)`. Not a duplicate — a wrapper and its heavy variant |
| `components/Reveal.jsx` vs `components/SectionReveal.jsx` | Same wrapper contract, same in-view-or-ScrollTrigger gate, same reduced-motion escape | `Reveal` has **one** call site (`components/sections/Hero.jsx:7`) — `ProcessRail.jsx:8` only names it in a comment. `SectionReveal` has ~15 call sites across sections, marketing patterns, and app routes, and additionally consumes `lib/easing.js` tokens | **Needs owner decision** — the shape is "successor plus one leftover call site", but folding Hero onto `SectionReveal` changes Hero's entry motion |
| `components/SectionReveal.jsx` vs `components/SectionHandoff.jsx` | Both directional clip-path masks over section content on `lib/easing` tokens | `SectionHandoff` uses `scrollTrigger: { scrub: 0.7 }`; `SectionReveal` uses `once: true` | **Keep both, stated reason:** scrubbed-continuous vs one-shot-on-enter are different motion contracts |
| `components/marketing/ProcessRail.jsx` vs `ProcessStepsRail.jsx` | Adjacent names, one imports the other | `ProcessStepsRail.jsx` is a 28-line client wrapper whose only job is owning the `stepsRef` the rail's ScrollTrigger scrubs against, so `app/process/page.jsx` can stay a server component | **Keep both, stated reason:** the split is the server/client boundary. Not duplication |
| `components/crm/NotesPanel.jsx` vs `components/crm/EntityNotes.jsx` | Same notes-list-plus-composer UI | `tests/crm/entity-notes.test.mjs` explicitly asserts `EntityNotes` must **not** contain `postProjectNote|project_status_history`, and that company/contact pages use `EntityNotes` and not `<NotesPanel` | **Keep both, stated reason:** the separation is contract-tested; they sit on deliberately different data paths |
| `components/crm/ProjectFiles.jsx` vs `components/crm/ProjectThread.jsx` | Both run reserve → upload to `project-files` → finalize, plus signed downloads | Both import `createClient` from `lib/supabase/browser` and `createAttachmentDownloadUrl` from `app/actions/project-actions` | **Merge (partial)** — extract a shared upload hook; the deliverable vs message-attachment server actions stay distinct |
| `components/Nav.jsx` vs `components/marketing/SubpageNav.jsx` | Same trio (`BrandLogo` + `Magnetic` + `Menu`), same scroll-glass + `[data-nav-tone="light"]` IO, same `CRM_ENABLED` gate | Both import the identical five modules | **Needs owner decision** — one Nav with a `variant` prop is the obvious collapse, but it touches every route's chrome |
| `components/Experience.jsx` vs `components/marketing/SubpageExperience.jsx` | Identical chrome stack (SmoothScroll + FocusVeil + ScrollProgress + dynamic canvas) | Both compose the same four; beat list and canvas differ (`Scene` vs `IdleScene`) | **Keep both, stated reason:** different canvases and beat sets; consider extracting the chrome tuple |
| `components/Marquee.jsx` vs `components/MagnifiedBento.jsx` | Two infinite horizontal tickers | `Marquee` runs on `gsap.ticker` + `scrollState.velocity`; `MagnifiedBento.jsx:1` is `'use client'` and runs `motion/react`'s own rAF loop — the only per-frame animation on the homepage outside the single clock | **Needs owner decision** — visual duplication is minor, the *engine* divergence is the real issue (see §8) |
| `components/BorderGlow.jsx` vs `components/CardHoverReveal.jsx` vs `components/GlyphMask.jsx` | Three pointer-position-driven card treatments | `CardHoverReveal` is wired into `Approach.jsx` and `Stories.jsx`; the other two have no importers (§6). `GlyphMask.jsx:16` names `BorderGlow` in a comment | **Needs owner decision** — one hover-chrome primitive, three implementations |
| `components/marketing/PageHero.jsx` vs `ContentSection.jsx` | Same eyebrow/title/`SectionReveal` recipe | Differ only in heading level and plate class | **Keep both, stated reason:** h1-vs-h2 semantics; a `level` prop would invite accidental multi-h1 pages |
| `BreadcrumbSchema` / `FaqSchema` / `ServiceSchema` | Three near-identical JSON-LD `<script>` emitters | Only `BreadcrumbSchema.jsx` routes through `safeJsonLd` from `lib/jsonLd.mjs`; the other two use raw `JSON.stringify` | **Merge** into one `<JsonLd data={…}/>` primitive that always escapes — the inconsistency is a correctness gap, not just repetition |
| `components/marketing/FoundingRail.jsx` vs `ServiceThreadArc.jsx` | Identical one-shot IntersectionObserver + `is-visible` draw-in | Same observer/disconnect shape, different SVG | **Merge** the mechanism into a `useRevealOnce` hook; keep both SVGs |
| `components/marketing/ImageBlock.jsx` vs `components/ProjectVisual.jsx` | Raster vs procedural project imagery | `ProjectVisual` is used by `app/work/[slug]/page.jsx`, `WorkLibrary`, `CaseGallery`; `ImageBlock`'s only importer is its test | **Needs owner decision** — see §6; procedural-first is the stated convention |
| `components/crm/Skeleton.jsx` vs `Spinner.jsx` | Two loading primitives | `Skeleton.jsx:4` explicitly states the split and says "Prefer this over Spinner.jsx" | **Keep both, stated reason:** documented complementary roles — though only one is wired (§6) |
| `lib/renderQuality.mjs` vs `lib/experienceFeatures.mjs` (and their hooks) | Two pure-policy modules reading the same media queries | Compact breakpoint disagrees: `lib/experienceFeatures.mjs:1` uses `767.99px`; `lib/renderQuality.mjs:69` and `lib/useRenderQuality.js:10` use `767.5px` | **Merge** the breakpoint constant at minimum; a single motion/capability policy module is the cleaner target |

## 6. Orphan candidates

**These are candidates for OWNER REVIEW ONLY. Nothing in this section is approved for deletion.** Each was re-verified with a repo-wide grep over `app/`, `components/`, `lib/`, `middleware.js` and `tests/`, including `next/dynamic` and string-form imports.

| File | Grep result | Note |
|---|---|---|
| `components/BorderGlow.jsx` | Zero importers. The only repo reference is a prose mention at `components/GlyphMask.jsx:16` | Pointer-reactive card chrome; `CardHoverReveal` occupies the same role in shipped code |
| `components/GlyphMask.jsx` | Zero references of any kind | Its `.motion-card` selector suggests it was attached to the Motion beat |
| `components/three/FlyingCarousel.jsx` | Zero importers. **Distinguish carefully:** `lib/flyingCarouselLayout.mjs` *is* live — imported at `components/sections/Lab.jsx:9,182` and exercised in `tests/latestFeatures.test.mjs`. Only the component file is unreferenced; `components/Scene.jsx` does not mount it | Downstream: it is the sole production caller of `setMotionReady` (`:500,:520,:598`), which is why `motionFlight` is inert (§3, §8) |
| `components/marketing/MarketingHeader.jsx` | Zero references | `SubpageNav.jsx` is the header actually mounted by `SubpageExperience.jsx` |
| `components/crm/ProjectOperations.jsx` | No runtime importer; sole reference is the path string at `tests/crm/responsive-contract.test.mjs:13` | Its assignments block overlaps UI rendered inline in `app/team/projects/[id]/page.jsx` and `app/admin/projects/[id]/page.jsx` |
| `components/crm/Spinner.jsx` | No importer; sole reference is the comment at `components/crm/Skeleton.jsx:4` | Listed as pending work in `STATUS.md` and the plan docs — likely built-ahead, not abandoned |
| `components/marketing/ImageBlock.jsx` | Only importer is `tests/marketing/imageBlock.test.jsx:3` | Raster path displaced by the procedural convention in `CLAUDE.md` |
| `components/marketing/Layout.jsx` | Only importer is `tests/marketing/layout.test.jsx:3` | Name collides with `app/*/layout.jsx` route layouts; unrelated to the route shell |

Also worth owner review, though not orphaned components: `lib/sceneActivity.mjs`'s object-taking `isBeatActive`/`getBeatActivityWindow` pair and `lib/motionFlight.mjs`'s `updateMotionFlight`/`resetMotionFlight` are exercised only by `tests/latestFeatures.test.mjs`, not by production code.

## 7. Where a new component goes

```
Does it render a three.js object?
├─ YES → components/three/*  [canvas-actor]
│   Contract: mount it inside components/Scene.jsx (or IdleScene.jsx for subpages).
│   Read cross-boundary state ONLY from lib/* singletons inside useFrame.
│   Pre-allocate every THREE.Vector3/Quaternion at module scope — zero allocation per frame.
│   Damp with 1 - Math.exp(-dt * k), never a fixed lerp factor.
│   If it can fail (postprocessing, textures), wrap it in three/CanvasFeatureBoundary.jsx.
│   Teardown: dispose geometries/materials; remove any window listener you added.
│
└─ NO → Is it a homepage scroll beat?
    ├─ YES → components/sections/*  [section-beat]
    │   Contract: FIVE edits move together or the camera desyncs —
    │     (1) section id in the JSX, (2) CLUSTERS key + (3) STOPS entry in lib/journey.js,
    │     (4) BEAT_IDS slot in lib/beatProgress.js:14, (5) position in components/Experience.jsx.
    │   Add [data-quiet] only if it is text-legibility-critical (FocusVeil.jsx:48 picks it up).
    │   Talk to the canvas by writing a lib/* singleton — never props or context.
    │   Teardown: kill every ScrollTrigger, gsap.ticker.remove every callback,
    │   disconnect every ResizeObserver/IntersectionObserver, dim any beacon you lit.
    │
    └─ NO → Is it CRM/auth?
        ├─ YES → components/crm/* or components/auth/*  [feature-panel | form | primitive]
        │   Contract: 'use client' + scoped styled-jsx against the global CRM tokens.
        │   Project-delivery data → read via lib/crm/projects.js against
        │     lib/crm/project-contract.mjs; write ONLY through app/actions/project-actions.js.
        │   Companies/contacts/deals/tasks/users → lib/supabase/browser.js + RLS.
        │   Never offer `admin` as an assignable role (migration 0014 pins it).
        │   Keep tests/crm/ in step. No gsap, no scroll singletons in this tree.
        │
        └─ NO → Is it non-homepage marketing page content?
            ├─ YES → components/marketing/*  [pattern | shell-layout | schema-seo]
            │   Contract: server component by default; add 'use client' only for a listener.
            │   Wrap entries in components/SectionReveal.jsx. Build URLs from
            │     lib/seo.mjs absoluteUrl(). Escape JSON-LD via lib/jsonLd.mjs safeJsonLd.
            │   Visuals stay procedural (SVG/CSS/three geometry) per CLAUDE.md.
            │
            └─ NO → components/*  [primitive | pattern]
                Contract: props only; no journey knowledge; no singleton reads unless it
                is explicitly a chrome piece. Use lib/easing.js tokens, never inline eases.
                Any per-frame work rides gsap.ticker — do NOT start an independent rAF loop.
                Every animation useEffect returns a teardown.
```

Universal, regardless of branch: honour `prefers-reduced-motion` with a static fallback (`components/Loader.jsx`, `components/SectionHandoff.jsx`, `components/sections/Lab.jsx` are the reference patterns), never enable `reactStrictMode`, and run `pnpm test` plus `pnpm build` before a PR into `main` — merging to `main` deploys production.

## 8. Structural risks

1. **The Motion flight stage is wired but unreachable, and nothing fails loudly.** `components/three/FlyingCarousel.jsx` has no importer and `components/Scene.jsx` never mounts it, so its `setMotionReady` calls at `:500,:520,:598` never run and `motionFlight.enabled`/`.ready`/`.active` are never written outside `tests/latestFeatures.test.mjs` (all default `false` at `lib/motionFlight.mjs:1-6`). Consequence: the DepthOfField branch in `components/three/Effects.jsx` and the locked-stop path in `components/three/CameraRig.jsx` are permanently dead code that still costs review attention and still constrains those files' shape. Risk: someone "fixes" the guards without knowing the writer is absent.

2. **The ordering plane is four hand-maintained lists with no test that compares all four.** `lib/journey.js:2-12` (CLUSTERS), `:14-24` (STOPS), `lib/beatProgress.js:14` (BEAT_IDS), the nine section `id=` attributes, and the render order in `components/Experience.jsx:32-40` are in sync today (§4c) — but the coupling is convention-only. Adding a tenth beat and forgetting `BEAT_IDS` yields a camera that lerps to the wrong stop with no build error. A single assertion comparing `Object.keys(CLUSTERS)` (hero-aliased), `STOPS.length`, `BEAT_IDS`, and the ids grepped from `components/sections/` would close it.

3. **`components/MagnifiedBento.jsx` runs a second animation clock.** It is `'use client'` and drives its marquee rows on `motion/react`'s own rAF loop, outside the `gsap.ticker`/Lenis clock that `components/SmoothScroll.jsx` establishes as the single authority. Two independent loops means `lagSmoothing(0)` no longer governs everything on screen, and jank in one is invisible to the other's frame budget. Every further `motion/react` component compounds it.

4. **Three disagreeing capability gates.** `lib/motionScale.js`, `lib/renderQuality.mjs` and `lib/experienceFeatures.mjs` each read `prefers-reduced-motion` independently, and the compact breakpoint differs — `767.99px` at `lib/experienceFeatures.mjs:1` versus `767.5px` at `lib/renderQuality.mjs:69` and `lib/useRenderQuality.js:10`. At widths between those values the render tier and the feature gate can disagree about the same device, producing a configuration nobody designed or tested. The two hooks also duplicate matchMedia subscription scaffolding.

5. **Live keyboard defect in the Stories tablist.** `components/sections/Stories.jsx:145` defines `onTabKeyDown` at module scope; at `:166` it calls `activateTab`, which is declared inside the component body at `:42`. It is wired to the tabs at `:75`, so ArrowLeft/ArrowRight/Home/End on a review tab throws a `ReferenceError`. This is an accessibility regression in shipped homepage markup and a warning about the file's shape (handlers hoisted out of the component lose their closure).

6. **Two sources of truth for the CRM role.** `middleware.js:71` authorizes from a `profiles` table query; `lib/useUserRole.js:24` reads `user?.app_metadata?.role` from the JWT, and its comment at `:6-7` asserts the two agree. They read different stores and will drift if the claim is not resynced on a role change. The client hook gates UI only — RLS gates data — but a drifted claim shows a user affordances the database will reject.