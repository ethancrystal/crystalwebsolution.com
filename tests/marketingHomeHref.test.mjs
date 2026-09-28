import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('useMarketingHomeHref starts at "/" and only swaps to SITE_ORIGIN on the app host', () => {
  const hook = read('../lib/useMarketingHomeHref.js');
  assert.match(hook, /useState\('\/'\)/, 'must default to "/" so SSR and first client render match (no hydration mismatch)');
  assert.match(hook, /window\.location\.hostname === APP_HOST/);
  assert.match(hook, /setHref\(SITE_ORIGIN\)/);
  assert.match(hook, /from '@\/lib\/portalHost\.mjs'/);
});

// A relative href="/" on the app host hits the app->login redirect in
// portalHostRedirects() and bounces straight back to the page the visitor is
// already on. Every portal auth surface with a brand-logo link must route
// through the hook instead of a hardcoded "/".
test('every portal auth surface with a brand-logo home link uses useMarketingHomeHref', () => {
  const surfaces = [
    '../app/login/page.jsx',
    '../app/signup/page.jsx',
    '../components/auth/PortalLoginForm.jsx',
    '../components/crm/WorkspaceShell.jsx',
  ];

  for (const path of surfaces) {
    const src = read(path);
    assert.match(src, /useMarketingHomeHref/, `${path} must use useMarketingHomeHref`);
    assert.doesNotMatch(src, /href=["']\/["']/, `${path} must not hardcode href="/" for its home link`);
  }
});
