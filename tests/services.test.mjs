import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { SERVICES } from '../lib/services.mjs';
import { SERVICE_SIGNAL_META } from '../lib/serviceSignals.mjs';

const servicesSource = readFileSync(new URL('../components/sections/Services.jsx', import.meta.url), 'utf8');
const railSource = readFileSync(new URL('../components/three/ServiceRail.jsx', import.meta.url), 'utf8');
const globalsCss = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

const EXPECTED_TITLES = [
  'Web Design',
  'Development',
  'Branding',
  'Logo Design',
  'Digital Marketing',
  'Animation',
  'AI Automation',
  'Workflow Automation',
];

const EXPECTED_SIGNALS = [
  'web',
  'development',
  'brand',
  'logo',
  'marketing',
  'motion',
  'ai',
  'workflow',
];

const BANNED_COPY = /\b(?:leverage|synergy|best-in-class|cutting-edge|full-service|end-to-end|seamless|robust|scalable|elevate|solutions?|s[u]pplied|record|archive|placeholders?)\b/i;

test('service taxonomy contains the exact eight visible offers in order', () => {
  assert.equal(SERVICES.length, 8);
  assert.deepEqual(SERVICES.map((service) => service.title), EXPECTED_TITLES);
  assert.deepEqual(SERVICES.map((service) => service.n), ['01', '02', '03', '04', '05', '06', '07', '08']);
  assert.deepEqual(SERVICES.map((service) => service.signal), EXPECTED_SIGNALS);
  assert.equal(new Set(SERVICES.map((service) => service.signal)).size, SERVICES.length);
});

test('DOM rows and canvas signals share one service taxonomy and eight-step clock', () => {
  assert.match(servicesSource, /import \{ SERVICES \} from '\.\.\/\.\.\/lib\/services\.mjs'/);
  assert.doesNotMatch(servicesSource, /const SERVICES\s*=/);
  assert.match(railSource, /import \{ SERVICES \} from '\.\.\/\.\.\/lib\/services\.mjs'/);
  assert.match(railSource, /import \{ SERVICE_SIGNAL_META \} from '\.\.\/\.\.\/lib\/serviceSignals\.mjs'/);
  assert.match(railSource, /const COUNT = SERVICES\.length/);
  assert.match(railSource, /return SERVICES\.map\(\(\{ signal \}\)/);
});

test('every service signal has rail metadata, and exactly the motion emblem is wireframe', () => {
  SERVICES.forEach((service) => {
    assert.ok(
      SERVICE_SIGNAL_META[service.signal],
      `${service.signal} is missing rail metadata (rotSpeed/zOffset)`
    );
  });

  const wireframeSignals = SERVICES.map((service) => service.signal).filter(
    (signal) => SERVICE_SIGNAL_META[signal].wireframe === true
  );
  assert.deepEqual(
    wireframeSignals,
    ['motion'],
    'only the Animation (motion) emblem should render as wireframe'
  );
});

test('each service uses one visitor-focused PAS sentence', () => {
  SERVICES.forEach((service) => {
    const visitorWords = service.desc.match(/\b(?:you|your)\b/gi)?.length || 0;
    const studioWords = service.desc.match(/\b(?:we|our)\b/gi)?.length || 0;
    const sentenceStops = service.desc.match(/[.!?](?=\s|$)/g)?.length || 0;

    assert.match(service.desc, /^(?:Your|That|If|A|You|When)\b/);
    assert.match(service.desc, /— (?:so )?we\b/i);
    assert.equal(sentenceStops, 1, `${service.title} must stay one sentence`);
    assert.ok(visitorWords >= studioWords, `${service.title} must center you and your`);
    assert.doesNotMatch(service.desc, BANNED_COPY);
  });
});

test('a sibling row dimmed by the active-row focus cue stays legible', () => {
  // Reported bug: sibling .service-desc text at 0.6 opacity read as
  // illegible/"shadowed" against the animated dark backdrop. Keep the dim
  // cue (must stay < 1, or the active-row focus indicator loses meaning)
  // but never let it regress back down toward the old washed-out floor.
  const match = globalsCss.match(
    /\.services-list:has\(\.service-row:hover\)[\s\S]*?\.service-row:not\(\.is-active\) \.service-desc \{\s*[\s\S]*?opacity:\s*([\d.]+);/,
  );
  assert.ok(match, 'sibling-row dim rule must exist in app/globals.css');
  const opacity = Number(match[1]);
  assert.ok(opacity >= 0.75, `dimmed sibling opacity ${opacity} is too low to read`);
  assert.ok(opacity < 1, 'dimming must still visually distinguish the active row');
});
