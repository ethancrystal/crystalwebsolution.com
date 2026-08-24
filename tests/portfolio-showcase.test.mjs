import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('homepage Motion beat exposes the approved Portfolio showcase structure', async () => {
  const source = await readFile('components/sections/Motion.jsx', 'utf8');

  assert.match(source, /className="section portfolio"/);
  assert.match(source, /id="portfolio"/);
  assert.match(source, /aria-labelledby="portfolio-title"/);
  assert.match(source, /id="portfolio-title"/);
  assert.match(source, />Selected work<|>Portfolio<|>Our work</i);
  assert.match(source, /project\.summary/);
  assert.match(source, /View case study/);
});

test('portfolio beat stays synchronized with camera and measured scroll data', async () => {
  const beatProgress = await readFile('lib/beatProgress.js', 'utf8');
  const journey = await readFile('lib/journey.js', 'utf8');
  const cameraRig = await readFile('components/three/CameraRig.jsx', 'utf8');

  assert.match(beatProgress, /'portfolio'/);
  assert.match(journey, /CLUSTERS\.portfolio/);
  assert.match(cameraRig, /BEAT_IDS\.indexOf\('portfolio'\)/);
});

test('reusable carousel scene code resolves the renamed Portfolio camera cluster', async () => {
  const source = await readFile('components/three/FlyingCarousel.jsx', 'utf8');

  assert.match(source, /CLUSTERS\.portfolio/);
  assert.doesNotMatch(source, /CLUSTERS\.motion/);
});

test('portfolio links remain backed by the canonical project data and case-study routes', async () => {
  const source = await readFile('components/sections/Motion.jsx', 'utf8');

  assert.match(source, /PROJECTS\.map/);
  assert.match(source, /href=\{`\/work\/\$\{project\.slug\}`\}/);
  assert.match(source, /aria-label=\{`\$\{project\.title\} — view case study`\}/);
});
