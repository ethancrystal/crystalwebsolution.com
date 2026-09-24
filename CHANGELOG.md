## v1.51 — 2026-09-23

Move the CRM admin to Moiz Jamil (owner-approved).

- **Migration `0043_pin_admin_to_moiz.sql`.** `public.pinned_admin_email()`
  now returns `moizj00@gmail.com`. The old admin, `ethan@cdsportswearinc.com`,
  had never signed in. The existing `moizj00@gmail.com` account (currently a
  client) is promoted to admin, and any other admin is demoted to
  `project_manager`, following 0042's pattern. The single-admin design from
  0014 is unchanged: one pinned address, a unique index and a trigger.
  Applying the migration to production is a separate step from merging.
- Lead-capture RPCs (0026, 0029) attribute new leads to the pinned admin, so
  new leads now attribute to Moiz.
- `scripts/provision-crm-test-users.mjs` and the 0042 pgTAP check follow the
  new pin. New contract test: `tests/crm/migration-0043-pin-admin-to-moiz.test.mjs`.
- Password reset needs no code change. `/forgot-password` already emails a
  recovery link through Resend, and `/auth/reset-password` sets the new
  password and sends an admin to `/admin`.

## v1.50 — 2026-09-23

Install the blog publish workflow. It was built in v1.25 but never installed.

- **`docs/seo/seo-publish-blog.yml.pending` moves to
  `.github/workflows/seo-publish-blog.yml`.** On every push to `main` that
  touches `docs/seo/drafts/blog/**` or `scripts/seo/publish-blog-drafts.mjs`,
  it runs the publish script. The script upserts drafts marked
  `approved: true` into `blog_posts` as `status: draft`. It never publishes,
  and it never overwrites a row that is already published. A person still
  takes each post live from `/admin/blog`. It can also be run by hand from
  the Actions tab, where it defaults to a dry run.
- The `dry_run` input and the event name now reach the shell through `env:`
  instead of being written into the script text.
- The repo secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and the
  `SEO_BLOG_COVERS_BUCKET` variable were already set, so the workflow is live
  as soon as this merges. Merging it does not trigger a run, because the
  workflow file is not in its own `paths` filter.
- **Known gap:** the `blog-covers` bucket that `SEO_BLOG_COVERS_BUCKET` names
  does not exist in Supabase. No draft uses a cover image yet. Details are in
  `docs/seo/OPERATIONS-MANUAL.md` item 8.

## v1.49 — 2026-09-23

Blog draft for Jira KAN-11, under SEO theme 2 (digital marketing). This is
docs only, with no route or code change.

- **`docs/seo/drafts/blog/sportswear-marketing-strategy.md`**, marked
  `approved: false`. It's a B2B sportswear marketing strategy for brands that
  sell to teams, clubs, schools and wholesale buyers. It covers the buying
  committee, planning backwards from the season calendar, the reorder path,
  how to show decoration work, channel choice and measurement. It targets
  `sportswear marketing strategy` (390/mo, difficulty 27) and
  `sportswear marketing plan` (50/mo, difficulty 24), both from Ubersuggest in
  the US on 2026-09-23. The SERP is informational (Forbes, Deloitte,
  launchmetrics), and one DA-14 agency blog ranks #8. It links internally to
  `/services/digital-marketing`, `/services/seo`,
  `/embroidery-screen-printing-web-design`, `/blog/web-development-rfp-guide`
  and `/contact`. It contains no statistics, client names or outcomes.
- Both keywords are added to `docs/seo/KEYWORD-REGISTRY.md`, mapped to
  `/blog/sportswear-marketing-strategy`.
- The publish pipeline only upserts drafts with `approved: true`, so this
  lands nowhere until MJ approves it.

## v1.48 — 2026-09-23

SEO internal links and IndexNow fixes from Jira KAN-12 and KAN-15.

- **Service pages now link back to their blog posts (KAN-12).** The blog
  posts already linked to their service pillars, but no service page linked
  to any post. `/services/branding` and `/services/logo-design` now link to
  `/blog/branding-and-web-design-studio`. Web design, web development, AI
  automation and workflow automation also link to their published posts. The
  links sit in a "Further reading" section that reuses the existing
  related-links markup, and the data is in `GUIDE_LINKS` in
  `lib/servicePages.mjs`. `ai automation agency` is mapped to
  `/services/ai-automation` in the keyword registry, so the anchor pointing at
  `/blog/ai-automation-agency` avoids that term and doesn't make the post
  compete with its own pillar.
- **`/blog/ai-automation-agency` and `/blog/custom-react-nextjs-web-development`
  get specific "Next" links (KAN-15).** They used to fall back to the generic
  Services / Work / Contact set.
- **Every IndexNow ping sent by `scripts/seo/indexnow-ping.mjs` had two
  errors (KAN-15).** `host` was sent as `https://www.…` instead of a bare
  hostname, and `keyLocation` pointed at `/public/<key>.txt`, which 404s
  because Next.js serves `public/` at the root. The key file itself is live at
  `/<key>.txt`. The payload now matches the IndexNow documentation. URLs are
  filtered by exact origin, and the script only runs `main()` when it is
  executed directly. IndexNow can answer 202 ("key validation pending"), so
  the failures may never have shown up as errors.
- New contract tests in `tests/seo-internal-links.test.mjs`.

## v1.47 — 2026-09-22

