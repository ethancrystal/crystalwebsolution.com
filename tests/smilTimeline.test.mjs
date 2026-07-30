import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampProgress,
  blastVector,
  progressToSmilTime,
  motionStageAt,
  workStageAt,
} from '../lib/smilTimeline.mjs';

test('clampProgress keeps scroll progress inside the SMIL timeline', () => {
  assert.equal(clampProgress(-0.2), 0);
  assert.equal(clampProgress(0.45), 0.45);
  assert.equal(clampProgress(1.4), 1);
});

test('blastVector displaces only glyphs inside the interaction radius', () => {
  assert.deepEqual(blastVector({ x: 0, y: 0 }, { x: 300, y: 0 }, 220), {
    active: false,
    x: 0,
    y: 0,
    strength: 0,
  });

  const vector = blastVector({ x: 0, y: 0 }, { x: 110, y: 0 }, 220);
  assert.equal(vector.active, true);
  assert.equal(vector.strength, 0.5);
  assert.equal(vector.x, 18);
  assert.equal(vector.y, 0);
});

test('progressToSmilTime maps reversible scroll progress to seconds', () => {
  assert.equal(progressToSmilTime(0, 12), 0);
  assert.equal(progressToSmilTime(0.5, 12), 6);
  assert.equal(progressToSmilTime(1, 12), 12);
  assert.equal(progressToSmilTime(0.25, 0), 0);
});

test('workStageAt follows the building, rail and curtain sequence', () => {
  assert.equal(workStageAt(0.08), 'building');
  assert.equal(workStageAt(0.4), 'rail');
  assert.equal(workStageAt(0.86), 'curtain');
  assert.equal(workStageAt(0.98), 'services');
});

test('motionStageAt follows the recorded hold, ribbon, detach and grid states', () => {
  assert.equal(motionStageAt(0.05), 'hold');
  assert.equal(motionStageAt(0.35), 'ribbon');
  assert.equal(motionStageAt(0.66), 'detach');
  assert.equal(motionStageAt(0.95), 'grid');
});
