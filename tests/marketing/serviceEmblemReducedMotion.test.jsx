import { readFile } from 'node:fs/promises';

// ServiceEmblem3D mirrors ServiceRail.jsx (the homepage 3D rail it visually
// matches) for reduced-motion handling: both read the shared lib/motionScale.js
// singleton per frame rather than maintaining a local matchMedia+ref+listener,
// and both gate only the continuous rotation by motionScale.value -- the
// hover glow/emissive spring is discrete, user-triggered feedback, not
// self-playing decorative motion, so it is intentionally left ungated (same
// as ServiceRail's own hover-heat spring).
describe('ServiceEmblem3D reduced-motion handling', () => {
  it('does not call matchMedia inside the useFrame callback', async () => {
    const source = await readFile('components/three/ServiceEmblem3D.jsx', 'utf8');
    const useFrameMatch = source.match(/useFrame\(\(state, delta\) => \{([\s\S]*?)\n  \}\);/);
    expect(useFrameMatch).not.toBeNull();
    expect(useFrameMatch[1]).not.toMatch(/matchMedia/);
  });

  it('reads the shared lib/motionScale.js singleton instead of a local matchMedia gate', async () => {
    const source = await readFile('components/three/ServiceEmblem3D.jsx', 'utf8');
    expect(source).toMatch(/import \{ motionScale \} from '\.\.\/\.\.\/lib\/motionScale';/);
    expect(source).not.toMatch(/window\.matchMedia\(/);
  });

  it('gates the continuous rotation by motionScale.value, matching ServiceRail.jsx', async () => {
    const source = await readFile('components/three/ServiceEmblem3D.jsx', 'utf8');
    const useFrameMatch = source.match(/useFrame\(\(state, delta\) => \{([\s\S]*?)\n  \}\);/);
    const body = useFrameMatch[1];
    expect(body).toMatch(/rotation\.y \+= delta \* meta\.rotSpeed \* motionScale\.value/);
    expect(body).toMatch(/rotation\.x = Math\.sin\([^)]*\) \* 0\.16 \* motionScale\.value/);
  });
});
