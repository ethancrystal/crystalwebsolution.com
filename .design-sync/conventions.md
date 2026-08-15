# Crystal Web Solution — how to build with this system

A dark, cinematic agency site. Plain JSX and **global CSS** — there is no
Tailwind, no CSS-in-JS, no theme provider, and no utility-class vocabulary.
Style with the real class names and CSS custom properties below.

## Setup: no provider, but mind the two runtime families

Most components need **no wrapper at all** — import and render. Two families
are different, and getting this wrong is the main failure mode:

- **`three/` (13 components)** — `Crystal`, `Particles`, `CameraRig`,
  `Lights`, `Effects`, `Sparks`, `ServiceRail`, `ApproachCompass`,
  `BackdropMorph`, `FocusDimmer`, `FlyingCarousel`, `ServiceEmblem3D`,
  `CanvasFeatureBoundary`. These are react-three-fiber scene actors and
  **throw `R3F: Hooks can only be used within the Canvas component!`** if
  rendered as ordinary DOM. They must sit inside an R3F `<Canvas>`, and they
  are authored for one shared scene — not standalone widgets.
- **`sections/` (9 components)** — `Hero`, `About`, `Services`, `Approach`,
  `Stories`, `Mark`, `Lab`, `Motion`, `Contact`. Full-page scroll beats, not
  reusable blocks. They read per-frame values from module singletons that
  only `SmoothScroll` populates, so without it they render but stay static.

`general/` (19) and `marketing/` (25) are the reusable DOM parts — use these
for ordinary layout work.

## Styling idiom: global classes + `var(--token)`

Set colour and type through the custom properties, not literals:

| Token | Use |
|---|---|
| `--bg` `--ink` `--muted` | page ground, primary text, secondary text |
| `--cyan` `--blue` `--violet` | the accent ramp (cyan → blue → violet) |
| `--accent-grad` | the prebuilt gradient for accent headlines |
| `--line` `--plate` `--plate-centered` | hairline rules, panel/plate surfaces |
| `--font-display` `--font-body` `--font-mono` | Space Grotesk / Inter / Space Mono |
| `--rail-accent` `--text-lift` | rail highlight, text raise offset |

Real classes to compose with (all present in the shipped CSS):
`.section`, `.text-plate`, `.eyebrow`, `.btn` with `.btn-solid` / `.btn-ghost`,
`.mkt-section` (`.mkt-section--alt` for the alternate plate), and the
component-owned `.reveal`, `.decode`, `.roll`, `.magnetic`, `.scene-canvas`.
Invent new class names only for your own layout glue — never restyle these.

## Where the truth lives

Read before styling: **`styles.css`** and its import closure —
`fonts/fonts.css` (the 16 shipped Space Grotesk / Inter / Space Mono faces)
and `_ds_bundle.css` (every component style plus the token definitions on
`:root`). Per-component API and usage: `<Name>.d.ts` and `<Name>.prompt.md`.

Props are documented in each `.prompt.md`, not in types: the source is plain
JSX with no annotations, so the emitted `<Name>Props` interfaces are
permissive stubs. Trust the `.prompt.md` and the preview card over the type.

## One idiomatic build

```jsx
import { ContentSection, Magnetic, RollText } from 'crystal-web-solution';

<section className="section">
  <ContentSection eyebrow="How we work" title="Design that survives the build">
    <p style={{ color: 'var(--muted)' }}>
      We prototype the motion in the browser, so what you approve is what ships.
    </p>
    <Magnetic>
      <a href="/contact" className="btn btn-solid">
        <RollText>Start a project</RollText> <span className="btn-arrow">→</span>
      </a>
    </Magnetic>
  </ContentSection>
</section>
```

**`ImageBlock` needs an explicit size.** Its image and placeholder are both
absolutely positioned, so pass a `className` that gives the figure width and
`aspect-ratio` or it collapses to nothing.
