import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getMotionRailState } from '../lib/motionLayout.mjs';

test('motion rail exposes a stable readable index and progress state', () => {
  assert.deepEqual(
    getMotionRailState({ index: 1, count: 6 }),
    {
      index: 1,
      count: 6,
      indexLabel: '02',
      countLabel: '06',
      progressLabel: '02 / 06',
      isFirst: false,
      isLast: false,
    },
  );
});

test('SectionHandoff has a positioned mask and content layering contract', () => {
  const css = fs.readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /\.section-handoff\s*\{[\s\S]*?position:\s*relative/);
  assert.match(css, /\.section-handoff__mask\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(css, /\.section-handoff__content\s*\{[\s\S]*?position:\s*relative/);
});

test('Motion progress communicates a truthful total instead of a static active index', () => {
  const source = fs.readFileSync(new URL('../components/sections/Motion.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /<span aria-hidden="true">\{RAIL_STATE\.indexLabel\}<\/span>/);
  assert.match(source, /\{RAIL_STATE\.countLabel\} records/);
});

test('homepage composes Motion through the existing SectionHandoff primitive', () => {
  const source = fs.readFileSync(new URL('../components/Experience.jsx', import.meta.url), 'utf8');
  assert.match(source, /<SectionHandoff from="left" tone="violet" label="motion"><Motion \/><\/SectionHandoff>/);
});

test('homepage gives the process, lab, and contact beats explicit handoff ownership', () => {
  const source = fs.readFileSync(new URL('../components/Experience.jsx', import.meta.url), 'utf8');
  assert.match(source, /<SectionHandoff from="right" tone="ink" label="approach"><Approach \/><\/SectionHandoff>/);
  assert.match(source, /<SectionHandoff from="left" tone="cyan" label="lab"><Lab \/><\/SectionHandoff>/);
  assert.match(source, /<SectionHandoff from="bottom" tone="ink" label="contact"><Contact \/><\/SectionHandoff>/);
});

test('motion rail clamps invalid positions to the available project range', () => {
  assert.deepEqual(getMotionRailState({ index: -4, count: 0 }), {
    index: 0,
    count: 0,
    indexLabel: '00',
    countLabel: '00',
    progressLabel: '00 / 00',
    isFirst: true,
    isLast: true,
  });
});
