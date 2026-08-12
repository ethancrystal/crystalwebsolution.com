# Color & Design Tokens — Reference

Deep reference for the `website-designer` skill. Tokens are the single source of truth; component CSS references tokens, never literals.

## 1. Building a palette (the method)

1. **Pick one brand hue.** Anchor to brand if it exists. Otherwise choose by tone:
   - Blue/indigo → trustworthy, technical, calm (default for SaaS/fintech).
   - Green/teal → growth, health, finance, sustainability.
   - Purple/violet → creative, premium, modern.
   - Warm (amber/orange/coral) → energetic, friendly, approachable.
   - Near-monochrome + tiny accent → editorial, luxury, minimal.
2. **Generate a 50→950 ramp** of the brand hue (light tints → dark shades). Keep hue roughly constant; let lightness and chroma move. The mid step (~500/600) is the "true" brand color used for buttons/links.
3. **Build a neutral ramp** — do NOT use pure gray. Tint neutrals slightly toward the brand hue (or its complement for a cool/clinical feel). Hue-tinted neutrals make a UI feel designed and cohesive. 10 steps: 50,100,200,300,400,500,600,700,800,900 (+ optional 950).
4. **Add at most one accent** for emphasis/CTA contrast — usually a hue 60–180° from the brand for tasteful tension, or a brighter/warmer version of the brand.
5. **Reserve status hues** strictly: red=danger, green=success, amber=warning, blue=info. Don't reuse the brand hue for status meaning.
6. **Tune perceptually.** Prefer OKLCH/HSL so steps feel evenly spaced; equal RGB jumps look uneven. In modern CSS, `oklch()` gives the most uniform ramps.

