import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const PUBLIC_BRAND_FILES = [
  'app/about/page.jsx',
  'app/blog/page.jsx',
  'app/contact/page.jsx',
  'app/forgot-password/layout.jsx',
  'app/layout.jsx',
  'app/login/admin/layout.jsx',
  'app/login/client/layout.jsx',
  'app/login/employee/layout.jsx',
  'app/login/layout.jsx',
  'app/login/page.jsx',
  'app/process/page.jsx',
  'app/reviews/page.jsx',
  'app/services/page.jsx',
  'app/signup/layout.jsx',
  'app/signup/page.jsx',
  'app/work/page.jsx',
  'components/BrandLogo.jsx',
  'components/auth/PortalLoginForm.jsx',
  'components/Menu.jsx',
  'components/Nav.jsx',
  'components/marketing/MarketingHeader.jsx',
  'lib/site.js',
];

test('the canonical site brand is CD Sportswear USA', async () => {
  const { SITE } = await import('../lib/site.js');
  assert.equal(SITE.name, 'CD Sportswear USA');
  assert.equal(SITE.short, 'CD');
});

test('the supplied CD Sportswear USA logo is the canonical runtime asset', () => {
  assert.ok(existsSync(new URL('../public/cd-sportswear-usa-logo.png', import.meta.url)));
  const siteSource = read('lib/site.js');
  assert.match(siteSource, /logoPath:\s*'\/cd-sportswear-usa-logo\.png'/);
  assert.match(read('components/BrandLogo.jsx'), /SITE\.logoPath/);
  assert.doesNotMatch(read('components/BrandLogo.jsx'), /crystal-web-solution-(logo|icon)\.svg/);
  assert.match(read('app/login/page.jsx'), /SITE\.logoPath/);
  assert.match(read('components/auth/PortalLoginForm.jsx'), /SITE\.logoPath/);
  assert.match(read('components/marketing/MarketingHeader.jsx'), /BrandLogo/);
  assert.match(read('components/crm/WorkspaceShell.jsx'), /SITE\.logoPath/);
});

test('the app icon and root metadata use the new brand asset and name', () => {
  assert.ok(existsSync(new URL('../app/icon.png', import.meta.url)));
  const layout = read('app/layout.jsx');
  assert.doesNotMatch(layout, new RegExp(['Crystal', 'Web', 'Solution'].join('\\s+')));
  assert.match(layout, /SITE\.logoPath/);
  assert.match(layout, /CD Sportswear USA/);
});

test('public page and shared chrome sources contain no old visible brand name', () => {
  const oldBrand = new RegExp(['Crystal', 'Web', 'Solution'].join('\\s+'));
  const offenders = PUBLIC_BRAND_FILES.filter((path) => oldBrand.test(read(path)));
  assert.deepEqual(offenders, [], `old brand remains in: ${offenders.join(', ')}`);
});
