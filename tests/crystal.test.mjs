import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const crystalSource = readFileSync(
  new URL('../components/three/Crystal.jsx', import.meta.url),
  'utf8',
);

test('hero crystal uses a faceted shader with cool blue optical highlights', () => {
  assert.match(crystalSource, /shaderMaterial/);
  assert.match(crystalSource, /icosahedronGeometry/);
  assert.match(crystalSource, /F_Schlick/);
  assert.match(crystalSource, /envGradient/);
  assert.match(crystalSource, /uBlueHighlight/);
  assert.match(crystalSource, /uBlueGlow/);
  assert.doesNotMatch(crystalSource, /MeshTransmissionMaterial/);
});

test('hero crystal keeps its pulse and scroll contracts', () => {
  assert.match(crystalSource, /pulse\.t/);
  assert.match(crystalSource, /scrollState\.velocity/);
  assert.match(crystalSource, /uPulse/);
});
