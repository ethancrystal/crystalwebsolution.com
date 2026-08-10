import { chromium } from 'playwright';
const BASE = 'http://localhost:3115';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const checks = ['/', '/work', '/services/web-design', '/about', '/services', '/contact', '/process', '/reviews', '/embroidery-screen-printing-web-design'];
let allOk = true;
for (const u of checks) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await page.goto(BASE + u, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const home = u === '/';
  const sub = await page.evaluate(() => !!document.querySelector('.subpage-nav'));
  const homeNav = await page.evaluate(() => !!document.querySelector('header.nav:not(.subpage-nav)'));
  const errCount = errors.length;
  if (errCount) allOk = false;
  if (home && sub) allOk = false; // homepage must NOT have subpage-nav
  if (!home && !sub) allOk = false; // inner must have subpage-nav
  console.log(`${u.padEnd(45)} errs=${errCount} subpageNav=${sub} homeNav=${homeNav}`);
}
await browser.close();
console.log(allOk ? 'ALL CHECKS PASS' : 'SOME CHECK FAILED');
