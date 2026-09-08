# CD Sportswear USA — design system

Dark cinematic studio site. Marketing inner pages share tokens and type with
the homepage WebGL stage; they do not restyle the brand.

## Product

Clarity. Craft. Impact. Distinctive websites, brand systems, motion, and AI
automation. Audience: founders and marketing leads who need the site to read
as intentional, not templated.

## Tokens

- `--bg: #04060c`
- `--ink: #eaf2ff`
- `--muted: #8b98b8`
- `--cyan: #59f3ff`
- `--blue: #3c6cff`
- `--violet: #c084fc`
- `--line: rgba(139, 152, 184, 0.18)`
- `--font-display: Space Grotesk`
- `--font-body: Inter`
- `--font-mono: Space Mono`
- `--spring`: mass-spring-damper linear() used for micro-interactions
- `--text-lift`, `--plate`, `--plate-centered`: local text-plate scrims

No Tailwind. Global CSS in `app/styles/`. Radius on marketing cards: 12–16px.
No invented ratings, stock photos, or decorative binary media — instruments
are procedural (SVG / Three.js).

## Motion

One RAF clock (Lenis + gsap.ticker). Reduced motion is mandatory: strip SMIL,
gate `useFrame`, skip card translate, resolve SectionReveal immediately.
Durations live in `lib/easing.js` (`DURATION_FAST/NORMAL/SLOW/CINEMATIC`).

## Marketing service page

- Shell: `SubpageExperience` — IdleScene canvas (pointer-events none),
  SubpageNav, FocusVeil, ScrollProgress, MarketingFooter.
- Hero: eyebrow (Service 0N) + one H1 + lede + 3D service emblem beside the
  title on desktop, stacked on small screens.
- Sections: Overview, Capabilities, Deliverables, Process, For you, FAQ,
  Related, Contact form.
- Breadcrumb uses the short taxonomy label; H1 uses the SEO heading.

## Logo

Use `/cd-sportswear-usa-logo.png` (SITE.logoPath) in every logo position.
Never substitute initials, emoji, or invented marks.
