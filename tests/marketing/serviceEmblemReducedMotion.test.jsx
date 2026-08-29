import { readFile } from 'node:fs/promises';

describe('ServiceEmblem3D reduced-motion handling', () => {
  it('does not call matchMedia inside the useFrame callback', async () => {
    const source = await readFile('components/three/ServiceEmblem3D.jsx', 'utf8');
    const useFrameMatch = source.match(/useFrame\(\(state, delta\) => \{([\s\S]*?)\n  \}\);/);
    expect(useFrameMatch).not.toBeNull();
    expect(useFrameMatch[1]).not.toMatch(/matchMedia/);
  });

  it('reads matchMedia once in a useEffect and caches it in a ref with a change listener', async () => {
    const source = await readFile('components/three/ServiceEmblem3D.jsx', 'utf8');
    expect(source).toMatch(/useEffect\(\(\) => \{[\s\S]*?matchMedia\('\(prefers-reduced-motion: reduce\)'\)[\s\S]*?addEventListener\('change'/);
  });

  it('gates the glow/emissive animation on the same reduced-motion flag as rotation', async () => {
    const source = await readFile('components/three/ServiceEmblem3D.jsx', 'utf8');
    const useFrameMatch = source.match(/useFrame\(\(state, delta\) => \{([\s\S]*?)\n  \}\);/);
    const body = useFrameMatch[1];
    const glowIndex = body.indexOf('glow.current +=');
    const reduceGuardBeforeGlow = body.slice(0, glowIndex).lastIndexOf('if (reduce) return');
    expect(reduceGuardBeforeGlow).toBeGreaterThan(-1);
  });
});

describe('ServiceEmblem (SVG variant) reduced-motion handling', () => {
  // The SVG variant's SMIL <animate>/<animateTransform>/<animateMotion>
  // elements run outside CSS, so globals.css's prefers-reduced-motion media
  // query can't reach them - they must be stripped from the render tree
  // itself, same as ServiceEmblem3D gates its useFrame tween above. This
  // guards against that gap regressing silently.
  it('reads matchMedia once in a useEffect and keeps it current via a change listener with teardown', async () => {
    const source = await readFile('components/marketing/ServiceEmblem.jsx', 'utf8');
    expect(source).toMatch(/useEffect\(\(\) => \{[\s\S]*?matchMedia\('\(prefers-reduced-motion: reduce\)'\)[\s\S]*?addEventListener\('change'[\s\S]*?return \(\) => [\s\S]*?removeEventListener\('change'/);
  });

  it("computes SvgMark's shouldAnimate from both the animate prop and the reduced-motion flag", async () => {
    const source = await readFile('components/marketing/ServiceEmblem.jsx', 'utf8');
    const svgMarkMatch = source.match(/function SvgMark\(\{ signal, animate \}\) \{([\s\S]*?)\n\}/);
    expect(svgMarkMatch).not.toBeNull();
    const body = svgMarkMatch[1];
    expect(body).toMatch(/const reducedMotion = useReducedMotion\(\);/);
    expect(body).toMatch(/const shouldAnimate = animate && !reducedMotion;/);
    expect(body).toMatch(/stripAnimations\(glyph\)/);
  });
});
