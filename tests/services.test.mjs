import assert from 'node:assert/strict';
import test from 'node:test';

import { SERVICES } from '../lib/services.mjs';

const EXPECTED_TITLES = [
  'Web Design & Development',
  'Branding & Identity',
  'Immersive 3D & Motion',
  'Digital Marketing',
  'AI Automation',
  'Workflow Automation',
];

const BANNED_COPY = /\b(?:leverage|synergy|best-in-class|cutting-edge|full-service|end-to-end|seamless|robust|scalable|elevate|solutions?|s[u]pplied|record|archive|placeholders?)\b/i;

test('service taxonomy contains the exact six offers in order', () => {
  assert.equal(SERVICES.length, 6);
  assert.deepEqual(SERVICES.map((service) => service.title), EXPECTED_TITLES);
  assert.deepEqual(SERVICES.map((service) => service.n), ['01', '02', '03', '04', '05', '06']);
});

test('each service uses one visitor-focused PAS sentence', () => {
  SERVICES.forEach((service) => {
    const visitorWords = service.desc.match(/\b(?:you|your)\b/gi)?.length || 0;
    const studioWords = service.desc.match(/\b(?:we|our)\b/gi)?.length || 0;
    const sentenceStops = service.desc.match(/[.!?](?=\s|$)/g)?.length || 0;

    assert.match(service.desc, /^When\b/);
    assert.match(service.desc, /, so we\b/i);
    assert.equal(sentenceStops, 1, `${service.title} must stay one sentence`);
    assert.ok(visitorWords >= studioWords * 2, `${service.title} must center you and your`);
    assert.doesNotMatch(service.desc, BANNED_COPY);
  });
});
