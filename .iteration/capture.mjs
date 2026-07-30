/**
 * Headless capture harness (Playwright/Chromium).
 *
 * Screenshots a URL at desktop viewport: one full-page image plus a series of
 * viewport-height "section" frames as it scrolls down. Used to (a) grab the
 * trionn.com reference and (b) capture the local Crystal dev site each
 * iteration so the two can be compared side by side.
 *
 * Usage:
 *   node .iteration/capture.mjs <url> <label> [outDir] [steps]
 * Examples:
 *   node .iteration/capture.mjs https://www.trionn.com trionn .iteration/shots
 *   node .iteration/capture.mjs http://localhost:3000 crystal .iteration/shots
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const url = process.argv[2];
const label = process.argv[3] || 'shot';
const outDir = process.argv[4] || '.iteration/shots';
const steps = Number(process.argv[5] || 5);

if (!url) {
  console.error('usage: node .iteration/capture.mjs <url> <label> [outDir] [steps]');
  process.exit(1);
}

const VIEWPORT = { width: 1440, height: 900 };

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
});

try {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
} catch (e) {
  console.error(`goto warning for ${url}: ${e.message}`);
}

// Let WebGL / GSAP intro animations settle.
await page.waitForTimeout(4500);

// Full-page capture.
const fullPath = join(outDir, `${label}-full.png`);
await page.screenshot({ path: fullPath, fullPage: true });
console.log(`saved ${fullPath}`);

// Section frames: scroll one viewport at a time and shoot the viewport.
for (let i = 0; i < steps; i++) {
  const y = i * VIEWPORT.height;
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y);
  await page.waitForTimeout(1400); // allow scroll-triggered reveals to fire
  const p = join(outDir, `${label}-s${i}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`saved ${p}`);
}

await browser.close();
console.log('done');
