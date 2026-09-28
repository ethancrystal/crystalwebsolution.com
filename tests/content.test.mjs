import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { REVIEWS, REVIEW_STATS } from '../lib/reviews.js';
import { SITE, cityStateZip } from '../lib/site.js';

const STORIES_SOURCE = readFileSync(
  new URL('../components/sections/Stories.jsx', import.meta.url),
  'utf8',
);

test('published review set remains complete', () => {
  assert.equal(REVIEWS.length, 20);
  assert.equal(new Set(REVIEWS.map((review) => review.id)).size, 20);
  assert.ok(REVIEWS.every((review) => review.rating >= 1 && review.rating <= 5));
  assert.ok(REVIEWS.every((review) => review.reviewer && review.date && review.body.length));
});

test('review summary matches the approved content plan', () => {
  assert.deepEqual(REVIEW_STATS, {
    total: 20,
    average: '4.3',
    positive: 17,
    latest: 'June 15, 2026',
  });
});

test('homepage uses three complete, attributable reviews', () => {
  const ids = ['vaughn-hebron', 'porsha-patterson', 'style-loft'];
  const reviews = ids.map((id) => REVIEWS.find((review) => review.id === id));

  assert.equal(reviews.length, 3);
  assert.ok(reviews.every((review) => review?.reviewer && review.body[0]));
  assert.equal(reviews[1].company, 'Zues Towing');
  assert.equal(reviews[0].company, undefined);
  ids.forEach((id) => assert.match(STORIES_SOURCE, new RegExp(`['"]${id}['"]`)));
  assert.doesNotMatch(STORIES_SOURCE, /FEATURED_REVIEWS/);
});

test('global content publishes authorized studio facts and contact details', () => {
  assert.equal(SITE.name, 'CD Sportswear INC');
  assert.equal(SITE.founded, 2016);
  assert.equal(SITE.experience, '10+ years');
  assert.equal(SITE.projectsShipped, '60+ projects shipped');
  assert.equal(SITE.phone, '+1 804-280-4941');
  assert.equal(SITE.city, 'Manassas, VA');
  // Owner-supplied addresses (2026-09-26). The physical one is schema.org
  // `address`; the P.O. Box is post-only.
  assert.deepEqual(SITE.address, {
    streetAddress: '8956 Dahlgren Ridge Rd',
    addressLocality: 'Manassas',
    addressRegion: 'VA',
    postalCode: '20111',
    addressCountry: 'US',
  });
  assert.deepEqual(SITE.mailingAddress, {
    poBox: 'P.O. Box #41424',
    addressLocality: 'Arlington',
    addressRegion: 'VA',
    postalCode: '22204',
    addressCountry: 'US',
  });
  assert.equal(cityStateZip(SITE.address), 'Manassas, VA 20111');
  assert.equal(cityStateZip(SITE.mailingAddress), 'Arlington, VA 22204');
  // Sharjah is not a CD Sportswear INC location (owner, 2026-09-26).
  assert.equal('citySecondary' in SITE, false);
  assert.equal('cityCompact' in SITE, false);
  assert.doesNotMatch(JSON.stringify(SITE), /Sharjah|DXB|United Arab Emirates/);
  assert.deepEqual(SITE.socials, []);
  assert.ok(SITE.nav.some((item) => item.href === '/reviews'));
  assert.ok(SITE.nav.some((item) => item.href === '/blog'));
});

test('review attribution keeps the published towing company spelling', () => {
  assert.equal(REVIEWS.find((review) => review.id === 'porsha-patterson').company, 'Zues Towing');
});
