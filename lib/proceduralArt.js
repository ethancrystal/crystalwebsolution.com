// Procedural SVG art as data URIs, generated from a project's palette.
// Keeps the "no decorative binary media" convention: every card image in the
// stream/carousel sections is built here from two hex colors, deterministically
// seeded so the same slug always renders the same composition.

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Small deterministic PRNG (mulberry32) so shapes differ per seed but never
// change between renders or builds.
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a 3:4 portrait gradient composition from a two-color palette.
 * Returns a `data:image/svg+xml` URI usable as an <img src>.
 */
export function paletteArt([from, to], seed = 'cws') {
  const rand = rng(hashSeed(seed));
  const angle = Math.round(rand() * 360);
  // Two floating translucent orbs give each card its own composition.
  const orbs = Array.from({ length: 3 }, () => ({
    cx: Math.round(rand() * 100),
    cy: Math.round(rand() * 133),
    r: Math.round(18 + rand() * 30),
    o: (0.14 + rand() * 0.2).toFixed(2),
  }));
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 133'>` +
    `<defs><linearGradient id='g' gradientTransform='rotate(${angle} .5 .5)'>` +
    `<stop offset='0' stop-color='${from}'/><stop offset='1' stop-color='${to}'/>` +
    `</linearGradient></defs>` +
    `<rect width='100' height='133' fill='#04060c'/>` +
    `<rect width='100' height='133' fill='url(#g)' opacity='0.85'/>` +
    orbs
      .map(
        (o) =>
          `<circle cx='${o.cx}' cy='${o.cy}' r='${o.r}' fill='#eaf2ff' opacity='${o.o}'/>`,
      )
      .join('') +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
