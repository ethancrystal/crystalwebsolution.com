import test from 'node:test';
import assert from 'node:assert/strict';
import { isTransitionPath, transitionDestination } from '../lib/pageTransition.mjs';
import { SCRAMBLE_GLYPHS, scrambleFrame } from '../lib/scramble.mjs';

const here = 'https://www.cdsportswearinc.com/services';

test('page transition animates only public same-origin page changes', () => {
  assert.equal(transitionDestination({ href: '/work', currentHref: here }), '/work');
  assert.equal(transitionDestination({ href: '/#contact', currentHref: here }), '/#contact');
  assert.equal(transitionDestination({ href: '/work?x=1', currentHref: here }), '/work?x=1');
});

test('page transition leaves special links alone', () => {
  assert.equal(transitionDestination({ href: '#faq', currentHref: here }), null);
  assert.equal(transitionDestination({ href: '/services#faq', currentHref: here }), null);
  assert.equal(transitionDestination({ href: 'https://example.com/', currentHref: here }), null);
  assert.equal(transitionDestination({ href: 'mailto:a@b.co', currentHref: here }), null);
  assert.equal(transitionDestination({ href: '/work', currentHref: here, target: '_blank' }), null);
  assert.equal(transitionDestination({ href: '/work', currentHref: here, download: true }), null);
  assert.equal(transitionDestination({ href: '/login', currentHref: here }), null);
  assert.equal(transitionDestination({ href: '/work', currentHref: 'https://www.cdsportswearinc.com/dashboard' }), null);
});

test('CRM and auth routes are excluded from the transition', () => {
  for (const p of ['/admin', '/admin/deals', '/dashboard', '/team/x', '/login', '/signup', '/auth/callback']) {
    assert.equal(isTransitionPath(p), false, p);
  }
  for (const p of ['/', '/work/tucker-trips', '/services', '/blog/post']) {
    assert.equal(isTransitionPath(p), true, p);
  }
});

test('scramble frames keep spaces and length, swap other characters', () => {
  const frame = scrambleFrame('Start a project', () => 0);
  assert.equal(frame.length, 'Start a project'.length);
  assert.equal(frame, 'aaaaa a aaaaaaa');
  for (const ch of scrambleFrame('Services')) assert.ok(SCRAMBLE_GLYPHS.includes(ch));
});
