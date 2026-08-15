// Authored preview — ImageBlock.
//
// Two things this component requires, both of which the propless floor card
// hid, and both of which a design agent MUST know:
//
// 1. It needs an explicit size. ImageBlock.module.css positions BOTH the
//    image and the placeholder `position:absolute` inside a bare
//    `display:inline-block` figure, so with no width/height from the
//    consumer the figure collapses to zero and paints nothing. Nothing in
//    globals.css sizes it, and the component has no production usage to copy
//    a convention from (it appears only in tests), so the sizing below is the
//    contract: pass a className that gives it dimensions.
//
// 2. `src` must be an inline data URI here. The <img> starts at opacity 0 and
//    only fades in from its own onLoad handler, so a network URL would still
//    be invisible when the card is screenshotted — and the project is
//    offline-only besides. Sources are generated SVG rather than shipped
//    binaries, per the procedural-first rule for marketing visuals.
import { ImageBlock } from 'crystal-web-solution';

const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">${body}</svg>`,
  )}`;

const PLATE = svg(`
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#59f3ff"/>
      <stop offset="55%" stop-color="#4a6cf7"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="#06070c"/>
  <circle cx="400" cy="250" r="170" fill="url(#g)" opacity="0.85"/>
  <circle cx="400" cy="250" r="170" fill="none" stroke="#bfeaff" stroke-opacity="0.5"/>
`);

// Deliberately low-detail — a blur-up placeholder is upscaled and blurred.
const PLACEHOLDER = svg(`
  <rect width="800" height="500" fill="#0b0f1a"/>
  <circle cx="400" cy="250" r="180" fill="#3b5bdb" opacity="0.7"/>
`);

// The sizing contract from (1), expressed the way a consumer would: a class
// giving the figure real dimensions and an aspect ratio. Injected into <head>
// at module scope rather than rendered as a <style> element inside each cell —
// an in-card <style> contributes its CSS source to the card's textContent,
// which shows up as the rule text in the render check's captured output.
const DEMO_CSS = '.demo-frame{display:block;width:100%;max-width:420px;aspect-ratio:8/5;}';
if (typeof document !== 'undefined' && !document.getElementById('ds-imageblock-demo')) {
  const el = document.createElement('style');
  el.id = 'ds-imageblock-demo';
  el.textContent = DEMO_CSS;
  document.head.appendChild(el);
}

export const Default = () => (
  <ImageBlock className="demo-frame" src={PLATE} alt="Refracting crystal against a dark field" />
);

export const WithBlurUpPlaceholder = () => (
  <ImageBlock
    className="demo-frame"
    src={PLATE}
    placeholder={PLACEHOLDER}
    alt="Refracting crystal, loading behind a blur-up placeholder"
  />
);

export const RequiresExplicitSize = () => (
  <figure style={{ margin: 0, display: 'grid', gap: '.75rem', maxWidth: 420 }}>
    <ImageBlock className="demo-frame" src={PLATE} alt="Case study still" />
    <figcaption style={{ fontSize: '.8rem', opacity: 0.65 }}>
      Give ImageBlock a sized className — its image and placeholder are both
      absolutely positioned, so an unsized figure collapses to nothing.
    </figcaption>
  </figure>
);
