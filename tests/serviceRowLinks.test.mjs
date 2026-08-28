import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { SERVICES } from '../lib/services.mjs';
import {
  SERVICE_PAGES,
  SERVICE_PAGE_SLUGS,
  SERVICE_SLUG_BY_SIGNAL,
} from '../lib/servicePages.mjs';
import { readResolvedGlobalsCss } from './helpers/resolvedGlobalsCss.mjs';

const servicesSource = readFileSync(
  new URL('../components/sections/Services.jsx', import.meta.url),
  'utf8',
);
const cssSource = readResolvedGlobalsCss();

// A silently broken signal→slug join would render eight dead /services/
// links with no build or render error, so assert the join end to end.
test('every service row resolves a real /services/[slug] href through the signal join', () => {
  assert.equal(SERVICES.length, 8);
  const seen = new Set();

  SERVICES.forEach((service) => {
    const slug = SERVICE_SLUG_BY_SIGNAL[service.signal];

    assert.equal(
      typeof slug,
      'string',
      `${service.title} (signal "${service.signal}") has no slug in SERVICE_SLUG_BY_SIGNAL`,
    );
    assert.match(
      slug,
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `${service.title} resolved a non-slug value: ${slug}`,
    );
    assert.ok(
      SERVICE_PAGE_SLUGS.includes(slug),
      `/services/${slug} has no matching SERVICE_PAGES entry, so the link would 404`,
    );
    assert.ok(!seen.has(slug), `slug ${slug} is used by more than one service`);
    seen.add(slug);
  });

  assert.equal(seen.size, SERVICES.length);
});

test('each service page record supplies at least three capability chips', () => {
  SERVICES.forEach((service) => {
    const page = SERVICE_PAGES.find((entry) => entry.signal === service.signal);
    assert.ok(page, `${service.title} has no SERVICE_PAGES record`);
    assert.ok(
      Array.isArray(page.capabilities) && page.capabilities.length >= 3,
      `${service.title} needs 3 capabilities for the row chips, has ${page.capabilities?.length ?? 0}`,
    );
    page.capabilities.slice(0, 3).forEach((capability) => {
      assert.equal(typeof capability, 'string');
      assert.ok(capability.trim().length > 0, `${service.title} has a blank capability`);
    });
    assert.equal(
      new Set(page.capabilities.slice(0, 3)).size,
      3,
      `${service.title} repeats a capability inside the first three (React key collision)`,
    );
  });
});

test('Services.jsx derives the href from the join and reuses the shared chip class', () => {
  assert.match(
    servicesSource,
    /import \{ SERVICE_PAGES, SERVICE_SLUG_BY_SIGNAL \} from '\.\.\/\.\.\/lib\/servicePages\.mjs'/,
  );
  assert.match(servicesSource, /SERVICE_SLUG_BY_SIGNAL\[service\.signal\]/);
  assert.match(servicesSource, /`\/services\/\$\{slug\}`/);
  assert.match(servicesSource, /className="case-services service-chips"/);
  // The slug must never be reconstructed from the human-readable title.
  assert.doesNotMatch(servicesSource, /title[^\n]*\.toLowerCase\(\)/);
});

test('the row detail block keeps the case-study chip rule intact and stays in-column', () => {
  assert.match(cssSource, /\.case-services\.service-chips \{[^}]*margin-bottom: 0;/);
  assert.match(cssSource, /\.service-row-more \{[^}]*grid-column: 2;/);
  // Single-column rows below 900px must not open an implicit second track.
  assert.match(cssSource, /\.service-row-more \{ grid-column: 1; \}/);
  // Chips may shrink and wrap, so the row never forces horizontal overflow.
  assert.match(cssSource, /\.service-row-more \{[^}]*min-width: 0;/);
  assert.match(cssSource, /\.case-services\.service-chips \{[^}]*max-width: 100%;/);
  assert.doesNotMatch(cssSource, /\.case-services li \{[^}]*white-space: nowrap/);
});
