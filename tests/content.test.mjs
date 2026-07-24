import assert from 'node:assert/strict';
import test from 'node:test';

import { VERIFIED_CLIENTS } from '../lib/clients.js';
import { FEATURED_REVIEWS, REVIEWS, REVIEW_STATS } from '../lib/reviews.js';
import { SITE } from '../lib/site.js';

test('review archive preserves the supplied 20-review set', () => {
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

test('global content publishes verified contact details without placeholder socials', () => {
  assert.equal(SITE.name, 'Crystal Web Solution');
  assert.equal(SITE.phone, '+1 917-463-4214');
  assert.equal(SITE.city, 'Manassas, Virginia • Sharjah, UAE');
  assert.deepEqual(SITE.socials, []);
  assert.ok(SITE.nav.some((item) => item.href === '/reviews'));
});

test('verified client identities match the supplied record', () => {
  assert.deepEqual(
    VERIFIED_CLIENTS.map(({ person, company }) => ({ person, company })),
    [
      { person: 'Ravivo Kaufman', company: 'Talk to My Lawyer' },
      { person: 'Kristin Stein', company: 'Tucker Trips' },
      { person: 'Porsha Patterson', company: 'Zues Towing' },
    ],
  );
  assert.equal(REVIEWS.find((review) => review.id === 'porsha-patterson').company, 'Zues Towing');
});
