// Content + procedural icon geometry for the Capabilities beat (Lab.jsx).
// The card frame, palette, curve and shape vocabulary are ported 1:1 from the
// Claude Design prototype (CWS In Motion.dc.html); since v1.126 the eight
// cards name the production services (owner request 2026-10-19), and each
// tagline restates a claim the homepage already makes (lib/heritage.mjs).
// Every shape's l/t/w/h is a percentage of the card's art region (304x138),
// so CardShape (components/sections/Lab.jsx) converts them straight to SVG
// rect/ellipse geometry. A round shape keeps w ≈ 0.455 × h for that aspect.
const INK = '#0b0d0b';
const PAPER = 'rgba(244,243,239,0.95)';

export const IN_MOTION_CARDS = [
  {
    id: 'embroidery-digitizing',
    title: 'EMBROIDERY DIGITIZING',
    sub: 'Stitch files, sewn out',
    color: '#ff5b35',
    shapes: [
      // Hoop with its clamp, a run of stitches and the needle.
      { l: 58, t: 10, w: 34, h: 74, rad: 'circle', bg: PAPER, bd: INK, bdw: 3, rot: 0, op: 1 },
      { l: 61, t: 16.5, w: 28, h: 61, rad: 'circle', bg: 'transparent', bd: INK, bdw: 1.5, rot: 0, op: 0.45 },
      { l: 73, t: 3, w: 4, h: 9, rad: 1, bg: INK, rot: 0, op: 1 },
      { l: 64, t: 56, w: 4, h: 3, rad: 1, bg: INK, rot: -24, op: 1 },
      { l: 69, t: 50, w: 4, h: 3, rad: 1, bg: INK, rot: -24, op: 1 },
      { l: 74, t: 44, w: 4, h: 3, rad: 1, bg: INK, rot: -24, op: 1 },
      { l: 79, t: 38, w: 4, h: 3, rad: 1, bg: INK, rot: -24, op: 1 },
      { l: 86, t: 6, w: 1.6, h: 40, rad: 1, bg: INK, rot: 28, op: 1 },
    ],
  },
  {
    id: 'vector-artwork',
    title: 'VECTOR ARTWORK',
    sub: 'Clean, separated files',
    color: '#b9ff42',
    shapes: [
      // A pen-tool anchor with both handles, plus a second selected node.
      { l: 56, t: 30, w: 34, h: 2, rad: 1, bg: INK, rot: -18, op: 1 },
      { l: 54.5, t: 37.6, w: 4.5, h: 10, rad: 'circle', bg: INK, rot: 0, op: 1 },
      { l: 87, t: 14.4, w: 4.5, h: 10, rad: 'circle', bg: INK, rot: 0, op: 1 },
      { l: 70, t: 24.5, w: 6, h: 13, rad: 1, bg: '#f4f3ef', bd: INK, bdw: 2.5, rot: 0, op: 1 },
      { l: 80, t: 62, w: 6, h: 13, rad: 1, bg: INK, rot: 0, op: 1 },
    ],
  },
  {
    id: 'embroidered-patches',
    title: 'EMBROIDERED PATCHES',
    sub: 'Clean, even borders',
    color: '#ff8dd1',
    shapes: [
      // Merrowed border, twill face, stitched ring and the emblem.
      { l: 58, t: 8, w: 36, h: 80, rad: 'circle', bg: INK, rot: 0, op: 1 },
      { l: 61, t: 14.5, w: 30, h: 66, rad: 'circle', bg: PAPER, rot: 0, op: 1 },
      { l: 63.5, t: 20, w: 25, h: 55, rad: 'circle', bg: 'transparent', bd: INK, bdw: 1.2, rot: 0, op: 0.45 },
      { l: 72, t: 38.5, w: 8, h: 18, rad: 1, bg: '#ff8dd1', bd: INK, bdw: 2, rot: 45, op: 1 },
    ],
  },
  {
    id: 'chenille-patches',
    title: 'CHENILLE PATCHES',
    sub: 'Texture & clean edge',
    color: '#63d9ff',
    shapes: [
      // Felt backing, the chenille field and its looped-yarn texture.
      { l: 60, t: 8, w: 30, h: 80, rad: 14, bg: PAPER, bd: INK, bdw: 2.5, rot: -4, op: 1 },
      { l: 64, t: 18, w: 22, h: 60, rad: 10, bg: INK, rot: -4, op: 1 },
      { l: 68, t: 26, w: 3, h: 6.6, rad: 'circle', bg: 'rgba(99,217,255,0.85)', rot: 0, op: 1 },
      { l: 77, t: 24, w: 3, h: 6.6, rad: 'circle', bg: 'rgba(99,217,255,0.85)', rot: 0, op: 1 },
      { l: 72.5, t: 38, w: 3, h: 6.6, rad: 'circle', bg: 'rgba(99,217,255,0.85)', rot: 0, op: 1 },
      { l: 80, t: 40, w: 3, h: 6.6, rad: 'circle', bg: 'rgba(99,217,255,0.85)', rot: 0, op: 1 },
      { l: 68, t: 54, w: 3, h: 6.6, rad: 'circle', bg: 'rgba(99,217,255,0.85)', rot: 0, op: 1 },
      { l: 76, t: 58, w: 3, h: 6.6, rad: 'circle', bg: 'rgba(99,217,255,0.85)', rot: 0, op: 1 },
    ],
  },
  {
    id: 'pvc-patches',
    title: 'PVC PATCHES',
    sub: 'Sharp colour separation',
    color: '#c084fc',
    shapes: [
      // Moulded base, a raised colour layer, the top dome and its highlight.
      { l: 58, t: 14, w: 34, h: 72, rad: 16, bg: INK, rot: 0, op: 1 },
      { l: 61, t: 20, w: 28, h: 56, rad: 12, bg: '#c084fc', bd: INK, bdw: 2, rot: 0, op: 1 },
      { l: 67, t: 29, w: 16, h: 36, rad: 'circle', bg: PAPER, bd: INK, bdw: 2, rot: 0, op: 1 },
      { l: 70, t: 35, w: 4, h: 9, rad: 'circle', bg: INK, rot: 0, op: 0.8 },
    ],
  },
  {
    id: 'woven-patches',
    title: 'WOVEN PATCHES',
    sub: 'Fine detail, flat weave',
    color: '#ffc64a',
    shapes: [
      // Woven face with weft lines and the woven-in emblem.
      { l: 58, t: 12, w: 34, h: 74, rad: 4, bg: PAPER, bd: INK, bdw: 2.5, rot: 0, op: 1 },
      { l: 61, t: 22, w: 28, h: 2, rad: 1, bg: INK, rot: 0, op: 0.55 },
      { l: 61, t: 32, w: 28, h: 2, rad: 1, bg: INK, rot: 0, op: 0.3 },
      { l: 61, t: 42, w: 28, h: 2, rad: 1, bg: INK, rot: 0, op: 0.55 },
      { l: 61, t: 52, w: 28, h: 2, rad: 1, bg: INK, rot: 0, op: 0.3 },
      { l: 61, t: 62, w: 28, h: 2, rad: 1, bg: INK, rot: 0, op: 0.55 },
      { l: 61, t: 72, w: 28, h: 2, rad: 1, bg: INK, rot: 0, op: 0.3 },
      { l: 72, t: 39, w: 6, h: 13, rad: 1, bg: '#ffc64a', bd: INK, bdw: 2, rot: 45, op: 1 },
    ],
  },
  {
    id: 'leather-patches',
    title: 'LEATHER PATCHES',
    sub: 'Debossed detail',
    color: '#59f3ff',
    shapes: [
      // Leather blank, the deboss outline and mark, and four corner rivets.
      { l: 56, t: 16, w: 38, h: 66, rad: 10, bg: '#8a5a3b', bd: INK, bdw: 2, rot: 0, op: 1 },
      { l: 60, t: 26, w: 30, h: 46, rad: 6, bg: 'transparent', bd: 'rgba(244,243,239,0.55)', bdw: 1.5, rot: 0, op: 1 },
      { l: 70, t: 38, w: 10, h: 22, rad: 'circle', bg: '#5e3b25', rot: 0, op: 1 },
      { l: 58.5, t: 19.5, w: 2.4, h: 5.3, rad: 'circle', bg: 'rgba(244,243,239,0.8)', rot: 0, op: 1 },
      { l: 89.1, t: 19.5, w: 2.4, h: 5.3, rad: 'circle', bg: 'rgba(244,243,239,0.8)', rot: 0, op: 1 },
      { l: 58.5, t: 73.2, w: 2.4, h: 5.3, rad: 'circle', bg: 'rgba(244,243,239,0.8)', rot: 0, op: 1 },
      { l: 89.1, t: 73.2, w: 2.4, h: 5.3, rad: 'circle', bg: 'rgba(244,243,239,0.8)', rot: 0, op: 1 },
    ],
  },
  {
    id: 'stickers',
    title: 'STICKERS',
    sub: 'Clean cut lines & colour',
    color: '#9678ff',
    shapes: [
      // Die-cut sticker: backing, printed face, a mark and the lifted corner.
      { l: 58, t: 10, w: 34, h: 76, rad: 'circle', bg: PAPER, bd: INK, bdw: 2.5, rot: 0, op: 1 },
      { l: 61.5, t: 17.5, w: 27, h: 61, rad: 'circle', bg: '#9678ff', bd: INK, bdw: 1.5, rot: 0, op: 1 },
      { l: 72, t: 41.5, w: 6, h: 13, rad: 1, bg: INK, rot: 45, op: 1 },
      { l: 84, t: 62, w: 9, h: 20, rad: 3, bg: '#f4f3ef', bd: INK, bdw: 2, rot: 40, op: 1 },
    ],
  },
];

export function inMotionColorSoft(color) {
  return `color-mix(in srgb, ${color} 42%, #ffffff)`;
}

// Matches the prototype's `curve` formula exactly, drawn in the same
// 296×132 coordinate space it authored the path in.
export function inMotionCurve(index) {
  return `M 28 ${112 - index * 4} C 92 ${30 + index * 7}, 190 ${140 - index * 6}, 268 ${30 + index * 5}`;
}
