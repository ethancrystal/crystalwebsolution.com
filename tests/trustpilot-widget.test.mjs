import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { SITE } from '../lib/site.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('the TrustBox uses the owner-supplied Trustpilot ids and the dark theme', () => {
  assert.equal(SITE.trustpilot.businessUnitId, '6aba660640a9fd7c6265e094');
  assert.equal(SITE.trustpilot.templateId, '5419b6a8b0d04a076446a9ad');
  assert.equal(SITE.trustpilot.reviewUrl, 'https://www.trustpilot.com/review/cdsportswearinc.com');

  const widget = read('components/marketing/TrustpilotWidget.jsx');
  assert.match(widget, /className=\{`trustpilot-widget/);
  // The default light theme renders dark text on the site's dark footer.
  assert.match(widget, /data-theme="dark"/);
  // Loaded once per visit and never render-blocking; always https.
  assert.match(widget, /'https:\/\/widget\.trustpilot\.com\/bootstrap\/v5\/tp\.widget\.bootstrap\.min\.js'/);
  assert.match(widget, /strategy="lazyOnload"/);
  // Client-side navigation mounts footers after the bootstrap's one scan.
  assert.match(widget, /loadFromElement\(ref\.current, true\)/);
  // Trustpilot's required fallback link for no-JS / blocked script.
  assert.match(widget, /href=\{tp\.reviewUrl\}/);
});

test('both site footers render the TrustBox and the write-a-review link', () => {
  for (const file of ['components/marketing/MarketingFooter.jsx', 'components/sections/Contact.jsx']) {
    const source = read(file);
    assert.match(source, /<TrustpilotWidget /, `${file} must render the TrustBox`);
    assert.match(source, /SITE\.trustpilot\.writeReviewUrl/, `${file} must link to the review invitation`);
    assert.match(source, /rel="noopener noreferrer"/);
  }
});

test('CSP allows exactly the Trustpilot widget host, for script and frame only', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  const config = createRequire(import.meta.url)(path.join(ROOT, 'next.config.js'));
  const [rule] = await config.headers();
  const csp = rule.headers.find((header) => header.key === 'Content-Security-Policy').value;
  const directives = Object.fromEntries(
    csp.split('; ').map((directive) => {
      const [name, ...tokens] = directive.split(' ');
      return [name, tokens];
    }),
  );

  assert.ok(directives['script-src'].includes('https://widget.trustpilot.com'));
  assert.ok(directives['frame-src'].includes('https://widget.trustpilot.com'));
  assert.ok(!directives['connect-src'].some((token) => token.includes('trustpilot')));
  assert.ok(!csp.includes('*.trustpilot.com'), 'no wildcard Trustpilot host');
});
