# Ubersuggest export, part 7: PageSpeed and autocomplete

Source: Ubersuggest `pagespeed_audit` and `google_suggestions`, pulled 2026-09-24.

## PageSpeed: cdsportswearinc.com homepage, mobile (lab data)
| Metric | Value | Good threshold |
|---|---|---|
| Largest Contentful Paint | **7.8 s** | ≤ 2.5 s |
| First Contentful Paint | 2.3 s | ≤ 1.8 s |
| Speed Index | **17.6 s** | ≤ 3.4 s |
| Time to Interactive | **46.6 s** | ≤ 3.8 s |
| Total Blocking Time | **22.6 s** | ≤ 200 ms |
| Cumulative Layout Shift | 0 | ≤ 0.1 |

Opportunities: 538 KB of unused JavaScript, a redirect costing 1.1 s (likely apex → www), and 15 KB of unused CSS. The desktop run returned `unknown_error`.

This is lab data from one run, not field Core Web Vitals. Still, a 22.6 s blocking time on mobile is severe and consistent with the full-viewport WebGL scene. It hurts every page's ranking chances on mobile. It's the strongest case for a technical lever in `striking-distance`: code-split or defer the Three.js stage on mobile, and link internally to `https://www.` so the redirect never runs.

## Autocomplete (US)
- **web design northern virginia →** web design agency northern virginia · web design companies in northern virginia · web design northern va · website design northern virginia
- **web design company virginia →** web design company in virginia · web development company in virginia · web design companies in northern virginia · virginia web designer · questions: how much do web design companies charge · how much web design cost · how much do web designers charge per hour
- **website rfp →** website rfp template · website rfp examples · website rfp 2026 · rfp website redesign 2026 · website redesign rfp · website maintenance rfp · nonprofit website rfp · website rfp technical requirements · questions: what is a website rfp · is an rfp legally binding · what is a website proposal
