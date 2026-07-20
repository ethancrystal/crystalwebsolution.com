# Claude Handoff: Crystal Web Solution Content Cleanup

## Objective

Finish the content implementation for `crystalwebsolution.com` with one non-negotiable rule from the client:

> Nothing generic, dummy, or presented as fact without support. Original creative copy and visuals are welcome, but clients, awards, dates, results, metrics, and business details must be real.

The client specifically objected to the mobile Motion copy:

- `Concepts, explorations, and interface experiments from our creative process.`
- `VIEW THE LAB`

They want the entire app held to the same standard, not just that paragraph.

## Repository State

- Repository: `C:\Users\Sales\Crystal Web Solution\crystalwebsolution.com-main`
- Active branch: `codex/contentinous`
- Latest commit before this uncommitted cleanup: `7eed50b fix: smooth responsive flying carousel and update branding`
- Earlier content commit: `9b4f225 feat: implement website content and reviews`
- The cleanup described below is **not committed yet**.

Do not reset or discard the existing animation and branding work. The previous carousel/logo changes are already safely committed in `7eed50b`.

## Committed Animation and Branding Baseline (`7eed50b`)

The user approved a narrow correction: retain the existing design, layout,
pin length, final grid, and flying-card concept while making the six cards
arrive one by one in continuous motion. Do not redesign the Motion section or
replace this behavior with a conventional carousel.

### Renderer policy

- Desktop uses the R3F/WebGL flying carousel after the Canvas reports ready.
- Compact screens below 768px keep WebGL disabled and use the animated
  SVG/SMIL renderer; they are not reduced to a static grid.
- `prefers-reduced-motion: reduce` uses the accessible static grid unless an
  explicit full-motion preview is active.
- `?motion=full#motion` is the explicit full-motion/WebGL preview path.
- The original SVG/SMIL implementation remains the permanent fallback for
  WebGL failure. Do not delete it.

### Timing contract

- `lib/flyingCarouselLayout.mjs` owns the WebGL choreography. Reveal delays
  are `index * 0.012`; settle delays are `index * 0.018`.
- Every WebGL card keeps a fixed reveal duration (`0.085`) and fixed settle
  duration (`0.12`). Later cards must never be squeezed into shorter windows
  to catch up suddenly.
- Reveal scale continues across the `ribbonIn` boundary, preventing a snap.
- The sixth card finishes exactly at the existing `FLIGHT_PHASES.grid` value
  (`0.78`), so the completed grid and its hold remain unchanged.
- `lib/motionStudies.mjs#createMotionStudyTiming` provides the phone SVG
  timing. Each card has an increasing start/settle tick and the same `0.07`
  reveal duration. The last SVG card settles at normalized time `0.91` and
  holds through `1`.
- `components/sections/Motion.jsx` remains the single owner of the `+=400%`
  pinned ScrollTrigger and reversible SMIL seeking. Do not add a second
  ScrollTrigger or RAF loop.

### Logo contract

- The normal homepage header uses
  `public/crystal-web-solution-logo.svg`, supplied by the user.
- When the fullscreen menu opens, the header crossfades to
  `public/crystal-web-solution-icon.svg`; the improvised text mark must not
  return.
- The full logo is inverted on light sections for contrast. The images are
  decorative inside an `aria-label="Crystal Web Solution home"` link.
- `components/Menu.jsx` was intentionally not changed by commit `7eed50b`;
  preserve its layout and GSAP animation.
- The user requires the singular brand name `Crystal Web Solution`, never
  `Crystal Web Solutions`.

### Verified state for `7eed50b`

Verification completed on July 20, 2026 before the later uncommitted content
cleanup appeared:

```text
node --test
33 tests passed, 0 failed

npm run build
Next.js 14.2.35 compiled and generated 17 static pages
```

Browser checks:

- 390px phone: renderer `legacy`, layout `animated`; an entrance checkpoint
  reported card opacities `[0.81037, 0.553227, 0.296085, 0.0389416, 0, 0]`,
  confirming visible tick-by-tick arrival.
- Open phone menu: full logo opacity `0`; supplied icon opacity `1`; icon
  rendered about 55 x 22px without clipping.
- 1440px desktop with `?motion=full#motion`: one Canvas, renderer `webgl`, no
  console errors, full SVG logo uncropped.
- Adversarial review verdict: `SHIP`. The only non-blocking gap is that the
  automated logo test checks asset/source wiring, while crossfade, crop,
  inversion, and accessibility were verified manually rather than with a
  rendered-component test.

### Documentation mismatch

Root `CLAUDE.md` still says the repository contains no image assets. The two
user-supplied SVG brand files above are an explicit approved exception. Do
not remove them to satisfy that older sentence. Update `CLAUDE.md` only after
the user approves that documentation change.

## Client-Supplied Sources of Truth

The review source is:

`C:\Users\Sales\.codex\attachments\fe3622d0-f39e-4065-a2ce-724ce37c8c66\pasted-text.txt`

It contains 20 supplied reviews. They are represented in `lib/reviews.js`, including critical reviews and company replies.

The client directly identified these original clients:

1. Ravivo Kaufman, owner of `talktomylawyer.com`
2. Kristin Stein of `tuckertrips.com`
3. Porsha Patterson of `Zues Towing`

Preserve the spelling `Zues Towing` exactly as supplied.

The official public Crystal Web Solution site was checked on July 20, 2026 and supports these business details:

- `info@crystalwebsolution.com`
- `+1 917-463-4214`
- Locations in Manassas, Virginia and Sharjah, UAE
- Public services include custom web design, e-commerce development, mobile/software/AI development, and portal integration

No first-party support was found for the local niche page's earlier claim that Crystal Web Solution is a sibling of or operates Crystal Digitizing, so that claim was removed.

