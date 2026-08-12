# Typography — Reference

Deep reference for the `website-designer` skill. Type carries most of a design's hierarchy and personality; get it right before adding any decoration.

## 1. Choosing faces (1–2 max)
- **Body face must be highly legible** at 16px: open apertures, generous x-height, true italics, multiple weights. Safe modern workhorses: Inter, Source Sans, IBM Plex Sans, Geist, system-ui.
- **Display face is optional** — add one only if the tone wants personality (headlines, hero). It can be a contrasting serif, a geometric sans, or a characterful grotesk.
- **Pair by contrast, harmonize by mood.** A pairing works when the two faces are clearly *different* (serif + sans, geometric + humanist) yet share era/mood. Same-but-slightly-different pairs look like a mistake.
- **Or pair by superfamily** for guaranteed harmony: IBM Plex Sans + Plex Serif + Plex Mono; Source Sans + Source Serif.
- **Tested pairings:**
  - Editorial/premium: *Fraunces* or *Playfair Display* (display serif) + *Inter* (body sans).
  - Technical/SaaS: *Space Grotesk* or *Geist* (display) + *Inter*/*Geist* (body).
  - Friendly/modern: *Poppins* or *Cabinet Grotesk* (display) + *Inter* (body).
  - Classic/trustworthy: *Source Serif* (display) + *Source Sans* (body).
  - Minimal/luxury: a single grotesk (e.g. *Neue Haas*-style) across the board, hierarchy via weight & size only.
- **Performance:** prefer variable fonts, `font-display: swap`, subset, self-host or `system-ui` for zero-cost. Limit to 2 families × 2–3 weights.

## 2. Modular scale (size system)
Pick ONE ratio and generate all sizes from a 1rem (16px) base. Larger ratio = more dramatic hierarchy (good for marketing); smaller = denser (good for apps/dashboards).

| Ratio | Name | Feel | Steps from 1rem (16px) |
|------:|------|------|------------------------|
| 1.125 | Major second | Tight, dense (dashboards) | 16 · 18 · 20.3 · 22.8 · 25.6 |
| 1.200 | Minor third  | Balanced UI | 16 · 19.2 · 23 · 27.6 · 33.2 |
| 1.250 | Major third  | **Default — versatile** | 16 · 20 · 25 · 31.25 · 39 · 48.8 |
| 1.333 | Perfect fourth | Marketing, expressive | 16 · 21.3 · 28.4 · 37.9 · 50.5 |
| 1.414 | Augmented fourth | Bold editorial | 16 · 22.6 · 32 · 45.3 · 64 |
| 1.618 | Golden | Dramatic hero/landing | 16 · 25.9 · 41.9 · 67.8 |

- **Fluid type** for big headings so they scale across viewports: `font-size: clamp(2rem, 5vw, 3.5rem);`
- Consider a **dual scale**: a tighter ratio (1.2) for body/UI text and a looser one (1.333+) for marketing headlines.

## 3. Line-height (leading)
Inverse to size: small text needs more, large text needs less.
| Context | line-height |
|---------|-------------|
| Display / hero (≥40px) | 1.0–1.15 |
| Headings (h1–h3) | 1.15–1.3 |
| Body / paragraphs | 1.5–1.65 |
| Dense UI / captions | 1.35–1.45 |
| Long-form reading | 1.6–1.8 |

## 4. Measure (line length)
- **Body: 60–75 characters per line** (~`max-width: 65ch`). Below ~45ch the eye ratchets; above ~80ch it loses the next line.
- Narrow it for sidebars/cards; never run full-bleed paragraphs across a wide desktop.

## 5. Hierarchy toolkit
Create hierarchy with the *fewest* signals that work. Order of preference: **size → weight → color/contrast → space → case/tracking**.
- **Weight:** body 400, emphasis/UI labels 500, headings 600–700, display 700–800. Avoid >3 weights.
- **Tracking:** tighten large headings slightly (`-0.01` to `-0.03em`); large type set at default tracking looks loose. Add positive tracking only to small ALL-CAPS labels (`+0.04–0.08em`).
- **Case:** uppercase only for short eyebrow/label text, with tracking. Never uppercase long copy.
- **Color:** demote secondary text via `--color-text-muted`, not by shrinking it below legibility.
- **Space** above a heading should exceed space below it, so the heading binds to the content it introduces.

## 6. Type CSS pattern
```css
body { font-family: var(--font-sans); font-size: var(--fs-base);
       line-height: var(--lh-normal); color: var(--color-text);
       -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
h1 { font-family: var(--font-display); font-size: clamp(2rem,5vw,var(--fs-5xl));
     line-height: var(--lh-tight); letter-spacing: var(--tracking-tight); font-weight: 700; }
h2 { font-size: var(--fs-3xl); line-height: var(--lh-snug); font-weight: 650; }
h3 { font-size: var(--fs-xl);  line-height: var(--lh-snug); font-weight: 600; }
p, li { max-width: 68ch; }
.eyebrow { font-size: var(--fs-sm); font-weight: 600; letter-spacing: var(--tracking-wide);
           text-transform: uppercase; color: var(--color-primary); }
.caption { font-size: var(--fs-sm); color: var(--color-text-muted); }
```

## 7. Type anti-patterns
- More than 2 families, or many weights of each.
- Body text below 16px on the web (14px only for genuinely secondary/dense UI).
- Justified text (rivers of whitespace) or center-aligned multi-line paragraphs.
- Faint low-contrast body text in the name of "elegance."
- Headings with default loose tracking; or all-caps long passages.
- Inconsistent sizes off-scale (`17px`, `23px`) instead of scale steps.