Follow-up to v1.44 to v1.46 (#217). Both fixes below were pushed to that branch just after it
merged, so neither shipped with it.

- **Hero backgrounds covered only part of the hero** (owner report, most
  visible on `/services`). Three stage modules, dot-field, letter-glitch and
  ripple-grid, resized only when the window resized, and two of them pin
  the canvas to fixed pixel sizes. Inside a hero the box keeps changing
  height after mount as fonts load and reveals run. So the canvas stayed at
  its first, smaller measurement. All three now watch their container with
  a ResizeObserver, like the other four already did, and a test pins it for
  all seven. The viewport-tuned `.alive-overlay` vignette also crushed the
  hero's side edges, and its third glow sat dead centre. Both are
  re-tuned inside the hero so the light spans the full width.
- **Reduced motion now stops the animation, not just hides it.** A module
  hidden with `display: none` still ran its requestAnimationFrame loop and
  held a WebGL context. `DarkPageBackground` no longer mounts the module under
  `(prefers-reduced-motion: reduce), (max-width: 767px)`, and it unmounts the
  module if the preference changes mid-session. This covers auth pages too.
- A shared diagonal "brand streak" across every hero was tried and then
  removed at the owner's request. It does not ship.
- **Service marks start still.** `ServiceGlyph`'s reduced-motion hook started at
  `false`, so the SMIL marks could animate for one render before the visitor's
  preference was read. It now starts at `true`, and motion turns on only after
  matchMedia confirms it is allowed.

## v1.46 — 2026-09-22

Make the service emblems mean something. The owner's read of the previous
set — "these blue shapes that each page has" — was fair: every service page
opened on an abstract 3D object that said nothing about the service.

- **Root cause was motion, not just shape** — `ServiceEmblem3D` spun each
  form a full 360 degrees on Y. The forms were authored to be read face-on
  (a viewport with a cursor, a layered stack), so half of every cycle showed
  them edge-on, collapsed into an unreadable sliver. The spin is replaced by
  a bounded sway (about 23 degrees of yaw, 7 of pitch; `rotSpeed` still sets
  each signal's tempo). The form now always faces the reader and still reads
  as a solid with depth on its edges. Scale 1.35 to 1.5.
- **Forms rebuilt as literal objects** in `lib/serviceSignalGeometry.mjs`,
  still procedural primitives, still one source of truth shared with the
  homepage rail: browser window (web), `</>` (development), tag with eyelet
  (brand), constructed mark in a ring (logo), megaphone (marketing), play
  button (animation, still the one wireframe form), thickened node network
  (ai), thickened relay with arrow (workflow), magnifying glass (seo). The
  brand form took three tries: two card-stack versions fused into one blob
  in a single flat colour; the tag works because its outline alone is
  iconic, the same reason the magnifier and play button work.
- **Inline SMIL marks redesigned** and moved to `components/marketing/
  ServiceGlyph.jsx` (single source, shared by `ServiceEmblem`). Each shows the
  service's value rather than decorating: a headline that writes itself and
  a CTA that lands, a funnel that converts, a result that climbs to first.
  Reduced-motion still strips SMIL from the tree.
- **Tooltip copy extracted** to `lib/serviceSignalBlurbs.mjs` so it is not
  duplicated. `vitest.setup.js` gains a `matchMedia` shim, matching its
  existing `ResizeObserver` one, so components that gate on reduced motion
  can render under jsdom.
- **Scope note** — an SVG-only hero variant was built and verified, then
  dropped the same day when the owner chose to keep React Three Fiber. Only
  the shared geometry, the sway, the SMIL glyphs and the blurb extraction
  ship.

## v1.45 — 2026-09-22

Extend the hero stage to the four index/detail surfaces the owner asked for,
each with its own React Bits module, restyled to site tokens and dimmed to a
single shared level.

- **New stages** — `/services/[slug]` gets prism, `/work` ripple-grid, `/blog`
  liquid-ether, `/reviews` dot-field. Seven modules exist and the four
  top-level pages already take one each, so `reviews` reuses dot-field, the
  quietest of the set and the right register for a text-dense page.
- **Brand colors enforced at the source** — ripple-grid shipped vendor purple
  `#8a5cff` and liquid-ether `['#5227FF','#89f7ff','#B497CF']`. Both now
  default to site tokens (`--blue` `#3c6cff`, `--cyan` `#59f3ff`, `--muted`
  `#8b98b8`), so no code path can render the demo palette. Prism gained a
  `saturation` prop (defaulting to the vendor value, so existing behavior is
  unchanged) and the wrapper pulls it to near-monochrome with a cyan hue
  shift, low glow/bloom and a slow `timeScale`.
- **One prominence knob** — `.mkt-hero-stage { opacity }` sets how loud every
  stage reads, instead of editing each module. Full-viewport auth surfaces
  are unaffected.
- **Band variant** — `/work`'s first section is the entire index, so it has no
  hero box to fill. `HeroStage variant="band"` paints a height-capped band at
  the top of the container, fading into `--bg` before the project library.
- **Scope** — `/work/[slug]`, `/blog/[slug]`, the embroidery pillar,
  `/privacy` and `/terms` were not requested and still get no stage. The
  no-fallback rule from v1.44 is unchanged and still covered by tests.

## v1.44 — 2026-09-22

Scope the animated stage background to the hero on the four main marketing
pages; remove it from every inner page it had leaked onto.

- **Bug fix** — the cyan/silver stage (acid-squares, dot-field,
  faulty-terminal, letter-glitch) rendered `position: fixed`, so it covered
  the full scroll height of any page through `SubpageExperience`, and a
  silent `|| 'acid-squares'` fallback meant it also showed on pages with no
  assigned variant: `/services/[slug]`, `/work`, `/work/[slug]`, `/blog`,
  `/blog/[slug]`, `/reviews`, `/privacy`, `/terms`, and the embroidery
  pillar page.
- **Fix** — the stage now mounts inside `PageHero`'s `.mkt-hero` section via
  a new `HeroStage` component and `StageContext`, with CSS that forces the
  shared background modules to `position: absolute` inside `.mkt-hero-stage`
  so each one fills the hero box and fades out before section 2, instead of
  running the page's full height. `marketingStageBackground()` no longer
  falls back to `acid-squares`; only `/about`, `/services`, `/process`, and
  `/contact` (the four `MARKETING_STAGE_BACKGROUNDS` entries) get a stage.
  `/privacy` and `/terms` no longer pass a `sceneVariant`. Homepage
  (`Scene.jsx`/crystal journey) and auth pages are unchanged.
- **Tests** — `tests/marketing-stage-background.test.mjs` rewritten to
  assert the stage is hero-scoped, has no fallback, and privacy/terms
  request no variant.
- **Platform-version reconciliation** — `package.json` has run Next 16
  (`^16.3.5`) since dependabot's #204, but the contract test still asserted
  major `15`, so `pnpm test` exited 1 on `main`. Updated the assertion to 16
  and renamed the file from `tests/crm/next15-upgrade.test.mjs` to
  `tests/crm/next-platform-contract.test.mjs` so the name stops naming one
  version. The same stale "Next.js 15" claim was corrected in the active docs:
  `README.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `MEMORY.md` and
  `docs/SENTRY-NEXTJS.md`. Dated plans under `docs/plans/` keep their Next 15
  wording as historical record; the two most likely to mislead now carry a
  historical note instead.
- **README migration range** — replaced the stale `0001` through `0011`
  statement (the directory head is `0042`, 43 files) with a pointer to inspect
  the directory, matching the rule already stated in `CLAUDE.md`.
- **Versioning note** — this release takes v1.44, not v1.43. The merge commit
  `f0290ae` was titled `v1.43 — AI visibility + technical SEO assets (#212)`
  and deployed under that name, but it bumped neither `VERSION` nor
  `CHANGELOG.md`, so the files stayed at v1.42. v1.43 is therefore already
  spent on a shipped deploy; reusing it would put two different deploys under
  one name. There is intentionally no v1.43 entry below.

## v1.42 — 2026-09-20

SEO content lane: publish-ready web-design-RFP blog draft for the /services/web-design pillar.

- **Content** — Added `docs/seo/drafts/blog/how-to-write-a-web-design-rfp.md`:
  a complete, publish-ready web-design-RFP writer's guide with copy-paste template, 6-criterion
  scorecard, "before you send it" checklist, and call questions. Target keywords `web design rfp`
  and `how to write a web design rfp` (both added to KEYWORD-REGISTRY.md; figures unavailable until
  tracked in the Ubersuggest project). Supports the `/services/web-design` pillar (Theme 1) and
  cross-links to the existing `/blog/web-development-rfp-guide`. `approved: false` — MJ-only gate.
- **Keywords** — Registered two new mapped rows in KEYWORD-REGISTRY.md. No volume/difficulty/CPC
  figures claimed; both marked unavailable pending tracking in project `109eb168…` (needs MJ's yes).

## v1.41 — 2026-09-20

Clean up stale identity, domain, and migration claims across agent
instruction files and the CRM feature flag comment.

- **Identity disambiguation** — CLAUDE.md and AGENTS.md now explicitly
  distinguish repo name (`ethancrystal/crystalwebsolution.com`), business
  name (CD Sportswear INC), and live domain
  (`https://www.cdsportswearinc.com`). `crystalwebsolution.com` is
  a retired domain, not a business name or current URL.
- **Business name fix** — `CD Sportswear USA` corrected to `CD Sportswear INC`
  in CLAUDE.md, AGENTS.md, and MEMORY.md project-overview sections
  (matching `lib/site.js` `name: 'CD Sportswear INC'`).
- **Migration count** — AGENTS.md and MEMORY.md updated from `0001` through
  `0023` to `0001` through `0042` (verified against `supabase/migrations/`).
- **Stale migration 0024 entry** removed from MEMORY.md.
- **Deployment target** — MEMORY.md §4 corrected from `crystalwebsolution.com`
  to `https://www.cdsportswearinc.com`.
- **AGENTS.md gaps filled** — added missing commands (`pnpm test:db`,
  `pnpm crm:verify`, `pnpm crm:provision-test-users`, `pnpm livecheck`),
  `lib/seo.mjs` canonical-origin documentation, `www.cdsportswearinc.com`
  host convention, `docker-ci.yml` reference (was `docker-publish.yml`),
  and SEO agent (Hermes) section.
- **Gap labeling** — CLAUDE.md gap claims now labeled as
  `last confirmed 2026-09-11, owner to re-verify` instead of
  presented as current facts. Migration `0042` claim is conditional
  (verified applied to live DB is unknown).
- **Retired domain block** — CLAUDE.md condensed ~25 lines of domain
  transition history into a single factual sentence.
- **lib/crmFlag.js** — comment updated to reflect CRM launched
  2026-08-27 instead of `still in progress`.
- **middleware.js** — CLAUDE.md reference corrected from literal
  `middleware.js` file to conceptual `edge middleware`.

# Changelog

Every production deploy of crystalwebsolution.com gets one entry here, newest
first. The version format and rules live in `VERSIONING.md`. The version in
the top entry of this file is always the version currently in production (or
about to be, if the PR hasn't merged yet).

## v1.40 — 2026-09-20

Animated backgrounds on inner marketing pages and auth. Homepage WebGL
crystal journey is unchanged.

- **Stage** — `SubpageExperience` mounts `DarkPageBackground` instead of the
  idle Crystal canvas, which was hidden behind an opaque page fill.
- **Family** — Acid Squares, Dot Field, Faulty Terminal, and Letter Glitch
  (React Bits JS-CSS ports) restyled to cyan / silver / black-blue. About
  uses acid-squares, services uses dot-field, process uses faulty-terminal,
  contact uses letter-glitch. Login / portal use the CRT terminal; signup
  uses the dot field; forgot / reset / confirm use letter glitch. Prism,
  ripple-grid, and liquid-ether stay registered as fallbacks.
- **Fill** — `.mkt-shell` and `.subpage` no longer paint solid `--bg`, so the
  procedural stage reads through pitch-black heroes.

## v1.39 — 2026-09-19

SEO service page: `/services/seo`, the pillar for theme 4 of
`docs/seo/STRATEGY.md` (head term "search engine optimization agencies";
"seo agency near me" secondary on the same page). No homepage or WebGL rail
change — the page is a **standalone** entry in `lib/servicePages.mjs`, not
a ninth `SERVICES` signal, so the homepage keeps eight rows and eight rail
instruments.

- **`/services/seo`** — rendered by the existing `/services/[slug]` template
  with a full content entry; conversion rate optimization is a capability,
  a deliverable, a process step and an FAQ item of this page, not its own
  page. Listed as "09 · SEO" on `/services` and in `/sitemap.xml` via
  `SERVICE_PAGE_SLUGS`; Service / Breadcrumb / FAQ schema as the other eight.
- **Internal links** — Web Design and Digital Marketing gain SEO in their
  related services, so the pillar is not an orphan.
- **Emblems** — a hand-drawn "results ladder" SVG glyph and a page-only 3D
  "beacon" geometry (`getSignalGeometry('seo')`); `createSignalGeometries()`
  (the rail) is unchanged at `SERVICES.length`.
- **Tests** — `RAIL_SERVICE_PAGES` export; marketing tests split rail parity
  (8) from the full page list (9) and assert the pillar has ≥2 inbound links.

## v1.38 — 2026-09-19

Evidence-based SEO audit pass. Extends the existing `lib/seo.mjs` origin
architecture; does not add a second metadata or schema system. No homepage
or WebGL visual change.

- **Canonical host hygiene** — `toSitePath()` rewrites owned-host absolute
  URLs (www, apex, retired `cdsportswearusa.com`, hijacked
  `crystalwebsolution.com`) to site-relative paths. Blog markdown `safeHref`
  uses it so published posts that still link the apex or a retired domain
  do not send crawlers through a 308, a 404, or the Slot Gacor spam site
  currently answering `crystalwebsolution.com`.
- **Internal linking** — Blog added to `SITE.nav` and the marketing footer.
  Service pages that have matching case studies now link them; case studies
  link related services and Contact. Blog posts link the matching service
  cluster plus other published posts. `/blog` listing gains a Contact CTA.
- **Auth OG URLs** — `/login` and `/signup` now emit their own `og:url`
  instead of inheriting the homepage URL.
- **404 robots** — `app/not-found.jsx` is the single `noindex, nofollow`
  signal for missing URLs (production currently emits both `noindex` and
  the root layout's `index, follow`).
- **Legal dates** — Privacy and Terms use a fixed `LAST_UPDATED` instead of
  `new Date()` at render.
- **Sentry CSP** — `connect-src` allows `https://*.ingest.us.sentry.io` so
  client envelopes are not blocked (still absent on the live CSP as of
  2026-09-19).
- **Shopify landing** — `/hire/shopify-developer` is **not** built. Keyword
  demand remains, but Shopify is not in the live service list. Parked in
  `docs/seo/KEYWORD-REGISTRY.md`. Details in `docs/seo/runs/2026-09-19.md`.

No invented rankings, traffic, or case-study outcomes. Measurement (GSC/GA4)
remains Mode A — not live to this run.

## v1.37 — 2026-09-11

Owner-approved cutover of two live-database references that still named
the retired `crystalwebsolution.com` host after the second domain move.

- **pg_cron drain URL** — migration `0042` unschedules and reschedules
  `drain-crm-outbox` to POST
  `https://www.cdsportswearinc.com/api/cron/crm-notifications` (matches
  `SITE_ORIGIN` in `lib/seo.mjs`). `0025` is left untouched as history.
  Until this migration is applied on the live database, a previously
  applied `0025` job still calls the dark host every five minutes; Vercel
  Cron (`vercel.json`, daily 13:00 UTC) remains the backstop.
- **Pinned admin mailbox** — `public.pinned_admin_email()` now returns
  `ethan@cdsportswearinc.com`. If the old Auth user still exists and the
  new address is free, the migration renames that login in place; if both
  addresses exist, it demotes the old admin to `project_manager` and
  promotes the named address. Lead-capture RPCs (0026, 0029) resolve the
  admin actor through this function, so the pin and the login have to
  move together.
- Merging deploys the Next.js app; it does **not** run SQL. Applying
  `0042` (and any earlier unapplied migrations, including `0041`) on the
  live Supabase project is a separate owner action.
- No layout, motion, or CRM UI changes.

## v1.36 — 2026-09-11

Closes part of the gap `CLAUDE.md` flags around the domain's second move
(`cdsportswearusa.com` → `cdsportswearinc.com`, confirmed 2026-09-03):
`supabase/config.toml`'s Auth `additional_redirect_urls` allow-list was
never updated past the original `crystalwebsolution.com` entries from
before either move. Password-reset, invite, and confirmation links are
built in `lib/supabase/admin.js`'s `buildVerifyUrl()` as
`${NEXT_PUBLIC_APP_URL}/auth/verify?...`, and Supabase's GoTrue validates
that target against this allow-list server-side before `generateLink()`
will even issue a link.

- Added `https://cdsportswearinc.com/**` and `https://www.cdsportswearinc.com/**`
  to `additional_redirect_urls`. Kept the retired `crystalwebsolution.com`
  and `cdsportswearusa.com` entries in place (harmless — both are dead
  hosts today) rather than pruning them.
- This fixes the allow-list half of the gap only. The other half —
  `NEXT_PUBLIC_APP_URL` in Vercel's Production environment variables, which
  is what actually gets baked into the link's host — is a Vercel dashboard
  setting outside this repo; verified 2026-09-11 that `cdsportswearusa.com`
  now 404s (`DEPLOYMENT_NOT_FOUND`, detached from the Vercel project) while
  `https://www.cdsportswearinc.com` is the live site, so if `NEXT_PUBLIC_APP_URL`
  is still set to the old domain, reset/invite/confirm emails will keep
  linking to a dead host until it's updated to
  `https://www.cdsportswearinc.com` (matching `SITE_ORIGIN` in
  `lib/seo.mjs`) and Production is redeployed — `NEXT_PUBLIC_*` values are
  inlined at build time, so the env var alone won't fix already-built
  deploys.
- No application code changed; no layout, motion, or CRM behaviour changes.

## v1.35 — 2026-09-10

Brand name and contact-email text catch-up following v1.34's wordmark swap:
the visible legal/brand name was still "CD Sportswear USA" and the sales
inbox was still on the retired `cdsportswearusa.com` domain everywhere text
renders it. `SITE.name` and `SITE.email` in `lib/site.js` are the single
source of truth for the nav, footer, contact page, and page metadata, so
updating those two fields there propagated the fix across the site. The
phone number was already correct (`+1 804-280-4941`) and needed no change.

- **Brand name** — `CD Sportswear USA` → `CD Sportswear Inc` in `SITE.name`,
  the `crystal-web-solution` case-study title/body in `lib/projects.js`,
  historical client review quotes in `lib/reviews.js`, and every page
  metadata description/copy string across `app/**` and
  `components/sections/{About,Lab,Motion}.jsx` that spelled the name out
  literally instead of reading `SITE.name`.
- **Sales email** — `sales@cdsportswearusa.com` → `sales@cdsportswearinc.com`
  in `SITE.email`; the transactional-email sender address in
  `lib/email/resend.js` moved from `no-reply@cdsportswearusa.com` to
  `no-reply@cdsportswearinc.com` to match.
- Updated the test suite's brand/email assertions
  (`tests/site-brand.test.mjs`, `tests/email.test.mjs`,
  `tests/content.test.mjs`, `tests/projects.test.mjs`,
  `tests/marketing.test.mjs`, `tests/latestFeatures.test.mjs`,
  `tests/crm/notification-coverage.test.mjs`,
  `tests/marketing/serviceSchema.test.jsx`) to match.
- No layout, motion, or CRM behaviour changes.

## v1.34 — 2026-09-08

Brand lockup swap: the supplied CD SPORTSWEAR INC wordmark replaces the
outgoing USA wordmark everywhere it renders, and the browser/app icon is
re-cut from the same art. Owner-supplied artwork; no layout, motion or CRM
behaviour changes.

- **Logo** (`public/cd-sportswear-usa-logo.png`) — replaced with the supplied
  INC lockup at 2304x412. `SITE.logoPath` is the single source of truth, so
  the swap propagates on its own to the homepage nav, the marketing header,
  the subpage nav, the marketing footer, the CRM workspace shell, the portal
  login form, `/login`, `/signup`, the transactional email header, and the
  `logo` / `image` nodes in the site-wide JSON-LD graph. The filename is
  deliberately unchanged: transactional emails already delivered reference
  this absolute URL, and renaming would break the header image in every one
  of them.
- **Background key** — the supplied art arrived composited on solid black
  (alpha 255 across the whole canvas). Every consumer needs transparency
  instead: the nav inverts the mark via `.nav-on-light .nav-logo-art img`,
  and the email header sits on a white body, so an opaque plate would have
  shown as a black box and, inverted, as a white one. The black was keyed to
  alpha with a 24/205 luminance knee — a straight key left the source's soft
  glow as a grey halo that read as a smudge once inverted — and colours were
  un-premultiplied so antialiased edges carry no dark fringe.
- **Dimensions** (`lib/site.js`) — `logoHeight` 398 -> 412 to match the new
  intrinsic height. `logoWidth` stays 2304. The canvas reproduces the
  outgoing asset's padding ratio (content at ~84.5% of canvas height), so
  every fixed `object-fit: contain` box renders the new lockup at the same
  optical size as the old one and nothing reflows.
- **Icon** (`app/icon.png`, `public/cd-sportswear-usa-icon.png`) — re-cut from
  the CD mark of the new lockup at 512x512, replacing v1.33's navy chrome
  mark, so the tab icon and the wordmark are the same artwork. The new mark
  is white and cyan, which disappears entirely on a light browser tab strip
  on a transparent background (checked at 16, 32, 64 and 180px), so it is
  seated on a dark navy (#090e1c) rounded-square plate at 78% width and
  centred — the inverse of v1.33's white plate, which existed for the same
  reason when the mark was dark.
- **Not changed** — `SITE.name` is still `CD Sportswear USA`, so the logo's
  `alt` text, document titles and the Organization node still say USA while
  the artwork now says INC. Renaming the brand touches metadata, JSON-LD and
  the brand-name assertions in `tests/site-brand.test.mjs`, and is an owner
  decision rather than an asset swap.
- **Tests** — full suite green (493/493) and `pnpm build` clean.

## v1.33 — 2026-09-08

Contact phone number and browser/app icon refresh. Owner-supplied values; no
layout, motion or CRM behaviour changes.

- **Phone** (`lib/site.js`) — `SITE.phone` is now `+1 804-280-4941`, replacing
  `+1 917-463-4214`. It is the single source for the number, so the change
  propagates on its own to the contact section, the menu, the marketing footer,
  the contact pulse links, and the `telephone` field on the Organization node
  in the site-wide JSON-LD graph. Each surface derives its own `tel:` href by
  stripping non-digits, so the dial target is `tel:+18042804941`.
- **Icon** (`app/icon.png`, `public/cd-sportswear-usa-icon.png`) — both replaced
  with the supplied CD mark, rendered at 512x512. The mark ships on a
  transparent background and is dark navy, which would have gone near-invisible
  on dark browser chrome and would have been composited onto black as an iOS
  home-screen icon, so it is seated on a white rounded-square plate at 84% width
  and centred. `SITE.iconPath` and the `icons` block in `app/layout.jsx` are
  unchanged — the paths already pointed at these two files.
- **Not changed** — `public/cd-sportswear-usa-logo.png`, the wide wordmark used
  by the nav, CRM login, workspace shell and transactional email header. The
  supplied art is an icon-proportioned mark, not a wordmark.
- **Tests** (`tests/content.test.mjs`) — the exact-value phone assertion tracks
  the new number. Full suite green (493/493).

## v1.32 — 2026-09-06

SEO H1/title + Service JSON-LD pass for six `/services/[slug]` pages. Taxonomy
labels on the homepage and `/services` index stay the same; only the detail
page heading, document title, meta description, and Service schema change.

- **Config** (`lib/servicePages.mjs`) — added `h1` (visible heading) beside
  the existing `title` taxonomy label. Updated `seoTitle` + unique
  `metaDescription` for ai-automation, web-design, branding, logo-design,
  web-development, and digital-marketing. Short first-paragraph tweaks on
  web-design, web-development, and logo-design so schema matches visible copy.
- **Page** (`app/services/[slug]/page.jsx`, `ServicePage.jsx`) — H1 reads
  `page.h1`; metadata title is the `seoTitle` stem (root layout appends
  `| CD Sportswear USA`).
- **Schema** (`ServiceSchema.jsx`) — Service `name`/`description` align with
  the new H1/meta; adds canonical `url` and Organization `provider` (`@id`
  + name). `areaServed` is country-level (US/AE) except web-design, which
  also names Manassas, VA because that city is already on the page footer.
  Northern VA is not claimed. No AggregateRating, reviews, or offers.

## v1.31 — 2026-09-06

Privacy and Terms pages (`/privacy` and `/terms`) now return 200 instead of
404, resolving broken footer links and completing the site's legal foundation.

- **Privacy page** (`app/privacy/page.jsx`) — Full privacy policy matching the
  site's craft-forward tone. Covers information collection/use/sharing,
  security measures, data retention, user rights, cookies, third-party
  services, international transfers, and contact info. Uses `MarketingShell`
  and follows the same structure as About/Contact pages.
- **Terms page** (`app/terms/page.jsx`) — Terms of service for website and
  client services. Covers acceptable use, intellectual property, client portal
  access, payment terms, warranties, liability, dispute resolution, and general
  provisions. Matches the existing legal/brand voice.
- **Footer links** (`MarketingFooter.jsx`) — Privacy and Terms links added to
  footer bottom row, visible on all marketing pages that use `MarketingShell`.
  Styled with flexbox layout separating copyright and legal links.
- **Sitemap** (`app/sitemap.js`) — Added `/privacy` and `/terms` entries with
  priority 0.3 and yearly change frequency.
- **Styles** (`app/styles/service-pages.css`) — `.mkt-footer-bottom` now uses
  flexbox with space-between to separate copyright and legal links.
  `.mkt-footer-legal` provides gap-separated link group with hover states.

No invented legal claims beyond what's already on the site (Manassas VA,
Sharjah, sales@cdsportswearusa.com, founded 2016). Dates are dynamic
(`new Date()`) so they stay current without manual updates.

Blog posts from Supabase are already in the sitemap via the existing
`listPublishedSlugs()` integration (line 17 of `app/sitemap.js`). No
redeploy-specific notes needed — the sitemap is async and regenerates on
publish revalidation per existing architecture.

## v1.30 — 2026-09-03

hCaptcha on the public contact form (every `ContactForm` instance: homepage
Contact beat, `/contact`, `/about`, `/process`, and the eight
`/services/[slug]` pages). It sits alongside the existing honeypot and
Upstash rate limit; nothing about the fields, payload or success copy
changes.

- **Client** — `components/marketing/HCaptcha.jsx` injects `js.hcaptcha.com`
  once per page from the form's mount effect and renders the dark checkbox
  widget below the brief. The form refuses to submit without a token, sends it
  as `hcaptchaToken`, and resets the widget after every response (tokens are
  single-use). If the loader is blocked (ad blocker, proxy) or times out, the
  form says so and offers the direct email address instead of waiting forever.
- **Server** — `app/api/contact` verifies the token with hCaptcha's
  `siteverify` after field validation and before the webhook, CRM write and
  emails. Enforcement is on only when `HCAPTCHA_SECRET` is set (same
  fail-open-when-unconfigured contract as `lib/rateLimit.mjs`). An explicit
  rejection returns 400; a network/5xx failure reaching hCaptcha lets the
  brief through and logs, so a vendor outage does not drop leads.
- **Keys** — the site key is public and ships as the default in
  `lib/hcaptcha.mjs` (`NEXT_PUBLIC_HCAPTCHA_SITE_KEY` overrides it for
  previews). The secret is read only from `HCAPTCHA_SECRET` and is **not in
  the repo**: set it in Vercel → Project → Environment Variables (Production
  and Preview) and in `.env.local`, then redeploy. Until it is set the widget
  shows but the server does not verify.
- **CSP** — `script-src`, `style-src`, `frame-src` and `connect-src` gain
  `https://hcaptcha.com https://*.hcaptcha.com`; `tests/csp-policy.test.mjs`
  pins the new tokens.
- Tests: `tests/hcaptcha.test.mjs` (verification unit tests with a fake
  fetch, route/form source contracts, and a guard that no secret literal is
  committed).
- Not included: signup/login. Supabase Auth has native hCaptcha support
  (Dashboard → Auth → Bot and Abuse Protection) that only needs the same
  site key plus a `captchaToken` on `signUp()`; that is a follow-up once the
  dashboard side is enabled.

## v1.29 — 2026-09-03

Adds migration `0041_client_read_scope_hardening.sql` — **checked in, not
applied**. Production application is an owner-approved step per
`docs/CRM-OPERATIONS.md` §Migrations; until it runs, the three holes below
remain open in the live database. Plan:
`docs/plans/audit-followups-crm-hardening-3.md` Tasks 10–11.

- **`project_approvals` SELECT** now follows the deliverable: clients see
  project-level approvals (`deliverable_id is null`) and approvals on
  `shared` deliverables; approvals on `internal` deliverables — and their
  reviewer notes — become staff-only. Policy renamed to "Project
  participants can view visible approvals".
- **`notifications_outbox` SELECT** limited to the recipient's `in_app`
  rows, matching `mark_notifications_read()`. Users could previously read
  their own email-queue rows (message excerpts; lead PII for the admin), and
  the dashboard panel rendered every event twice. `NotificationsPanel`
  drops the channel label and the `channel === 'in_app'` guard.
- **`deals`**: drops the 0001 "Company members can view deals" and 0003
  "Company members can submit a project brief" policies. No page outside
  `/admin` reads or writes deals; `create_project()` and
  `can_access_deal()` are SECURITY DEFINER and unaffected.
- Two audit claims verified already-resolved and left alone:
  `private.shares_project_with` grant (0040) and RLS enable/force on every
  `project_*` table (0009/0010).
- Tests: `tests/crm/migration-0041-client-read-scope-hardening.test.mjs`
  (source contract) and `supabase/tests/0041_client_read_scope.test.sql`
  (pgTAP: client sees 2 of 3 approvals and cannot read the internal note,
  1 of 2 outbox rows, 0 deals and cannot insert one; PM sees all 3
  approvals; admin still reads deals). `pnpm test:db` was not runnable in
  this environment (no Docker / Supabase CLI) — run it, or apply on an
  isolated branch database, before production.

## v1.28 — 2026-09-03

Frontend follow-ups from `docs/plans/audit-followups-crm-hardening-3.md`
(Tasks 5–8). No homepage/WebGL scene logic touched; the only marketing-file
edits delete inert attributes.

- **Custom-cursor leftovers removed.** The dot+ring cursor shipped in the
  initial commit and was removed in PR #10 (2026-07-13) by design review;
  three later audits misread its remains as an unbuilt feature. Deleted the
  51 `data-cursor` and one `data-hover` attributes across 21 JSX files,
  the `.cursor-*` rules (`app/styles/cursor-loader.css` → `loader.css`),
  and the `html.has-cursor` rule in `reset.css`. Nothing read any of
  them. `tests/no-dead-cursor-markup.test.mjs` keeps them out; restoring
  the cursor is `git show 1a2807c^:components/Cursor.jsx`.
- **One admin form chrome.** `AdminFormShell` loses its `variant` prop:
  all eight `/admin/<entity>/{new,edit}` pages now share the 800px frame,
  0.9rem unweighted labels, `0.75rem 1rem` inputs, `#64c8ff` focus ring
  and a 1.5rem/2rem actions row. Companies/deals widen from 700px and lose
  the bold label; contacts/tasks gain the stronger focus colour. Page markup
  is unchanged apart from the frame class (contacts/tasks now render
  `.crm-form-card` like the others); both selector families and both cancel
  controls are kept, which the byte-identity test still proves against the
  frozen pre-Phase-3 fixtures.
- **Admin CRUD gaps closed** (recorded, not fixed, in v1.20): contacts and
  tasks edit pages now `.select()` the updated row and throw
  `Update failed - no rows changed (check permissions).` like companies and
  deals; `tasks/new` gets the same admin redirect + skeleton gate as the
  other three new pages (task INSERT is `is_admin()`, migration 0005).
  `tests/crm/admin-crud-guards.test.mjs` pins all eight pages symmetric.
- **CRM read-model waste.** `getProjectWorkspace` no longer fetches a
  50-message page nobody rendered (ProjectThread owns that read) and skips
  the `project_assignments` query for clients (RLS returns zero rows for
  them anyway); `listProjectsForViewer` skips the companies fetch for
  clients. The client project page renders `workspace.tasks/approvals/
  deliverables` instead of re-fetching them, cutting four `projects` and
  four `profiles` round trips per load to one each. Dead
  `getUserProfile` server action removed. Two source-contract tests
  updated in step.

Verification: `pnpm test` 474/474, `pnpm test:marketing` 35/35,
`pnpm build` 57/57 pages, First Load JS unchanged (`/` 378 kB, shared
228 kB).

## v1.27 — 2026-09-03

Docs only — no runtime code changes. Closes the refactor plan ledger and
records what the 2026-09-02 audits got wrong before anyone acts on them.

- **`docs/plans/README.md`** (new): status table for every plan file, the
  "where results live" order of authority (CHANGELOG → `docs/reports/` →
  `STATUS.md`), and an agent protocol requiring a real code review of each
  cited `file:line` before acting on any plan row.
- **`docs/plans/refactor-architecture-cleanup-2.md`** marked Complete;
  the 25 blank Phase 1–4 task rows back-filled from CHANGELOG v1.18–v1.23
  and the three phase reports. Plan v1 marked Complete (its Phases 4–5
  shipped through v2).
- **`docs/plans/audit-followups-crm-hardening-3.md`** (new): the plan for
  the ten open items, with a §0 table of audit claims re-verified against
  code and the live catalog. Five did not hold: `shares_project_with` was
  already re-granted by migration 0040; every `project_*` table already
  has enable+force RLS in 0009/0010; the blog-actions old-slug read and
  the NotesPanel read are both correct; and the custom cursor was never
  "unbuilt" — it shipped and was removed in PR #10 by design.
- **`docs/reports/lighthouse-baseline-2026-09-03.md`** (new): first
  Lighthouse run against production (`www.cdsportswearinc.com`). Homepage
  mobile perf 34 / LCP 13.5 s, script-bound (WebGL + GSAP boot under 4× CPU
  throttle); inner pages still load the Three.js chunk; Sentry envelopes
  are blocked by CSP `connect-src` in production.
- `docs/reports/phase-1-*.md` cursor section and `docs/CRM-OPERATIONS.md`
  migration head corrected.
- Housekeeping outside the PR: the five merged `refactor/phase-*` and
  `claude/app-refactoring-plan-*` remote branches were deleted 2026-09-03.

## v1.26 — 2026-09-03

Production moved to a new custom domain outside git, the same way
crystalwebsolution.com -> cdsportswearusa.com did (#164): someone changed
the Vercel project's attached domain to cdsportswearinc.com, and
cdsportswearusa.com — production since 2026-08-27 — was left unattached.
Every route on the old domain returned Vercel's `DEPLOYMENT_NOT_FOUND`
(DNS still resolves there; the domain just isn't on the project anymore).
Owner confirmed 2026-09-03 that cdsportswearinc.com is the intended domain.

- `lib/seo.mjs` — `SITE_ORIGIN` now `https://www.cdsportswearinc.com`
  (re-verified the apex->www 308 redirect on the new host). Every
  canonical, sitemap `<loc>`, JSON-LD `@id` and `og:url` is built from
  this one constant, so they all move with it. Adds `SITE_HOST` (bare
  domain, derived from `SITE_ORIGIN`) for prose contexts.
- `lib/email/templates.js` — the contact-form email footer note now
  reads `SITE_HOST` instead of a hardcoded domain string; its test in
  `tests/email.test.mjs` derives the same way, so it can't drift out of
  sync again (the same fix v1.17 already made once for the canonical-logo
  assertion).
- `CLAUDE.md` — documents the new domain, records both retired domains'
  actual state (crystalwebsolution.com: dead DNS, deliberate; the
  cdsportswearusa.com: DEPLOYMENT_NOT_FOUND, not yet 301'd — the same
  equity-decay risk called out for the previous domain), and lists what's
  still unverified: `NEXT_PUBLIC_APP_URL`, Supabase Auth's
  `SUPABASE_AUTH_SITE_URL` / redirect allow-list, and whether
  `sales@cdsportswearusa.com` (`lib/site.js`) and the Resend sender
  domain (`lib/email/resend.js`) move with the site.
- **Deliberately not changed:** `SITE.email` and the Resend `DEFAULT_FROM`
  sender still reference `cdsportswearusa.com`. Moving them requires a
  working mailbox and Resend domain verification on the new address,
  which only the owner can confirm — changing the displayed contact
  address without one would silently drop real inquiries.
- Re-attaching `cdsportswearusa.com` in Vercel as a redirect to preserve
  its ~1 week of accrued link equity is still an open owner action, not
  done here.

## v1.25 — 2026-09-02

Fixes the second batch of live editorial placeholders (CRY-30): 24
`[CONFIRM: …]` strings in `lib/servicePages.mjs` — three per service
across all eight `/services/[slug]` pages — visible to visitors in the
deliverables list and in two FAQ answers (and their `FaqSchema` JSON-LD).
Same approach as v1.21: honest interim copy, no invented figures.

- **deliverablesNote** — removed from all eight services rather than
  filled with made-up round counts or turnarounds; `ServicePage.jsx`
  already renders the note conditionally, so the list shows cleanly
  without it.
- **"What does this cost, and how long does it take?"** — now the same
  scope-dependent, quote-only answer v1.21 shipped on `/services`.
- **"What's not included?"** — now states that every engagement is
  scoped in a written proposal up front and mid-project requests are
  estimated separately with sign-off.
- Adds `tests/no-live-placeholders.test.mjs`, which fails `pnpm test`
  if `[CONFIRM` or `PLACEHOLDER` appears in `lib/servicePages.mjs` or
  any `app/**/page.jsx`, so a third batch can't reach production.

No homepage/WebGL scene files touched.

## v1.24 — 2026-09-02

Docs-only: repairs the version ledger after the six PRs below merged out
of order on 2026-09-02. Each merge resolved its `VERSION`/`CHANGELOG.md`
conflict by keeping `main`'s side, so four deploys went out without their
entry and `VERSION` stayed at `v1.19` while the deployed commit was titled
`v1.23`. No runtime code changes.

- Restores the `v1.20`, `v1.21`, `v1.22` and `v1.23` entries below, verbatim
  from their PRs, and sets `VERSION` to the next number.
- Every number `v1.18`–`v1.23` maps to exactly one deploy (commit titles in
  Vercel's deploy list); only the deploy order differs from the numeric
  order:

  | deploy order | version | commit | PR |
  | --- | --- | --- | --- |
  | 1 | v1.18 | `cd2fdd0` | #166 |
  | 2 | v1.21 | `0e0b9e0` | #162 |
  | 3 | v1.22 | `339f540` | #163 |
  | 4 | v1.19 | `e2f1ff2` | #167 |
  | 5 | v1.20 | `17427e2` | #168 |
  | 6 | v1.23 | `ceae722` | #169 |

## v1.23 — 2026-09-02

Phase 4 of `docs/plans/refactor-architecture-cleanup-2.md`: oversized-file
decomposition, the last phase of the plan. Report in
`docs/reports/phase-4-oversized-file-decomposition-2026-09-02.md`.

- **`components/crm/ProjectThread.jsx` split** into a data hook
  (`components/crm/useProjectThread.js`: state, read-model load, Realtime
  subscription, every mutation) and a presentation component that renders
  from it. A verbatim move: the hook body and the JSX/CSS are diffed
  identical to the original. No visual or behavioural change intended.
- **New behavioural test** `tests/crm/project-thread-behaviour.test.jsx`
  (11 tests) pins the Conversation panel's Realtime subscription
  lifecycle, project-switch guard, inline edit and send idempotency — the
  flows STATUS.md records as having regressed past every automated gate.
  Written and green before the split, green after.
- **`app/actions/project-actions.js` deliberately not split**: five CRM
  contract tests assert against this one file's source text (RPC
  allowlist, no direct table writes, result contract). That gate is worth
  more than the split; the report records what would unlock it.
- `lib/servicePages.mjs` and `components/ui/liquid-ether-background.jsx`
  triaged as large but cohesive; no split.

## v1.22 — 2026-09-02

Homepage copy pass across all nine scroll beats. (The canonical-domain fix
this PR originally carried landed separately as #164.)

- **Hero** — subhead tightened to end on the business outcome ("so the
  click turns into the client") instead of stopping at the aesthetic one.
- **About** — kicker sharpened; picks up the Hero's "scroll" language on
  purpose, paid off again at Mark and Contact.
- **Services** — adds a one-line bridge under the header ("Eight
  disciplines, one team...") between the About statement and the row list;
  the 8 row descriptions in `lib/services.mjs` are untouched.
- **Stories** — one-word tighten ("No" → "Zero invented case studies").
- **Mark** — sub tightened to tie "assembled on purpose" explicitly back to
  the actual process described in Approach.
- **Lab** — caption tightened; also fixes the decorative `aria-hidden`
  label reading "CDS" when `SITE.short` is `"CD"`.
- **Contact** — headline reworked from "Let's make something rare." (a
  vibes line with no concrete client benefit) to "Let's build something
  worth the scroll." — the closing beat of the "scroll" thread started in
  Hero. Sub tightened for rhythm, same commitments.
- Approach and Motion are unchanged — both were substantially rewritten in
  v1.16 and reviewed here, not touched again.

## v1.21 — 2026-09-02

Fixes literal `PLACEHOLDER — confirm …` strings that v1.15 shipped live to
production on `/about`, `/contact`, `/process`, `/services`, and `/reviews`
— visible to real visitors and inside each page's `FaqSchema` structured
data. v1.15 intentionally left these as explicit placeholders pending
founder input rather than inventing facts; this closes that gap with the
owner's actual answers where given, and honest, non-fabricated interim
copy where not:

- **Contact** — reply-time FAQ and hero lede now say "within 1 business
  day"; NDA FAQ says "yes, on request."
- **About** — team-size FAQ now describes a small, senior,
  cross-disciplinary team (design, engineering, motion/AI-automation)
  without an invented headcount.
- **Services** — pricing FAQ now states scope-dependent, quote-only
  pricing (matching the tone already shipped on the embroidery landing
  page's cost FAQ) instead of asking whether to disclose ranges.
- **Reviews** — "leave a review" FAQ now points to Contact/email instead
  of a placeholder platform link that doesn't exist yet.
- **Process** — the 6 steps' `duration`/`deliverable` fields are removed
  rather than filled with invented numbers; `ProcessStepsRail` already
  renders that meta row conditionally, so the steps show cleanly without
  it until real figures are confirmed.
- Removes a few stale `PLACEHOLDER`-referencing code comments left over
  from v1.15 (embroidery page, Process, Services, Contact, About) that no
  longer describe the code.

No homepage/WebGL scene files touched.

## v1.20 — 2026-09-02

Phase 3 of `docs/plans/refactor-architecture-cleanup-2.md`: admin CRUD
duplication audit and extraction. No visual or behavioural change intended;
report in `docs/reports/phase-3-admin-crud-duplication-audit-2026-09-02.md`.

- The eight `/admin/<entity>/{new,[id]/edit}` pages shared their page
  chrome and ~150 lines of inline styled-jsx each, not their form logic.
  New `components/crm/AdminFormShell.jsx` owns the wrapper, header, error
  banner, form card and field/button CSS; every entity's loaders, guards,
  cascades, payload coercion and submit flow are untouched. Pages: 3,322 →
  1,965 lines.
- The pages had drifted into two chrome styles (companies/deals 700px
  "card", contacts/tasks 800px "container"); the shell keeps both as an
  explicit `variant` so nothing changes on screen. Unifying them is listed
  as an owner decision.
- Characterization test `tests/crm/admin-form-shell.test.jsx` renders the
  frozen pre-refactor pages (`tests/crm/fixtures/admin-forms-pre-phase3/`)
  against the new ones and asserts byte-identical markup; the old CSS was
  diffed selector-by-selector against the shell.
- Two pre-existing gaps recorded, not fixed: contacts/tasks edit pages lack
  the "no rows changed" post-update check; `tasks/new` has no admin guard.

## v1.19 — 2026-09-02

Phase 2 of `docs/plans/refactor-architecture-cleanup-2.md`: testing and
documentation. No runtime code changes.

- New `tests/marketing/work-marquee.test.jsx` (9 tests: video-vs-image tile
  selection by extension, replacement-media cycling, eager/lazy loading, row
  offsetting) and `tests/marketing/motion.test.jsx` (4 tests: Motion wires
  `WorkMarquee` to `CLIENT_TILE_IMAGES`/`REPLACEMENT_IMAGES`, accessible
  project list independent of the decorative marquee).
- `README.md` gains "Component directory conventions" and "Styling"
  sections describing what actually shipped (28-file global `app/styles/`
  split with global class names on purpose; `ImageBlock.module.css` as the
  one CSS Modules exception).
- New `docs/ARCHITECTURE.md`: sections → components → lib dependency map,
  the per-frame singleton pattern, and the two CRM data-access shapes with
  which entities use which.

## v1.18 — 2026-09-02

Phase 1 of `docs/plans/refactor-architecture-cleanup-2.md`: dead-code and
performance audit. Findings and evidence in
`docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md`.

- **Fix** — `pnpm livecheck` was broken outright: `scripts/livecheck.mjs`
  imported from `playwright`, which is not a direct dependency under pnpm's
  strict layout. Now imports `chromium` from the already-installed
  `@playwright/test`; verified clean across all nine marketing routes on a
  production build.
- Verified, no change needed: `dynamic(..., { ssr: false })` is used only on
  the three WebGL boundaries; Three.js/R3F stays out of the shared and CRM
  bundles (chunk-manifest comparison); `depcheck`'s `typescript` flag is a
  false positive (required by `tsconfig.json`'s `@/*` alias); CSP comment and
  `public/d/02-messenger.gif` size unchanged.
- Owner-decision item left open: 51 inert `data-cursor` attributes plus an
  unwired `.cursor-dot`/`.cursor-ring` block in `app/styles/cursor-loader.css`
  (an unfinished custom-cursor feature) — remove or finish, not decided here.

## v1.17 — 2026-09-01

Refactor plan Phase 0 (`docs/plans/refactor-architecture-cleanup-2.md`):
establishes a genuinely green baseline before the CRM/architecture refactor
begins.

- `tests/email.test.mjs` — the "canonical logo" assertion hardcoded the
  retired `www.crystalwebsolution.com` domain; `lib/email/templates.js`
  correctly renders the logo from `SITE_ORIGIN` (`lib/seo.mjs`), which was
  intentionally repointed to `cdsportswearusa.com` in v1.16's follow-up fix
  (#164). The test never caught up. Now derives its expectation from
  `SITE_ORIGIN` directly instead of a second hardcoded literal, so it can't
  drift out of sync with the source of truth again.
- No other code changed. `pnpm test` 452/452, `pnpm test:marketing` 22/22,
  `pnpm build` clean (57/57 routes) — recorded as the refactor's baseline.

## v1.16 — 2026-08-31

Updates the studio location shown site-wide (footer, contact links, contact
section, and About page) to a two-line "Location in X / Also Located in Y"
format, and confirms the enquiry email/phone already match the approved
contact details.

- `lib/site.js` — `SITE.city` is now the short primary location
  (`Manassas, VA`), with a new `SITE.citySecondary` (`Sharjah, DXB`) for the
  second studio; `SITE.cityCompact` combines both for single-line contexts
  (OG image).
- `MarketingFooter`, `ContactPulseLinks`, and the homepage `Contact` footer
  now render both locations as separate lines instead of one combined
  string; the About page's prose and FAQ answer read from the same fields.
- No change to `SITE.email` (`sales@cdsportswearusa.com`) or `SITE.phone` —
  already correct.
- **Footer logo** — the marketing footer showed only the plain-text brand
  name; it now renders the same `BrandLogo` image as the header, linked to
  home, sized by a new `.mkt-footer-logo` rule.
- **Homepage copy** — the Approach accordion read as four bare labels until a
  visitor clicked one. Each of the four steps now carries an always-visible
  summary line, a deeper description, and a "What you get" list; the section
  gains a lede explaining that every project runs the same four steps. The
  Motion beat's heading no longer near-duplicates Stories' "no invented case
  studies" line — it leads on what the work changed and adds a short intro.

## v1.15 — 2026-08-30

Deepens all six inner marketing pages (About, Services, Work, Contact,
Process, Reviews) plus the embroidery-screen-printing landing page, closing
the content-depth gap identified against the site's own deepest reference
pages (the `/services/[slug]` template and the embroidery long-form page).

- **About** — adds an FAQ + `FaqSchema`, a "who this is for" section,
  cross-links to `/work`/`/process`/`/reviews`, a live review-count/rating
  sentence sourced from `REVIEW_STATS`, and an embedded contact form
  replacing the previous bare "start a project" link.
- **Services** — extends each of the 8 `lib/servicePages.mjs` records with a
  concrete opening scenario, a counter-audience ("not for you if…")
  paragraph, one elaboration sentence per capability/process step (kept as
  parallel `*Details` arrays — `capabilities`/`process`/`deliverables` stay
  plain `string[]`, since the homepage's `Services.jsx` row chips read
  `capabilities` directly and key off the string value), and 3 new FAQ
  entries per service. Adds services-index body copy explaining why the
  eight offers run as one team.
- **Work** — adds an FAQ + `FaqSchema`, cross-links, and a closing CTA to
  the work index.
- **Contact** — adds an FAQ + `FaqSchema`, a "who this is for" section, and
  a "what happens after you submit" section, closing the page's near-total
  content gap.
- **Process** — adds `duration`/`deliverable` fields to each of the 6 steps,
  rendered as a meta row in `ProcessStepsRail.jsx`.
- **Embroidery landing page** — adds an FAQ + `FaqSchema` and cross-links to
  the Development service page and Contact.
- **Fixes a homepage bug** found while auditing the same content:
  `app/styles/refraction.css`'s `.service-row:not([data-active='true'])
  .service-desc` rule unconditionally clipped the first 7% of every
  description on load — matching every row before any row had gone active —
  cutting off the start of the "Development"/"Branding" text. Added a
  `:has()` guard so the clip only applies once a sibling row is actually
  active.
- Adds a visible link treatment (`color` + `underline`) for inline links in
  body copy (`.mkt-prose a`), which previously inherited the invisible
  global `a` reset.

Facts only the founder has — team headcount, response-time commitments,
per-service pricing/timelines, process durations, review sourcing — are left
as explicit `PLACEHOLDER`/`[CONFIRM: …]` strings rather than invented; none
of the eight `SERVICE_PAGES` copy uses the literal word "placeholder" so the
existing banned-copy test (`tests/marketing.test.mjs`) still passes. No
homepage/WebGL journey files touched beyond the one CSS bug fix above.

## v1.14 — 2026-08-29

Turns the CSP into an enforced invariant. Test-only — no runtime code changed,
so no shipping page behaves differently.

v1.13 removed `https://cdn.jsdelivr.net` from `script-src` and added a test
asserting it stays out. That guard turned out to be a denylist: it names one
origin, so it only catches the one regression it was written for. Measured
against v1.13's suite, both of these widenings left all 449 tests green:

- adding a *different* CDN (`https://cdn.unpkg.com`) to `script-src`
- collapsing `script-src` to a bare `https:`, which permits any https origin
  to execute script and leaves the directive doing nothing

- **`tests/csp-policy.test.mjs` added.** Pins the entire policy as an exact
  directive→token map, compared order-insensitively, so *any* change fails
  rather than only the ones someone thought to enumerate. The failure message
  says what the test is for: a CSP edit is a security-header review
  checkpoint, and landing one means deliberately updating the pinned table
  and justifying the new token in the PR.
- **Two companion assertions** for failure modes an exact match would report
  confusingly: a directive deleted from the array (silently inherits
  `default-src`) or present but empty (blocks the resource type outright),
  and a bare scheme or wildcard host in `script-src` — named separately
  because that one is the difference between a policy that constrains script
  execution and one that only looks like it does.
- **`img-src` left deliberately wide** (`https:`) and now documented as such
  in the pinned table. Images cannot execute; enumerating every host the
  marketing pages reference costs more than it buys.

The existing origin-presence assertions in `tests/analytics.test.mjs` stay —
the exact-match test subsumes them, but their per-origin failure messages
explain *why* GA breaks without each host, which a diff of the whole policy
would not.

## v1.13 — 2026-08-29

Repository leanness pass. No behaviour change to any shipping page — the only
runtime-visible edit is a Content-Security-Policy that stopped allowing a CDN
nothing loads from any more.

- **CSP tightened.** `script-src` no longer allows `https://cdn.jsdelivr.net`.
  That origin existed solely for the UnicornStudio auth background, which was
  replaced by the procedural `DarkPageBackground` canvases on 2026-08-25. The
  component stayed in the tree, so the allowlist entry did too.
  `tests/login-background.test.mjs` now asserts the origin stays out.
- **Dead components removed** (1,038 lines), each verified against history as
  orphaned by a later redesign rather than unfinished work:
  `components/ui/hero-carousel.jsx` and `components/ui/image-stream-hero.jsx`
  (unwired by the 2026-08-26 showcase redesign),
  `components/ui/unicorn-studio-background.jsx` and
  `components/auth/UnicornBackground.jsx` (replaced same-day by `ee7c264`),
  `components/crm/ProjectOperations.jsx` (never imported since it was added).
- **`tests/login-background.test.mjs` rewritten.** It was asserting against the
  replaced UnicornStudio component while the login page rendered
  `DarkPageBackground` — passing tests that guarded code nothing shipped. It
  now asserts the real prism background, its reduced-motion and ≤767px
  fallbacks, and that the auth backgrounds stay dependency-free.
- **`.gitattributes` added.** A Windows/OneDrive tool had rewritten the working
  tree to CRLF, which showed up as 109 modified files and 20,729 phantom
  insertions with zero real changes, and broke source-reading tests whose
  regexes assume `\n`. `* text=auto eol=lf` stops it recurring.
- **Planning docs consolidated.** `plan/`, `plans/` and
  `docs/superpowers/plans/` merged into `docs/plans/`; ADRs moved to
  `docs/adr/`; five purely-historical documents moved to `docs/archive/`.
  `plans/New Plan` — tracked, 21 KB, referenced by section number from
  `docs/HOMEPAGE-OVERHAUL-REUSE-INVENTORY.md` — is now
  `docs/plans/homepage-overhaul-spec.md`. All cross-references updated.
- **`docs/README.md` added.** Names `docs/CRM-MASTER-PLAN.md` as canonical and
  records what an audit of the five overlapping CRM plans found: a transplant
  backlog of content that exists in exactly one document, and three conflicts
  between documents (storage path format, whether a project manager may claim
  unassigned work, and the superseded `preview`-branch rule).
- **`output/` and `test-results/` untracked** and gitignored — generated scan
  artifacts that were committed by mistake. Windows/OneDrive droppings
  (`*:Zone.Identifier`, `desktop.ini`, `*.lnk`, `FireShot Capture*`) ignored.

## v1.12 — 2026-08-29

Re-does the still-needed part of PR #118 ("frontend finishing-touches pass")
fresh against current `main` — that branch was 35 commits stale (including
the `globals.css` → 27-file split) and unmergeable. Verified against current
`main` file-by-file before reapplying anything; PR #118 closed as superseded.

- Reviews page: review cards now get the same staggered `SectionReveal`
  entrance every sibling list page (blog, work) already has — previously
  only the archive heading was revealed, not the cards themselves.
- `ServiceEmblem.jsx` (SVG variant): default service glyphs now gate their
  SMIL `<animate>`/`<animateTransform>`/`<animateMotion>` elements on
  `prefers-reduced-motion`, matching the gating its 3D sibling already had —
  these run outside CSS, so the existing media query couldn't reach them.
  Added the matching test coverage.
- `/work/[slug]`: restores the shared `.mkt-inner` width class every sibling
  detail/index page uses.
- CRM loading states: most of this work (13 of 21 pages) had already landed
  on `main` independently, with a better implementation than PR #118's
  (real `Skeleton`/`LoadingState` variants, plus dead `.crm-loading` CSS
  removed) — verified page-by-page rather than assumed. Finished the
  remaining 7 gaps the same way: `admin/companies/new`,
  `admin/contacts/new`, `admin/deals/new`, `admin/page.jsx`,
  `admin/tasks/new`, `admin/users/invite`, and a second, previously-missed
  "Opening onboarding…" block in `app/dashboard/page.jsx`. Also wired
  `Spinner` into `EntityNotes.jsx`/`NotesPanel.jsx`'s inline "Loading
  notes…"/"Loading updates…" text, and removed the now-orphaned
  `.crm-loading` CSS block from each of the 7 page-level fixes.

No look, feel, or functional changes beyond the above; `pnpm build` clean,
`pnpm test` 449/449, `pnpm test:marketing` 22/22 (includes 2 new assertions
for the SVG reduced-motion fix), `tsc --noEmit` clean.

## v1.10 — 2026-08-29

- Fix two stale/miscalibrated claims in `CLAUDE.md` surfaced by an
  evidence-calibration review: the "CRM is launched" line now says when it
  was last directly HTTP-verified and prompts a re-check rather than
  reading as a permanently-settled fact, since several merges to `main`
  have deployed since that check ran. The migration-count line ("0001
  through 0035 as of 2026-08-20") was stale (real head is now `0038`) and
  is replaced with guidance to always check the directory instead of
  citing a number that goes stale within days during active periods.

## v1.11 — 2026-08-29

- Fix `updateProjectTask`'s revalidation bug: it passed the RPC-returned task
  id to `revalidateAllProjectPaths` instead of the project id, so a task
  update would never revalidate the right `/dashboard`, `/team`, or
  `/admin/projects` pages. No UI calls this server action yet, so this was a
  latent bug; fixed now, before any task-edit UI ships, matching every
  sibling action's established form-supplied-`projectId` pattern. Added a
  regression test.
- The vitest wiring fix originally paired with this bug fix (scoping
  `vitest.config.js`'s `include` glob off the `node:test`-based `.test.mjs`
  files) turned out to already be live on `main` via the separate
  `test:marketing` script, added independently while this branch was open —
  same fix, different script name. Dropped the redundant `test:unit` script
  this PR would have added and documented the existing `test:marketing`
  command in `AGENTS.md`/`CLAUDE.md` instead, rather than ship two
  differently-named commands that do the same thing.

## v1.09 — 2026-08-29

- Phase 3 of the architecture-cleanup refactor plan: JSDoc-based type safety,
  stacked on top of v1.08's component cleanup. No runtime TypeScript — this
  repo stays plain JSX + JS per its own convention; `tsconfig.json` exists
  purely to drive `tsc --noEmit` as a dev-time check.
- `jsconfig.json` → `tsconfig.json` (`allowJs`, `noEmit`, path alias
  preserved). `typescript`, `@types/react`, `@types/react-dom` added as
  devDependencies.
- Added `@typedef` blocks to `lib/projects.js`, `lib/services.mjs`,
  `lib/site.js`, `lib/reviews.js`, and `lib/crm/project-contract.mjs`
  (`ProjectCategoryValue`, `ProjectStatus`, `TaskStatus`, etc., plus
  `value is X` type-guard returns on the `is*` predicate functions).
- Added JSDoc `@param`/`@returns` to every exported component in
  `components/ui/*.jsx` (10 files).
- Added `types/index.d.ts` re-exporting the shapes above by reference
  (`import('../lib/projects.js').Project`, etc.) rather than duplicating
  them, so the type can't drift from the data it describes.
- **Deviated from the plan's literal `checkJs: true`**: global `checkJs`
  surfaced 277 pre-existing false-positive errors across untouched files (a
  known JSDoc-less-JSX prop-inference artifact, not real bugs — e.g. optional
  props with defaults getting inferred as required). Set `checkJs: false`
  project-wide and opted in per-file with `// @ts-check` on exactly the 15
  files this phase typed, which is the standard incremental-adoption pattern
  for JSDoc typing in an existing JS codebase. `tsc --noEmit` is clean.
- **Found and fixed a real build regression during this phase**:
  `typescript@7.0.2` (the brand-new native/Go-rewrite major version, pulled
  in by `pnpm add -D typescript` with no version pin) broke Next.js
  15.5.23's route-handler resolution — `app/api/contact/route.js` and
  `app/api/cron/crm-notifications/route.js` failed to resolve their `@/lib/*`
  imports (`Module not found`) specifically because a `tsconfig.json` was
  now present; every other `@/`-aliased import in the app (60+ call sites)
  kept resolving fine. Isolated by bisecting tsconfig options down to the
  bare minimum jsconfig-equivalent (still failed) and finally by testing the
  TypeScript version in isolation. Pinned `typescript` to `^5.9.3` — build,
  `tsc --noEmit`, `pnpm test` (448/448), and `pnpm test:marketing` (20/20)
  are all clean on that pin.

## v1.08 — 2026-08-28

- Phase 2 of the architecture-cleanup refactor plan: component-level
  de-duplication, stacked on top of v1.07's CSS split.
- Added `components/shared/SectionHeader.jsx` and used it in `Services.jsx`,
  `Approach.jsx`, and `Stories.jsx` — the three sections that shared
  byte-identical eyebrow + `<h2>` markup, only the copy differed. Verified
  against the built page's HTML that the rendered output (classes, reveal
  wrapper, inline styles) is unchanged. `Mark.jsx` (imperative split-line
  headline) and `Motion.jsx` (plain-text eyebrow, no heading) were left
  alone — genuinely different markup, not a duplicate to collapse.
- Added `lib/interactionGuards.mjs` (`skipsPointerAnimation()`) and used it
  in `Services.jsx` to replace two identical inline
  `matchMedia('(pointer: coarse)') || matchMedia('(prefers-reduced-motion:
  reduce)')` checks. Kept as a plain function, not a hook: both call sites
  check once at effect-mount time and don't need to react live to the query
  changing, so a hook would add reactivity that didn't exist before.
- Investigated and closed out the rest of the plan's Phase 2 list without
  code changes, because the premise didn't hold up:
  - `Contact.jsx` already delegates fully to `ContactForm`; nothing to do.
  - The "redundant" comment in `app/signup/page.jsx` is a deliberate
    visually-hidden-but-focusable radio pattern for keyboard/screen-reader
    navigation, not dead CSS.
  - No duplicated `ScrollTrigger` setup exists across `Mark.jsx`/`Hero.jsx`
    (one unique inline config each) and `Lab.jsx` doesn't use ScrollTrigger
    at all — nothing to extract into a shared hook.
  - `ProjectHandoffLink.jsx` is a single-purpose stripe-wipe transition, not
    a generic pattern — nothing to rename or extract.
  - `components/three/` has no duplicated geometry/material setup; every
    `new THREE.*Geometry`/`*Material` call is a distinct shape serving a
    distinct visual purpose.
  - `components/three/CanvasFeatureBoundary.jsx` already implements the
    error-boundary task, and with better scoping (per-feature, not
    whole-Canvas) than the plan proposed.
- Flagged, but did not act on: 31 `data-cursor="..."` attributes across the
  codebase have no reader anywhere (no JS, no CSS) — likely dead, possibly
  reserved for an unbuilt custom-cursor feature. Left alone pending
  confirmation, per this repo's "confirm before deleting" rule.

## v1.07 — 2026-08-28

- Split the 4,324-line `app/globals.css` into 27 ordered stylesheets under
  `app/styles/`, reducing `globals.css` to an import-only manifest. The
  imports are listed in the original source order, so the resolved stylesheet
  is **byte-identical** to the pre-split file (verified by checksum) — the
  cascade, every specificity tie, and therefore every pixel are unchanged.
- Kept the class names global rather than moving to CSS Modules: `Menu.jsx`,
  `Services.jsx` and `WorkLibrary.jsx` reach for `.menu-link`, `.menu-meta`,
  `.service-row` and `.work-row` through `querySelectorAll`, and GSAP animates
  those same names. Hashed module class names would have broken those
  animations silently, with no build error to catch it.

## v1.06 — 2026-08-27

- Set the canonical contact email to `sales@cdsportswearusa.com` and the
  transactional sender domain to `cdsportswearusa.com`, closing the gap left
  when the site rebranded to CD Sportswear USA but `lib/site.js` and
  `lib/email/resend.js` still pointed at `crystalwebsolution.com`.
- Fix `/login/client`, `/login/employee`, and `/login/admin`: the brand-mark
  `Link` and its child `img`, plus the footer text links, were unstyled
  because styled-jsx never scopes classes onto `next/link`'s rendered `<a>`
  — the logo rendered at its raw 2304px intrinsic width, blowing out the
  page at every viewport, not just mobile. Wrapped the affected selectors in
  `:global()`, matching the same fix already applied to `app/login/page.jsx`.
- Raise the dimmed sibling-row description opacity in the Services section
  from 0.6 to 0.82 — the lower value read as illegible "shadowed" text
  against the animated 3D backdrop.

## v1.05 — 2026-08-27

- Fix `useUserRole()` reading `user.app_metadata.role`, a claim this app
  never sets — `isAdmin`/`isPm` were always `false`, silently redirecting
  real admins off `/admin/users` and hiding admin-only controls on the
  companies/contacts/deals pages. It now reads `role` from the `profiles`
  table, matching `middleware.js`.
- Add a `requireRole()` backstop to the three portal layouts
  (`app/admin`, `app/dashboard`, `app/team`), which were bare
  pass-throughs relying entirely on middleware. Allowed roles mirror
  `lib/auth/roles.mjs`'s existing portal mapping exactly.
- Wire the 8 existing `tests/marketing/*.test.jsx` vitest tests into a
  new `pnpm test:marketing` script and the `docker-ci.yml` test job —
  they had a working `vitest.config.js` but nothing ever ran them.
- Fix `docker-ci.yml`'s CI test gate itself: it pinned Node 20, but
  `pnpm@11.21.0` (this repo's pinned package manager) requires Node
  >=22.13 and crashes immediately on Node 20 with
  `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` — the gate v1.04 just added
  has been failing on every PR since it merged, for this reason alone,
  regardless of the PR's actual content. Bumped to Node 24, matching
  local dev.

## v1.04 — 2026-08-27

- Add a CI test gate: `docker-ci.yml` now runs `pnpm test` and `pnpm build`
  before the Docker image build, and the image build depends on that job
  succeeding — previously nothing blocked a failing test suite from merging
  to `main`.
- Consolidate `docker-ci.yml` and `docker-publish.yml` into one workflow
  (kept cosign image signing) and fix the missing `NEXT_PUBLIC_*` build args
  on the published `ghcr.io` image, so `docker run` per `README.md` produces
  a working image once the corresponding repo Variables are set.
- Add Upstash Redis-backed rate limiting (`lib/rateLimit.mjs`) to
  `POST /api/contact` and the `signUp`/`resendConfirmationEmail`/
  `requestPasswordReset` auth actions, implementing ADR-002 as Option C.
  Fails open until `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are
  configured.
- Reconcile the migration ledger against the live database read-only via the
  Supabase MCP connection: of the previously-undifferentiated `0025`-`0034`
  range, only `0031` and `0032` are genuinely unapplied (see
  `docs/reports/migration-ledger-reconciliation-2026-08-27.md`); no `db push`
  was run.

## v1.03 — 2026-08-27

- Remove `flake.nix`, `shell.nix`, and `.envrc` — the Nix dev-environment
  shims were unreferenced by docs, CI, or tooling and added no value over
  the existing pnpm/Node workflow.

## v1.02 — 2026-08-26

- Add `council.yaml` and `council/prompts/` — configures the Agent Council
  (5-deliberator quality gate) for this repo's prose docs (`docs/`,
  `README.md`, `CLAUDE.md`, `AGENTS.md`, `CHANGELOG.md`, `VERSIONING.md`).
  Scoped to docs, not source code — the council reviews text artifacts, not
  application code. `runtime.type: claude_cli` shells out to a separate,
  metered `claude` CLI process; `validate-config`/`health` are free,
  `review`/`sweep` are not.

## v1.01 — 2026-08-20

- Adopt the release versioning convention: `VERSION` file, this changelog,
  `VERSIONING.md`, and mandatory rules for all agents in `CLAUDE.md` /
  `AGENTS.md`. First named production deploy.