## Work Already Completed in the Uncommitted Diff

### Unsupported content removed

- Deleted all eight synthetic case studies from `lib/projects.js`.
- Deleted the fake dynamic case-study route `app/work/[slug]/page.jsx`.
- Removed fake project URLs from `app/sitemap.js`.
- Removed fabricated awards: Awwwards, CSS Design Awards, FWA, and Clutch.
- Removed unsupported metrics: `140+ projects`, `88% clients return`, `14 specialists`, and `10 years`.
- Removed unverified founding-year claims (`2016`) from UI and structured data.
- Removed generic Motion language and `View the lab`.
- Removed the unsupported Crystal Digitizing relationship claim.
- Removed the unsupported promise to reply within two business days.

### Factual replacements added

- Expanded `lib/clients.js` with the three supplied client records, restrained summaries, and presentation palettes.
- `Facts.jsx` now uses computed values from the supplied archive:
  - 20 supplied reviews
  - 4.3/5 calculated average
  - 17 four- or five-star reviews
  - 3 named original clients
- `Recognition.jsx` is now a client/evidence record instead of a fake awards section.
- `Showcase.jsx` and `ShowcaseBoxes.jsx` now use the three named clients instead of invented projects.
- `/work` is now a transparent client record with only supplied identities and a link to Porsha Patterson's supplied review.
- Motion now says `CWS IN MOTION` and describes real features of this site: continuous 3D, scroll-linked motion, responsive fallbacks, and accessible content.
- The six flying cards now name real CWS capabilities: web design, Next.js development, identity systems, scroll interaction, AI automation, and workflow automation.
- `lib/site.js` now uses the official business phone and location information.
- JSON-LD now includes the verified phone and US/UAE service areas, with the unverified founding date removed.

## Current Uncommitted Files

At handoff time, the content cleanup affects:

- `app/embroidery-screen-printing-web-design/page.jsx`
- `app/globals.css`
- `app/layout.jsx`
- `app/reviews/page.jsx`
- `app/sitemap.js`
- `app/work/page.jsx`
- `components/Menu.jsx`
- `components/sections/Contact.jsx`
- `components/sections/Facts.jsx`
- `components/sections/Hero.jsx`
- `components/sections/Motion.jsx`
- `components/sections/Recognition.jsx`
- `components/sections/Showcase.jsx`
- `components/three/RecognitionRing.jsx`
- `components/three/ShowcaseBoxes.jsx`
- `lib/chime.js`
- `lib/clients.js`
- `lib/motionStudies.mjs`
- `lib/site.js`
- deleted: `app/work/[slug]/page.jsx`
- deleted: `lib/projects.js`
- this handoff file

Run `git status --short --branch` before continuing in case the workspace changed after this handoff.

## Required Next Steps

1. Inspect the full uncommitted diff and fix any JSX, import, layout, or accessibility issue.
2. Add content regression tests that fail if fabricated names, awards, metrics, or generic Motion copy return.
3. Confirm every old `PROJECTS`/`getProject` import is gone.
4. Audit visible app copy one more time for unsupported business claims. Treat service descriptions as capabilities, but remove hard results, counts, dates, guarantees, or named endorsements unless sourced.
5. Verify desktop and mobile layouts, especially:
   - the Motion caption and link at the bottom of the mobile screenshot
   - the three-card Showcase behavior
   - the `/work` client-record layout
   - Recognition rows with badges such as `CLIENT` rather than four-digit years
6. Run tests and build checks.
7. Commit only after verification on `codex/contentinous`.

## Suggested Regression Checks

Search for removed content:

```powershell
rg -n "PROJECTS|getProject|lib/projects|Aurora Finance|Meridian Atelier|Northwind Labs|Halcyon Audio|Terra Verde|Brightpath Clinic|Cobalt Logistics|Ironwood Manufacturing|Awwwards|CSS Design Awards|Clutch Verified|FWA|140\+|clients return|specialists in-house|years deep|View the lab|Concepts, explorations" app components lib tests
```

The command should return no content matches.

Run the existing Node tests:

```powershell
node --test tests/*.test.mjs
```

Check whitespace/errors:

```powershell
git diff --check
```

Build:

```powershell
npm run build
```

Known environment note: this machine previously ran Node 24 with Next 14. Compilation succeeded, but a prior full build failed later during route-manifest generation around `/_document` or `/sitemap.xml`. Distinguish an environment/runtime incompatibility from a source compile failure and report the exact phase.

## Recommended Test Additions

Extend `tests/content.test.mjs` or add a focused content-integrity test that asserts:

- `VERIFIED_CLIENTS` contains exactly the three supplied client identities.
- `REVIEW_STATS` remains `20`, `4.3`, and `17` for the supplied archive.
- app/component/lib source does not contain the eight synthetic company names.
- source does not contain the four fabricated award names.
- Motion does not contain `View the lab` or the old generic caption.
- `app/sitemap.js` has no fabricated `/work/<slug>` entries.
- no `lib/projects.js` dependency remains.

## Decisions to Preserve

- Do not create polished fake case studies to fill visual space.
- Abstract procedural artwork is acceptable when clearly used as CWS visual language, not passed off as a client deliverable.
- Do not rewrite negative reviews into positive ones or omit them from the full archive.
- The earlier user instruction explicitly rebrands visible `Webbing Designs` references as `Crystal Web Solution`.
- The user wants the final changes committed to `codex/contentinous`.

## Final Commit

After verification:

```powershell
git add -- app components lib tests CLAUDE_HANDOFF.md
git commit -m "refactor: replace placeholder content with verified CWS records"
```

Before committing, review `git diff --cached --stat` and `git diff --cached` so no unrelated file is included.