### Neutral-ramp recipe (HSL, tinted toward brand hue H)
| Step | L (light theme) | Use |
|------|-----------------|-----|
| 50   | 98%  | page background |
| 100  | 96%  | subtle surface / hover bg |
| 200  | 92%  | borders (subtle), dividers |
| 300  | 86%  | borders (default), disabled bg |
| 400  | 70%  | placeholder text, disabled text |
| 500  | 56%  | muted/secondary text (check contrast!) |
| 600  | 44%  | secondary text on light |
| 700  | 33%  | body text (alt) |
| 800  | 22%  | headings |
| 900  | 14%  | primary text (near-black, not #000) |
Saturation 4–10% (subtle tint), all sharing the brand hue. For a cool/clinical feel, shift hue ~210–230.

## 2. Semantic roles (map ramp → meaning)
Always style components against **semantic** tokens, not raw ramp steps. This is what makes theming and dark mode trivial.

```
--color-bg            page background
--color-surface       cards/panels above bg
--color-surface-2     nested/raised surface
--color-text          primary body text
--color-text-muted    secondary text
--color-text-subtle   captions, placeholders
--color-border        default hairline border
--color-border-strong emphasized divider
--color-primary       brand action (buttons, links)
--color-primary-hover
--color-primary-fg    text/icon ON primary (usually white)
--color-accent        secondary emphasis
--color-ring          focus-visible outline
--color-danger / -success / -warning / -info  (+ matching -fg, -bg)
```

## 3. Full CSS token template (copy & tune)

```css
:root {
  /* ---- Brand ramp (example: indigo) ---- */
  --indigo-50:#eef2ff; --indigo-100:#e0e7ff; --indigo-200:#c7d2fe;
  --indigo-300:#a5b4fc; --indigo-400:#818cf8; --indigo-500:#6366f1;
  --indigo-600:#4f46e5; --indigo-700:#4338ca; --indigo-800:#3730a3;
  --indigo-900:#312e81;

  /* ---- Neutral ramp (hue-tinted slate) ---- */
  --n-50:#f8fafc; --n-100:#f1f5f9; --n-200:#e2e8f0; --n-300:#cbd5e1;
  --n-400:#94a3b8; --n-500:#64748b; --n-600:#475569; --n-700:#334155;
  --n-800:#1e293b; --n-900:#0f172a;

  /* ---- Semantic roles (light) ---- */
  --color-bg:           var(--n-50);
  --color-surface:      #ffffff;
  --color-surface-2:    var(--n-100);
  --color-text:         var(--n-900);
  --color-text-muted:   var(--n-600);
  --color-text-subtle:  var(--n-500);
  --color-border:       var(--n-200);
  --color-border-strong:var(--n-300);
  --color-primary:      var(--indigo-600);
  --color-primary-hover:var(--indigo-700);
  --color-primary-fg:   #ffffff;
  --color-accent:       #0ea5e9;
  --color-ring:         var(--indigo-500);
  --color-danger:#dc2626;  --color-danger-bg:#fef2f2;
  --color-success:#16a34a; --color-success-bg:#f0fdf4;
  --color-warning:#d97706; --color-warning-bg:#fffbeb;
  --color-info:#0284c7;    --color-info-bg:#f0f9ff;

  /* ---- Type ---- */
  --font-sans:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --font-display:var(--font-sans);
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
  --fs-xs:.75rem; --fs-sm:.875rem; --fs-base:1rem; --fs-lg:1.125rem;
  --fs-xl:1.25rem; --fs-2xl:1.563rem; --fs-3xl:1.953rem;
  --fs-4xl:2.441rem; --fs-5xl:3.052rem;  /* ratio 1.25 */
  --lh-tight:1.15; --lh-snug:1.3; --lh-normal:1.5; --lh-relaxed:1.7;
  --tracking-tight:-0.02em; --tracking-wide:0.04em;

  /* ---- Spacing (4px base) ---- */
  --space-1:.25rem; --space-2:.5rem; --space-3:.75rem; --space-4:1rem;
  --space-5:1.5rem; --space-6:2rem; --space-8:3rem; --space-10:4rem;
  --space-12:6rem; --space-16:8rem;

  /* ---- Radii ---- */
  --radius-sm:6px; --radius-md:10px; --radius-lg:16px;
  --radius-xl:24px; --radius-full:9999px;

  /* ---- Elevation (soft, tinted, multi-layer) ---- */
  --shadow-xs:0 1px 2px rgba(15,23,42,.06);
  --shadow-sm:0 1px 3px rgba(15,23,42,.08),0 1px 2px rgba(15,23,42,.04);
  --shadow-md:0 4px 12px rgba(15,23,42,.08),0 2px 4px rgba(15,23,42,.04);
  --shadow-lg:0 12px 32px rgba(15,23,42,.12),0 4px 8px rgba(15,23,42,.05);
  --shadow-xl:0 24px 56px rgba(15,23,42,.16);

  /* ---- Motion ---- */
  --ease-out:cubic-bezier(.16,1,.3,1);
  --dur-fast:120ms; --dur-base:200ms; --dur-slow:320ms;

  /* ---- Layout ---- */
  --container:1200px; --gutter:clamp(1rem,4vw,2rem);
  --bp-sm:640px; --bp-md:768px; --bp-lg:1024px; --bp-xl:1280px;
}
```

## 4. Dark mode strategy
Re-map **semantic roles only**; component CSS is untouched. Never `filter: invert()`.

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:          var(--n-900);
    --color-surface:     var(--n-800);
    --color-surface-2:   var(--n-700);
    --color-text:        var(--n-50);
    --color-text-muted:  var(--n-300);
    --color-text-subtle: var(--n-400);
    --color-border:      var(--n-700);
    --color-border-strong:var(--n-600);
    --color-primary:     var(--indigo-400); /* lighten brand for dark bg */
    --color-primary-hover:var(--indigo-300);
    --color-primary-fg:  var(--n-900);
  }
}
/* Prefer a [data-theme="dark"] attribute hook when a manual toggle is needed. */
```
Dark-mode rules:
- **Surfaces get lighter as they rise** (bg darkest → cards lighter), the opposite of light mode's shadow logic. Lean on surface lightness, not heavy shadows, for elevation.
- **Don't use pure black** (`#000`) for bg or pure white for text — use near-values (`--n-900` / `--n-50`) to cut eye strain and halation.
- **Desaturate/lighten brand & status colors** — saturated hues vibrate on dark backgrounds. Re-verify all contrast pairs; dark mode is a separate audit.
- Soften or remove shadows; replace with subtle 1px lighter borders.

## 5. Contrast — verify, don't guess
- **WCAG AA:** body/normal text ≥ **4.5:1**; large text (≥24px, or ≥19px bold) and meaningful UI/icon edges ≥ **3:1**. AAA body = 7:1.
- The ratio is `(L1+0.05)/(L2+0.05)` on relative luminance — compute it; don't eyeball.
- **Muted text is the usual failure.** A "gray-500 on white" secondary text often lands ~4:1 and fails — bump to 600/700.
- Check **text on primary buttons**, on gradients (against the lightest stop), placeholder text, and disabled states (disabled is exempt from AA but should still be legible).
- Don't encode meaning in color alone (color-blind users): pair status color with an icon or text.
- Quick contrast anchors on white bg: `#767676`≈4.5:1, `#595959`≈7:1, `#949494`≈3:1.
