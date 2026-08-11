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
