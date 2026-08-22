# Inner Pages Entrance Reveals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every inner marketing page currently renders with zero scroll-entrance animation, while every homepage section uses `SectionReveal`/`Reveal`. This plan closes that gap by wrapping each inner page's text/content blocks in the existing `SectionReveal` component, matching the exact idiom already used on the homepage (`components/sections/Approach.jsx`, `components/sections/Services.jsx`, `components/sections/Stories.jsx`).

**Architecture:** No new components, no new visual language. `components/SectionReveal.jsx` already exists, is reduced-motion gated, above-fold-safe, and self-cleaning (see its own doc comment: "Editorial mask used only below the locked Hero... shares one easing/duration language across the site's reading sections" — exactly what inner pages are). Fixing the two shared components (`PageHero.jsx`, `ContentSection.jsx`) covers 5 of 9 route templates in one task; the remaining 4 bespoke-markup templates (work index, work case study, reviews, embroidery case study) each get their own task wrapping their existing JSX in the same component, no markup restructuring.

**Tech Stack:** Next.js 15 App Router, React 19, JSX (no TypeScript), GSAP + ScrollTrigger (via `SectionReveal`), plain global CSS (`app/globals.css`), pnpm.

## Global Constraints

- Every task is **additive JSX wrapping only** — do not change any existing class name, existing DOM element type for un-wrapped content, copy, prop, or CSS rule. The only new import in every touched file is `SectionReveal` from `../SectionReveal` (adjust relative path per file depth — see each task's exact import line).
- `SectionReveal` accepts `{ as, className, direction, delay, duration, start, children, style, ...rest }` and spreads `...rest` (id, aria-*, etc.) onto the element it creates via `createElement(as, {...})`. When wrapping an element that currently carries an `id`, `aria-label`, or other non-className/non-style attribute, move that attribute onto the `SectionReveal` call as a prop — do not drop it.
- Direction/delay convention to match (taken from `components/sections/Services.jsx` and `components/sections/Approach.jsx`): eyebrows and headings use `direction="left"`; body/list/card content uses `direction="up"`. Stagger `delay` in small increments (`0`, `0.05`, `0.1`, `0.15`) so a block's own children don't all animate in at the exact same instant. Do not invent a different direction/delay scheme.
- Do **not** add `'use client'` to any page or shared component file in this plan. `PageHero.jsx` and `ContentSection.jsx` are Server Components today and stay Server Components — a Server Component may import and render a Client Component (`SectionReveal` already has `'use client'` at its own top) as long as only serializable props (strings, numbers, JSX children) cross the boundary, which is all every task here does.
- Do **not** wrap `WorkLibrary` (`components/marketing/WorkLibrary.jsx`)'s internal filtered list items, or the individual `.review-card` items inside `components/... reviews` archive list, in `SectionReveal`. Both are filterable/long lists where per-item ScrollTrigger instances are a real performance and re-render risk — out of scope for this plan. Only the *heading/intro* blocks around those lists get wrapped.
- Do **not** wrap persistent navigation chrome (`case-back` "← All projects" link, `case-next` "next case study" link) in `SectionReveal` — these are always-visible nav affordances, not content that should fade in, matching how the homepage leaves nav (`components/Nav.jsx`) unanimated.
- **Verification contract** (this repo has no automated test suite for visual/animation work — see `CLAUDE.md` / the crystal-web-solution skill's "Verify your change" section): each task's Step "Verify" is `pnpm build` (must complete with zero errors) plus a `grep`/`Read` self-check that the file still imports and calls everything it did before, plus the new `SectionReveal` usages. There is no unit test to write for this plan — do not invent one that asserts nothing (an empty/vacuous test is worse than no test). The controller (not the implementer) will do a final live-browser pass across all 9 route templates after every task is complete and before the PR opens.
- Base branch for this plan: `agent/marketing-inner-pages-polish` (already checked out in this worktree, branched from `agent/marketing-inner-pages` at commit `0dbfb24`). Do not rebase onto `main` or `preview` mid-plan.
- Every commit message is `feat(marketing): <one line>` — no other prefix.

---

### Task 1: Reveal PageHero and ContentSection (fixes 5 route templates: About, Contact, Process, Services index, all `/services/[slug]` pages)

**Files:**
- Modify: `components/marketing/PageHero.jsx`
- Modify: `components/marketing/ContentSection.jsx`

**Interfaces:**
- Consumes: `components/SectionReveal.jsx` — `export default function SectionReveal({ as='div', className='', direction='up', delay=0, duration, start, children, style, ...rest })`. Existing component, no changes.
- Produces: no interface changes. `PageHero`'s and `ContentSection`'s props (`eyebrow`, `title`, `lede`, `children`, `tone`, `id`) are unchanged — every caller (`app/about/page.jsx`, `app/contact/page.jsx`, `app/process/page.jsx`, `app/services/page.jsx`, `components/marketing/ServicePage.jsx`) needs zero changes.

- [ ] **Step 1: Replace `components/marketing/PageHero.jsx` in full**

```jsx
import SectionReveal from '../SectionReveal';

// PageHero — the opening block for inner marketing pages. Reuses the existing
// text-plate + eyebrow + page-title visual language so inner pages feel of a
// piece with the homepage, without importing any homepage runtime.
export default function PageHero({ eyebrow, title, lede, children }) {
  return (
    <section className="mkt-hero">
      <div className="text-plate">
        {eyebrow && (
          <p className="eyebrow">
            <SectionReveal as="span" direction="left">{eyebrow}</SectionReveal>
          </p>
        )}
        <SectionReveal as="h1" className="page-title mkt-hero-title" direction="left" delay={0.05}>
          {title}
        </SectionReveal>
        {lede && (
          <SectionReveal as="p" className="mkt-hero-lede" direction="up" delay={0.15}>
            {lede}
          </SectionReveal>
        )}
        {children}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Replace `components/marketing/ContentSection.jsx` in full**

```jsx
import SectionReveal from '../SectionReveal';

// ContentSection — a labelled content block used across inner marketing pages.
// `tone` switches the background plate so consecutive sections stay legible
// over the same dark canvas. No client-side runtime of its own.
export default function ContentSection({ eyebrow, title, children, tone = 'default', id }) {
  return (
    <section className={`mkt-section mkt-section--${tone}`} id={id}>
      <div className="mkt-section-inner">
        {eyebrow && (
          <p className="eyebrow">
            <SectionReveal as="span" direction="left">{eyebrow}</SectionReveal>
          </p>
        )}
        {title && (
          <SectionReveal as="h2" className="mkt-section-title" direction="left" delay={0.05}>
            {title}
          </SectionReveal>
        )}
        <SectionReveal direction="up" delay={0.15}>
          {children}
        </SectionReveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify — build**

Run: `pnpm build`
Expected: completes with no errors, same route list as before (no route added/removed).

- [ ] **Step 4: Verify — no direct-child CSS selectors broken**

Run: `grep -n "mkt-section-inner\s*>\|text-plate\s*>" app/globals.css`
Expected: no matches (confirmed clean before this task — the new `SectionReveal` wrapper div around `ContentSection`'s children is safe only because no CSS rule assumes those children are direct descendants of `.mkt-section-inner`; if this grep now finds a match, STOP and report — do not proceed, a CSS rule would be silently broken).

- [ ] **Step 5: Verify — every caller still imports cleanly**

Run: `grep -n "PageHero\|ContentSection" app/about/page.jsx app/contact/page.jsx app/process/page.jsx app/services/page.jsx components/marketing/ServicePage.jsx`
Expected: same import/usage lines as before this task (this task changed zero caller files).

- [ ] **Step 6: Commit**

```bash
git add components/marketing/PageHero.jsx components/marketing/ContentSection.jsx
git commit -m "feat(marketing): add scroll-entrance reveals to PageHero and ContentSection"
```

---

### Task 2: Reveal the Work index page

**Files:**
- Modify: `app/work/page.jsx`

**Interfaces:**
- Consumes: `components/SectionReveal.jsx` (same as Task 1). `components/marketing/WorkLibrary.jsx` is unchanged and untouched — do not open or edit that file.
- Produces: no interface changes.

- [ ] **Step 1: Replace `app/work/page.jsx` in full**

```jsx
import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import WorkLibrary from '../../components/marketing/WorkLibrary';
import SectionReveal from '../../components/SectionReveal';
import { PROJECTS } from '../../lib/projects';
import { SITE } from '../../lib/site';

const WORK_TITLE = 'Selected Work';
const WORK_DESCRIPTION =
  'Explore selected Crystal Web Solution projects across product, commerce, local service, learning, and immersive web design.';

export const metadata = {
  title: WORK_TITLE,
  description: WORK_DESCRIPTION,
  alternates: { canonical: '/work' },
  openGraph: {
    type: 'website',
    title: `${WORK_TITLE} | ${SITE.name}`,
    description: WORK_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${WORK_TITLE} | ${SITE.name}`,
    description: WORK_DESCRIPTION,
  },
};

export default function WorkIndex() {
  return (
    <MarketingShell>
      <section className="work-index mkt-inner" aria-labelledby="work-title">
        <SectionReveal as="p" className="eyebrow" direction="left">Selected work</SectionReveal>
        <SectionReveal as="h1" id="work-title" className="page-title" direction="left" delay={0.05}>
          Built around the real problem.
        </SectionReveal>
        <SectionReveal as="p" className="work-index-intro" direction="up" delay={0.15}>
          Six projects, each shaped around what the visitor needed to understand, feel, or do next.
        </SectionReveal>

        <SectionReveal as="div" className="work-library-heading" direction="up">
          <p className="eyebrow">Project library</p>
          <h2>Different briefs. One standard of care.</h2>
        </SectionReveal>

        <WorkLibrary projects={PROJECTS} />

        <SectionReveal as="div" className="work-closing-plate" direction="up">
          <div>
            <p className="eyebrow">One standard of care</p>
            <h2>Every project starts with the real problem.</h2>
          </div>
          <Link href="/process" className="btn btn-ghost" data-cursor="Process">
            View the process →
          </Link>
        </SectionReveal>
      </section>
    </MarketingShell>
  );
}
```

Note: `id="work-title"` moved from the `<h1>` onto the `SectionReveal` call (via `...rest` forwarding) so `aria-labelledby="work-title"` on the parent `<section>` still resolves to the rendered `<h1>`.

- [ ] **Step 2: Verify — build**

Run: `pnpm build`
Expected: completes with no errors. Confirm `app/work/page.jsx` still appears in the route output.

- [ ] **Step 3: Verify — aria-labelledby target still resolves**

Run: `grep -n "aria-labelledby=\"work-title\"\|id=\"work-title\"" app/work/page.jsx`
Expected: both lines present (one on the `<section>`, one now on the `SectionReveal` call).

- [ ] **Step 4: Commit**

```bash
git add app/work/page.jsx
git commit -m "feat(marketing): add scroll-entrance reveals to the Work index page"
```

---

### Task 3: Reveal the Work case-study page

> **Status: PARTIAL (deviated from spec).** The entrance reveals shipped and work correctly, but the implementation went beyond the "additive wrapping only" instruction below. See the **Deviation note** at the end of this task.

**Files:**
- Modify: `app/work/[slug]/page.jsx`

**Interfaces:**
- Consumes: `components/SectionReveal.jsx` (same as Task 1). `components/ProjectVisual.jsx` is unchanged and untouched.
- Produces: no interface changes.

- [ ] **Step 1: Replace `app/work/[slug]/page.jsx` in full**

```jsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProjectVisual from '../../../components/ProjectVisual';
import MarketingShell from '../../../components/marketing/MarketingShell';
import SectionReveal from '../../../components/SectionReveal';
import { PROJECTS, getProject } from '../../../lib/projects';
import { SITE } from '../../../lib/site';

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: SITE.name };

  const description = project.summary.length > 157
    ? `${project.summary.slice(0, 157).trimEnd()}…`
    : project.summary;

  return {
    title: `${project.title} — ${project.category}`,
    description,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: {
      type: 'article',
      title: `${project.title} — ${project.category} | ${SITE.name}`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.title} — ${project.category} | ${SITE.name}`,
      description,
    },
  };
}

export default async function CaseStudy({ params }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const index = PROJECTS.findIndex((item) => item.slug === project.slug);
  const next = PROJECTS[(index + 1) % PROJECTS.length];

  return (
    <MarketingShell>
      <article className="case">
        <Link href="/work" className="case-back" data-cursor="Work">← All projects</Link>
        <SectionReveal as="p" className="eyebrow" direction="left">
          Case study • {project.category}
        </SectionReveal>
        <SectionReveal as="h1" className="page-title" direction="left" delay={0.05}>
          {project.title}
        </SectionReveal>
        <SectionReveal as="p" className="case-summary" direction="up" delay={0.1}>
          {project.summary}
        </SectionReveal>
        <SectionReveal as="ul" className="case-services" aria-label="Services" direction="up" delay={0.15}>
          {project.services.map((service) => <li key={service}>{service}</li>)}
        </SectionReveal>
        <SectionReveal direction="up" delay={0.1}>
          <ProjectVisual palette={project.palette} title={project.title} ratio="21 / 9" />
        </SectionReveal>
        <SectionReveal as="div" className="case-body" direction="up" delay={0.1}>
          {project.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </SectionReveal>
        <Link href={`/work/${next.slug}`} className="case-next" data-cursor="Next case study">
          <span className="eyebrow">Next case study</span>
          <span className="case-next-title">{next.title} →</span>
        </Link>
      </article>
    </MarketingShell>
  );
}
```

Note: `aria-label="Services"` moved from the `<ul>` onto the `SectionReveal` call (via `...rest` forwarding).

**Deviation note (what actually shipped, 2026-08-13 audit):** The implementation did not follow the additive-wrapping-only shape above. Instead of wrapping the existing `case-body` block in one `SectionReveal`, `app/work/[slug]/page.jsx` was restructured:
- A `beatsFor()` helper splits `project.body` into problem / approach / result beats, each wrapped in its own `<SectionReveal as="section">`.
- The old `case-next` `<Link>` was replaced by a `CaseNavRail` component.
- `CaseGallery`, `BreadcrumbSchema`, and a `CreativeWork` JSON-LD schema were added (all beyond this task's spec scope).

The entrance reveals function correctly and the build is clean — the goal of this task (scroll-entrance animation on the work case-study page) is met. The deviation is documented here so the plan matches shipped reality; it is not a defect.

- [ ] **Step 2: Verify — build**

Run: `pnpm build`
Expected: completes with no errors. `generateStaticParams` is untouched by this task, so the static path list for `/work/[slug]` is generated the same way as before — confirm the build output's `/work/[slug]` section still lists paths (e.g. `/work/tucker-trips`, `/work/talk-to-my-lawyer`) matching the slugs in `lib/projects.js`'s `PROJECTS` array.

- [ ] **Step 3: Commit**

```bash
git add "app/work/[slug]/page.jsx"
git commit -m "feat(marketing): add scroll-entrance reveals to the Work case-study page"
```

---

### Task 4: Reveal the Reviews page

**Files:**
- Modify: `app/reviews/page.jsx`

**Interfaces:**
- Consumes: `components/SectionReveal.jsx` (same as Task 1).
- Produces: no interface changes.

**Do not** wrap the `.review-list`'s individual `.review-card` `<article>` elements (per Global Constraints — long list, out of scope). Only wrap the section-level heading/intro blocks.

- [ ] **Step 1: Replace `app/reviews/page.jsx` in full**

```jsx
import Link from 'next/link';
import { REVIEWS, REVIEW_STATS } from '../../lib/reviews';
import { SITE } from '../../lib/site';
import MarketingShell from '../../components/marketing/MarketingShell';
import SectionReveal from '../../components/SectionReveal';

const REVIEWS_TITLE = 'Client Reviews';
const REVIEWS_DESCRIPTION =
  `Read all ${REVIEW_STATS.total} published client reviews for Crystal Web Solution, with ratings, dates, feedback, and company replies.`;

export const metadata = {
  title: REVIEWS_TITLE,
  description: REVIEWS_DESCRIPTION,
  alternates: { canonical: '/reviews' },
  openGraph: {
    type: 'website',
    title: `${REVIEWS_TITLE} | ${SITE.name}`,
    description: REVIEWS_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${REVIEWS_TITLE} | ${SITE.name}`,
    description: REVIEWS_DESCRIPTION,
  },
};

function Rating({ value }) {
  return (
    <span className="review-rating" aria-label={`${value} out of 5 stars`}>
      <span aria-hidden="true">{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>
      <span>{value}/5</span>
    </span>
  );
}

export default function ReviewsPage() {
  return (
    <MarketingShell>
      <main className="reviews-index mkt-inner">
        <section className="reviews-hero" aria-labelledby="reviews-title">
          <SectionReveal as="p" className="eyebrow" direction="left">Client feedback</SectionReveal>
          <SectionReveal as="h1" id="reviews-title" className="page-title" direction="left" delay={0.05}>
            What clients said, in their own words.
          </SectionReveal>
          <SectionReveal as="p" className="reviews-lede" direction="up" delay={0.1}>
            {REVIEW_STATS.total} client reviews, published in full. Read the praise, the criticism, and the company replies in one place.
          </SectionReveal>
          <SectionReveal as="dl" className="reviews-summary" aria-label="Review summary" direction="up" delay={0.15}>
            <div><dt>Reviews</dt><dd>{REVIEW_STATS.total}</dd></div>
            <div><dt>Average</dt><dd>{REVIEW_STATS.average}/5</dd></div>
            <div><dt>Four or five stars</dt><dd>{REVIEW_STATS.positive}</dd></div>
            <div><dt>Latest review</dt><dd>{REVIEW_STATS.latest}</dd></div>
          </SectionReveal>
          <SectionReveal as="aside" className="reviews-transparency" direction="up" delay={0.15}>
            <strong>Transparency</strong>
            <p>Every published review appears here, including critical feedback. Company replies appear beneath the relevant review.</p>
          </SectionReveal>
        </section>

        <section className="reviews-standard" aria-labelledby="response-standard-title">
          <SectionReveal as="p" className="eyebrow" direction="left">Response standard</SectionReveal>
          <SectionReveal as="h2" id="response-standard-title" direction="left" delay={0.05}>
            Concerns deserve a clear, documented response.
          </SectionReveal>
          <SectionReveal as="ul" direction="up" delay={0.1}>
            <li>Acknowledge the concern without arguing with the reviewer.</li>
            <li>State what can be confirmed and what still needs clarification.</li>
            <li>Avoid discussing confidential project details in public.</li>
            <li>Offer one current contact route and a specific next step.</li>
          </SectionReveal>
        </section>

        <section className="review-archive" aria-labelledby="archive-title">
          <SectionReveal as="div" className="review-archive-heading" direction="up">
            <p className="eyebrow">Published reviews</p>
            <h2 id="archive-title">All client reviews</h2>
          </SectionReveal>

          <div className="review-list">
            {REVIEWS.map((review) => (
              <article key={review.id} id={review.id} className={`review-card review-card-${review.rating}`}>
                <header className="review-card-header">
                  <div>
                    <h3>{review.reviewer}</h3>
                    {review.company && <p className="review-client">{review.company}</p>}
                    <p className="review-headline">{review.headline}</p>
                  </div>
                  <Rating value={review.rating} />
                </header>
                <p className="review-meta">
                  {review.country} • {review.reviewCount} {review.reviewCount === 1 ? 'review' : 'reviews'} • {review.date}
                </p>
                <div className="review-body">
                  {review.body.map((paragraph, index) => <p key={`${review.id}-${index}`}>{paragraph}</p>)}
                </div>
                {review.reply && (
                  <aside className="review-reply">
                    <strong>Company reply • {review.reply.date}</strong>
                    <p>{review.reply.body}</p>
                  </aside>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="reviews-close">
          <SectionReveal as="p" className="eyebrow" direction="left">From idea to outcome</SectionReveal>
          <SectionReveal as="h2" direction="left" delay={0.05}>Let&apos;s make something rare.</SectionReveal>
          <SectionReveal as="p" direction="up" delay={0.1}>
            Send us your brief. We&apos;ll give you a straight read on scope, timeline, cost, and the first move if it&apos;s a fit.
          </SectionReveal>
          <SectionReveal direction="up" delay={0.15}>
            <a href={`mailto:${SITE.email}`} className="btn btn-solid">Start a project <span aria-hidden="true">→</span></a>
          </SectionReveal>
        </section>
      </main>
    </MarketingShell>
  );
}
```

Note: `id="reviews-title"` and `id="response-standard-title"` each moved from their heading element onto the `SectionReveal` call so the `aria-labelledby` references on the parent `<section>`s still resolve. `aria-label="Review summary"` similarly moved onto the `SectionReveal` wrapping the `<dl>`. The `.review-list` block (all individual review cards) is untouched — confirm your diff shows zero changes inside that block.

- [ ] **Step 2: Verify — build**

Run: `pnpm build`
Expected: completes with no errors.

- [ ] **Step 3: Verify — all aria-labelledby/aria-label targets still resolve**

Run: `grep -n "aria-labelledby\|aria-label=\"Review summary\"\|id=\"reviews-title\"\|id=\"response-standard-title\"\|id=\"archive-title\"" app/reviews/page.jsx`
Expected: every `aria-labelledby="X"` has a matching `id="X"` still present somewhere in the file.

- [ ] **Step 4: Verify — review-list block untouched**

Run: `git diff app/reviews/page.jsx -- | grep -A2 -B2 "review-list"`
Expected: no `+`/`-` lines touching the `.review-list` div or anything inside it (only context lines, if it shows up at all).

- [ ] **Step 5: Commit**

```bash
git add app/reviews/page.jsx
git commit -m "feat(marketing): add scroll-entrance reveals to the Reviews page"
```

---

### Task 5: Reveal the embroidery/screen-printing case-study page

**Files:**
- Modify: `app/embroidery-screen-printing-web-design/page.jsx`

**Interfaces:**
- Consumes: `components/SectionReveal.jsx` (same as Task 1).
- Produces: no interface changes.

- [ ] **Step 1: Replace `app/embroidery-screen-printing-web-design/page.jsx` in full**

```jsx
import Link from 'next/link';
import { SITE } from '../../lib/site';
import MarketingShell from '../../components/marketing/MarketingShell';
import SectionReveal from '../../components/SectionReveal';

export const metadata = {
  title: 'Embroidery & Screen-Printing Web Design',
  description:
    'Custom websites for embroidery and screen-printing shops — built for wholesale reorders, multi-method catalogs, and B2B accounts. Get a free quote.',
  alternates: { canonical: '/embroidery-screen-printing-web-design' },
  openGraph: {
    type: 'article',
    title: `Embroidery & Screen-Printing Web Design | ${SITE.name}`,
    description:
      'Custom websites for embroidery and screen-printing shops — built for wholesale reorders, multi-method catalogs, and B2B accounts.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Embroidery & Screen-Printing Web Design | ${SITE.name}`,
    description:
      'Custom websites for embroidery and screen-printing shops — built for wholesale reorders, multi-method catalogs, and B2B accounts.',
  },
};

export default function EmbroideryScreenPrintingWebDesign() {
  return (
    <MarketingShell>
      <main className="case mkt-inner">
        <SectionReveal as="p" className="eyebrow" direction="left">Web Design for the Trade</SectionReveal>
        <SectionReveal as="h1" className="page-title" direction="left" delay={0.05}>
          Website Design for Embroidery &amp; Screen-Printing Shops
        </SectionReveal>

        <SectionReveal as="div" className="callout" direction="up" delay={0.1}>
          <p>
            <strong>Short answer:</strong> most embroidery and screen-printing shop websites
            don&rsquo;t lose orders because they look dated. They lose orders because a template
            can&rsquo;t handle a wholesale reorder, a three-decoration-method price sheet, or a
            net-30 B2B account. If your shop sells one-off retail pieces at a flat price, a
            template is genuinely the right call — keep it, and put your money into something
            else. If a returning customer has to call instead of click &ldquo;reorder,&rdquo;
            that&rsquo;s the actual problem, and it&rsquo;s fixable.
          </p>
        </SectionReveal>

        <SectionReveal as="div" className="case-body" direction="up" delay={0.1}>
          <p>
            A screen-printing shop doesn&rsquo;t lose a wholesale account because the homepage
            font is wrong. It loses the account because the customer who ordered 200 hoodies in
            March can&rsquo;t find last order&rsquo;s artwork, sizes, and price break in April —
            so they email, then wait, then a competitor with an online reorder button gets the
            June run instead. That&rsquo;s not a design complaint. It&rsquo;s an order-flow
            failure wearing a website&rsquo;s clothes.
          </p>

          <h2>When a template is actually the right answer</h2>
          <p>
            Worth saying plainly, because most web design pitches won&rsquo;t: if your shop is
            retail-only, one decoration method, flat per-piece pricing, and orders come from
            walk-ins or a handful of regulars — a Shopify or Squarespace template with a decent
            product catalog app covers it. Paying for custom design there is money spent on a
            problem you don&rsquo;t have. A good web designer tells you this up front instead of
            selling you a build you didn&rsquo;t need.
          </p>
          <p>The line moves the moment any of three things enter the picture.</p>

          <h2>The three places templates break</h2>
          <p>
            <strong>Wholesale reorders.</strong> A uniform program, a school spirit-wear
            contract, a promo distributor&rsquo;s standing order — these aren&rsquo;t one-time
            purchases, they&rsquo;re relationships with a memory. The customer needs to see their
            last order, their agreed pricing, and their saved artwork without re-explaining
            themselves every time. Generic e-commerce templates model &ldquo;browse, add to cart,
            checkout&rdquo; — not &ldquo;reorder exactly what we got last time, at our rate.&rdquo;
          </p>
          <p>
            <strong>Multi-method catalogs.</strong> Most shops don&rsquo;t run one decoration
            method. Embroidery, screen printing, and DTF often live in the same shop, each with
            its own minimum order quantity, its own price break at 12/24/48/100 units, and its
            own turnaround time. A catalog built for a single flat SKU price can&rsquo;t
            represent that without either hiding the complexity (customer gets a wrong quote and
            calls to argue) or exposing all of it badly (customer gets confused and leaves).
          </p>
          <p>
            <strong>B2B accounts.</strong> Net-30 terms, tax-exempt resale accounts, a sales rep
            who needs to see a client&rsquo;s order history before a call — none of this exists in
            a template built for consumer checkout. Shops without it route every B2B interaction
            through email and phone, which caps how many accounts one person can actually manage.
          </p>
          <p>None of these are cosmetic. They&rsquo;re the difference between a website that
          displays your shop and one that runs part of it.</p>

          <h2>Why most web design agencies miss this</h2>
          <p>
            Not because they&rsquo;re bad at design. Because they&rsquo;ve never sat inside a
            print shop&rsquo;s order queue. A portfolio-first agency looks at embroidery and
            screen-printing sites the way the industry&rsquo;s own &ldquo;best screen printing
            websites&rdquo; roundups do — as visual case studies, judged on how the homepage
            photographs. That&rsquo;s a fair way to judge a restaurant&rsquo;s website. It&rsquo;s
            the wrong lens for a shop where the real product is a repeatable, price-broken,
            multi-method order — because the thing that makes the site work is mostly invisible
            in a screenshot.
          </p>
          <p>
            {SITE.name} offers custom web design, e-commerce development, software development,
            AI development, and portal integration. For a decoration business, we apply those
            capabilities to the parts that matter here: structured catalogs, account access,
            order history, and repeat-order workflows.
          </p>

          <h2>What we actually build</h2>
          <p>
            A site that treats your catalog, your pricing tiers, and your reorder logic as the
            product — not an afterthought bolted onto a template. That means: a catalog
            structured around your real decoration methods and their real minimums, not a single
            flat SKU price; a reorder path for standing wholesale customers that doesn&rsquo;t
            route through your inbox; and, where you need it, a B2B account layer with net terms
            and order history — instead of a beautiful homepage sitting in front of the same
            phone-and-email workflow you already have.
          </p>
          <p>
            We won&rsquo;t build you the expensive version if the affordable template genuinely
            does the job. We will tell you, plainly, which one you actually need.
          </p>
        </SectionReveal>

        <SectionReveal as="ul" className="case-services" direction="up" delay={0.1}>
          <li>Custom Web Design</li>
          <li>Embroidery &amp; Print Catalogs</li>
          <li>B2B &amp; Wholesale Accounts</li>
        </SectionReveal>

        <Link href="/work" className="case-next" data-cursor="View work">
          <span className="eyebrow">See our work</span>
          <span className="case-next-title">Every project, one standard →</span>
        </Link>
      </main>
    </MarketingShell>
  );
}
```

- [ ] **Step 2: Verify — build**

Run: `pnpm build`
Expected: completes with no errors. Confirm `/embroidery-screen-printing-web-design` still appears in the static route output.

- [ ] **Step 3: Verify — no copy changed**

Run: `git diff app/embroidery-screen-printing-web-design/page.jsx | grep -E "^[+-]" | grep -v "SectionReveal\|^+++\|^---"`
Expected: no output — every added/removed line should be a `SectionReveal` open/close tag or import line; zero copy characters changed. If this shows a copy diff, STOP and fix before committing — this page's text is verbatim client-facing copy per `CLAUDE.md`'s "never copy Trionn's actual copy" adjacent rule (its own copy must not drift either).

- [ ] **Step 4: Commit**

```bash
git add app/embroidery-screen-printing-web-design/page.jsx
git commit -m "feat(marketing): add scroll-entrance reveals to the embroidery case-study page"
```

---

## Final Verification (after all 5 tasks)

- [ ] Run `pnpm build` once more from a clean state to confirm the full branch builds.
- [ ] Run `pnpm test` (existing Node test suite) to confirm nothing in `tests/` broke (none of these tasks touch tested logic, but this is a cheap final gate).
- [ ] Controller does a live-browser pass (dev server + the browser tool) across all 9 route templates — `/about`, `/contact`, `/process`, `/services`, one `/services/[slug]` page, `/work`, one `/work/[slug]` page, `/reviews`, `/embroidery-screen-printing-web-design` — confirming: entrance animation plays once on scroll-into-view, no layout shift, no console errors, and `prefers-reduced-motion: reduce` shows all content immediately with no animation (toggle via browser emulation or `resize_window`'s colorScheme-adjacent settings / OS-level check).
