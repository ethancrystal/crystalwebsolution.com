# Trionn Reference Capture and Measurement Workflow

This directory converts the visual-parity requirement into measurable evidence.

## Required source material

Before a v2 scene is implemented, capture the observable reference at these viewports:

| ID | Width | Height |
|---|---:|---:|
| desktop-primary | 1440 | 900 |
| desktop-wide | 1920 | 1080 |
| tablet | 1024 | 768 |
| mobile-primary | 390 | 844 |
| mobile-small | 375 | 667 |

For every scene and viewport, record stable frames at normalized progress values `0`, `0.25`, `0.5`, `0.75`, and `1`.

## Files

- `measurement-sheet.csv` contains all 275 required viewport, scene, and progress combinations.
- `asset-manifest.csv` records every video, poster, and licensed media source.

## Measurement procedure

1. Record a continuous reference scroll at the exact viewport.
2. Identify the scene's start, stable state, interaction state, and exit.
3. Capture the five normalized progress frames.
4. Record section geometry, grid values, heading and media rectangles, trigger boundaries, pin distance, duration, stagger, and ease.
5. Add the screenshot or recording path to `source_file`.
6. Use overlays to compare the implementation at the same scroll state.

## Acceptance rules

- No scene may be called reference-matched until all required measurement rows for its target viewport are complete.
- Major geometry must be within 4 CSS pixels of the approved desktop overlay.
- Layout-only comparison zones must remain below a 2% mean image-difference threshold.
- Motion direction, order, duration, stagger, and easing must be verified separately from static layout.
- A visual difference caused by original Crystal content is acceptable only when the layout anchor and behavior remain equivalent.

## Content and licensing rules

- Do not copy Trionn source code, copywriting, logos, project media, or proprietary assets.
- Do not insert generated or unverified client logos.
- Do not publish invented metrics, awards, ratings, project outcomes, client counts, or hours saved.
- Every non-original media item must include a license source in `asset-manifest.csv`.

## Media loading verification

For each motion asset, confirm:

- Desktop WebM exists.
- Desktop MP4 fallback exists.
- Mobile MP4 exists.
- Poster exists.
- Dimensions, duration, and byte sizes are recorded.
- Decorative video does not autoplay in reduced-motion mode.
- Off-screen video is paused and does not remain mounted unnecessarily.
