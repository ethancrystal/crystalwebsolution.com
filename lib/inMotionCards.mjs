// Content for the "Selected work" beat. Each card uses a real project image
// supplied by CD Sportswear USA, while the shared Lab choreography still
// controls its position, scale, opacity, and interaction state.
export const IN_MOTION_CARDS = [
  {
    id: 'izanami-live',
    title: 'IZANAMI',
    sub: 'Web experience',
    image: '/projects/cws-live-izanami.webp',
    color: '#c084fc',
    shapes: [],
  },
  {
    id: 'oimachi-live',
    title: 'OIMACHI',
    sub: 'Brand and digital',
    image: '/projects/cws-live-oimachi.webp',
    color: '#59f3ff',
    shapes: [],
  },
  {
    id: 'ciao-energy-live',
    title: 'CIAO ENERGY',
    sub: 'Product launch',
    image: '/projects/cws-live-ciao-energy.webp',
    color: '#3c6cff',
    shapes: [],
  },
  {
    id: 'inspiring-live',
    title: 'INSPIRING',
    sub: 'Editorial platform',
    image: '/projects/cws-live-inspiring.webp',
    color: '#59f3ff',
    shapes: [],
  },
  {
    id: 'innovation-studio',
    title: 'INNOVATION STUDIO',
    sub: 'Digital systems',
    image: '/projects/cws-innovation-studio.webp',
    color: '#ff8dd1',
    shapes: [],
  },
  {
    id: 'izanami-case-study',
    title: 'IZANAMI / CASE STUDY',
    sub: 'Selected work',
    image: '/projects/cws-izanami.webp',
    color: '#c084fc',
    shapes: [],
  },
];

export function inMotionColorSoft(color) {
  return `color-mix(in srgb, ${color} 42%, #ffffff)`;
}

// Kept for compatibility with the Lab card-art contract and any existing
// callers. Project cards no longer need procedural shape geometry.
export function inMotionCurve(index) {
  return `M 28 ${112 - index * 4} C 92 ${30 + index * 7}, 190 ${140 - index * 6}, 268 ${30 + index * 5}`;
}
