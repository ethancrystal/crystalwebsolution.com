// Content + procedural icon geometry for the "CWS In Motion" services beat,
// ported 1:1 from the Claude Design prototype (CWS In Motion.dc.html).
// Every shape's l/t/w/h is a percentage of the card's art region — the same
// numbers the prototype used for its absolutely-positioned CSS divs — so
// CardShape (components/sections/Lab.jsx) can convert them straight to SVG
// rect/ellipse geometry without re-deriving the composition.
export const IN_MOTION_CARDS = [
  {
    id: 'web-design',
    title: 'WEB DESIGN',
    sub: 'Interfaces with intent',
    color: '#ff5b35',
    shapes: [
      { l: 55, t: 12, w: 36, h: 70, rad: 6, bg: 'rgba(244,243,239,0.95)', bd: '#0b0d0b', bdw: 2, rot: 0, op: 1 },
      { l: 55, t: 12, w: 36, h: 14, rad: 6, bg: '#0b0d0b', rot: 0, op: 1 },
      { l: 58, t: 32, w: 10, h: 44, rad: 2, bg: 'rgba(11,13,11,0.85)', rot: 0, op: 1 },
      { l: 71, t: 32, w: 17, h: 10, rad: 2, bg: 'rgba(11,13,11,0.7)', rot: 0, op: 1 },
      { l: 71, t: 48, w: 13, h: 10, rad: 2, bg: 'rgba(11,13,11,0.4)', rot: 0, op: 1 },
      { l: 71, t: 64, w: 15, h: 10, rad: 2, bg: 'rgba(11,13,11,0.55)', rot: 0, op: 1 },
    ],
  },
  {
    id: 'web-development',
    title: 'WEB DEVELOPMENT',
    sub: 'Next.js builds that ship',
    color: '#b9ff42',
    shapes: [
      { l: 54, t: 10, w: 38, h: 74, rad: 6, bg: '#0b0d0b', rot: 0, op: 1 },
      { l: 58, t: 22, w: 18, h: 7, rad: 2, bg: '#b9ff42', rot: 0, op: 1 },
      { l: 58, t: 36, w: 28, h: 7, rad: 2, bg: 'rgba(244,243,239,0.85)', rot: 0, op: 1 },
      { l: 62, t: 50, w: 16, h: 7, rad: 2, bg: 'rgba(244,243,239,0.5)', rot: 0, op: 1 },
      { l: 62, t: 64, w: 22, h: 7, rad: 2, bg: '#59f3ff', rot: 0, op: 1 },
    ],
  },
  {
    id: 'app-design',
    title: 'APP DESIGN',
    sub: 'Mobile-first product UX',
    color: '#ff8dd1',
    shapes: [
      { l: 64, t: 6, w: 19, h: 86, rad: 12, bg: 'rgba(244,243,239,0.95)', bd: '#0b0d0b', bdw: 2.5, rot: 0, op: 1 },
      { l: 70, t: 11, w: 7, h: 5, rad: 3, bg: '#0b0d0b', rot: 0, op: 1 },
      { l: 67, t: 22, w: 13, h: 26, rad: 3, bg: 'rgba(11,13,11,0.85)', rot: 0, op: 1 },
      { l: 67, t: 54, w: 13, h: 9, rad: 2, bg: 'rgba(11,13,11,0.4)', rot: 0, op: 1 },
      { l: 67, t: 68, w: 13, h: 9, rad: 2, bg: 'rgba(11,13,11,0.6)', rot: 0, op: 1 },
    ],
  },
  {
    id: 'app-development',
    title: 'APP DEVELOPMENT',
    sub: 'iOS · Android · PWA',
    color: '#63d9ff',
    shapes: [
      { l: 55, t: 12, w: 17, h: 72, rad: 10, bg: 'transparent', bd: 'rgba(11,13,11,0.55)', bdw: 2.5, rot: -8, op: 1 },
      { l: 67, t: 8, w: 18, h: 80, rad: 10, bg: '#0b0d0b', rot: 7, op: 1 },
      { l: 70, t: 18, w: 12, h: 56, rad: 4, bg: 'rgba(99,217,255,0.9)', rot: 7, op: 1 },
    ],
  },
  {
    id: 'branding-logo',
    title: 'BRANDING & LOGO',
    sub: 'Identity systems',
    color: '#c084fc',
    shapes: [
      { l: 57, t: 12, w: 22, h: 48, rad: 'circle', bg: 'transparent', bd: '#0b0d0b', bdw: 3, rot: 0, op: 1 },
      { l: 65, t: 30, w: 6, h: 13, rad: 'circle', bg: '#0b0d0b', rot: 0, op: 1 },
      { l: 83, t: 56, w: 8, h: 18, rad: 2, bg: 'transparent', bd: '#0b0d0b', bdw: 2.5, rot: 18, op: 1 },
      { l: 50, t: 66, w: 5, h: 11, rad: 'circle', bg: '#0b0d0b', rot: 0, op: 0.7 },
    ],
  },
  {
    id: 'animation',
    title: 'ANIMATION',
    sub: 'Scroll-linked motion',
    color: '#ffc64a',
    shapes: [
      { l: 52, t: 47, w: 42, h: 3, rad: 2, bg: '#0b0d0b', rot: 0, op: 1 },
      { l: 56, t: 40, w: 5, h: 12, rad: 1, bg: '#0b0d0b', rot: 45, op: 1 },
      { l: 70, t: 40, w: 5, h: 12, rad: 1, bg: '#f4f3ef', bd: '#0b0d0b', bdw: 2, rot: 45, op: 1 },
      { l: 84, t: 40, w: 5, h: 12, rad: 1, bg: '#0b0d0b', rot: 45, op: 1 },
      { l: 72.5, t: 22, w: 0.8, h: 50, rad: 0, bg: '#3c6cff', rot: 0, op: 1 },
    ],
  },
  {
    id: 'workflow-automation',
    title: 'WORKFLOW AUTOMATION',
    sub: 'Connected systems',
    color: '#59f3ff',
    shapes: [
      { l: 56, t: 36, w: 15, h: 2.5, rad: 2, bg: '#0b0d0b', rot: 16, op: 1 },
      { l: 72, t: 40, w: 15, h: 2.5, rad: 2, bg: '#0b0d0b', rot: -18, op: 1 },
      { l: 50, t: 22, w: 9, h: 20, rad: 'circle', bg: '#f4f3ef', bd: '#0b0d0b', bdw: 2.5, rot: 0, op: 1 },
      { l: 66, t: 42, w: 9, h: 20, rad: 'circle', bg: '#f4f3ef', bd: '#0b0d0b', bdw: 2.5, rot: 0, op: 1 },
      { l: 82, t: 20, w: 9, h: 20, rad: 'circle', bg: '#0b0d0b', rot: 0, op: 1 },
    ],
  },
  {
    id: 'ai-automation',
    title: 'AI AUTOMATION',
    sub: 'Agents that do the work',
    color: '#9678ff',
    shapes: [
      { l: 60, t: 30, w: 3, h: 20, rad: 1, bg: 'rgba(11,13,11,0.8)', rot: 38, op: 1 },
      { l: 74, t: 26, w: 3, h: 22, rad: 1, bg: 'rgba(11,13,11,0.8)', rot: -35, op: 1 },
      { l: 63, t: 52, w: 14, h: 2.5, rad: 1, bg: 'rgba(11,13,11,0.8)', rot: 12, op: 1 },
      { l: 68, t: 36, w: 10, h: 22, rad: 'circle', bg: '#0b0d0b', rot: 0, op: 1 },
      { l: 55, t: 16, w: 5, h: 11, rad: 'circle', bg: '#0b0d0b', rot: 0, op: 0.8 },
      { l: 84, t: 14, w: 5, h: 11, rad: 'circle', bg: '#0b0d0b', rot: 0, op: 0.8 },
      { l: 58, t: 64, w: 5, h: 11, rad: 'circle', bg: '#0b0d0b', rot: 0, op: 0.8 },
      { l: 84, t: 60, w: 5, h: 11, rad: 'circle', bg: '#0b0d0b', rot: 0, op: 0.8 },
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
