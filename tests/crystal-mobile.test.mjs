import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const crystalSource = readFileSync(
  new URL('../components/three/Crystal.jsx', import.meta.url),
  'utf8',
);
const sceneSource = readFileSync(
  new URL('../components/Scene.jsx', import.meta.url),
  'utf8',
);

test('hero crystal receives render quality and exposes a lightweight mobile path', () => {
  assert.match(sceneSource, /<Crystal[\s\S]*quality=\{quality\}/);
  assert.match(crystalSource, /quality/);
  assert.match(crystalSource, /quality\.tier === 'high' \? vertexShader : mobileVertexShader/);
  assert.match(crystalSource, /quality\.tier === 'high' \? fragmentShader : mobileFragmentShader/);
  assert.match(crystalSource, /icosahedronGeometry args=\{\[1\.4, quality\.tier === 'high' \? 3 : quality\.tier === 'balanced' \? 2 : 1\]\}/);
});

test('mobile crystal path avoids the full multi-light shader loop', () => {
  assert.match(crystalSource, /mobileFragmentShader/);
  assert.match(crystalSource, /lightPositionB/);
  assert.match(crystalSource, /lightPositionC/);
  assert.match(crystalSource, /quality\.animate/);
});
