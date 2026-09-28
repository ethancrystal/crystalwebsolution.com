#!/usr/bin/env node
// IndexNow ping for CD Sportswear INC.
// Reads the 32-char hex key from public/<key>.txt and POSTs
// { host, key, keyLocation, urlList } to https://api.indexnow.org/indexnow
// for the URLs passed on the command line.
//
// Usage:
//   node scripts/seo/indexnow-ping.mjs https://www.cdsportswearinc.com/foo https://www.cdsportswearinc.com/bar
//   node scripts/seo/indexnow-ping.mjs --dry-run https://www.cdsportswearinc.com/foo
//
// The first URL argument derives the host. With --dry-run, the payload is
// printed to stdout and nothing is sent.
//
// Per https://www.indexnow.org/documentation the JSON `host` is a bare
// hostname ("www.example.com"), and `keyLocation` must be a URL that serves
// the key. Next.js serves public/ at the site root, so the key lives at
// <origin>/<key>.txt — never <origin>/public/<key>.txt, which 404s.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');

function findKeyFile() {
  const entries = readdirSync(PUBLIC_DIR);
  const match = entries.find(name => /^[0-9a-f]{32}\.txt$/.test(name));
  if (!match) throw new Error('No IndexNow key file found in public/ (expected <32-hex>.txt)');
  return match;
}

function readKey(fileName) {
  return readFileSync(join(PUBLIC_DIR, fileName), 'utf8').trim();
}

export function deriveOrigin(firstUrl) {
  return new URL(firstUrl).origin;
}

// Only URLs on the same origin as the first one are sent: IndexNow answers
// 422 for URLs that do not belong to `host`.
export function buildPayload(origin, key, keyFile, urlList) {
  return {
    host: new URL(origin).host,
    key,
    keyLocation: `${origin}/${keyFile}`,
    urlList: urlList.filter(url => {
      try {
        return new URL(url).origin === origin;
      } catch {
        return false;
      }
    }),
  };
}

function printPayload(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

async function sendPing(payload) {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IndexNow returned ${response.status} ${response.statusText}: ${text}`);
  }
  return response;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const urls = args.filter(a => a !== '--dry-run');
  if (urls.length === 0) {
    console.error('Usage: node scripts/seo/indexnow-ping.mjs [--dry-run] <url> [<url> ...]');
    console.error('  url - one or more URLs to ping (first URL derives the host)');
    process.exit(1);
  }
  return { dryRun, urls };
}

async function main() {
  const { dryRun, urls } = parseArgs(process.argv);
  const keyFile = findKeyFile();
  const key = readKey(keyFile);
  const origin = deriveOrigin(urls[0]);
  const payload = buildPayload(origin, key, keyFile, urls);

  if (dryRun) {
    console.log('--- IndexNow payload (dry run) ---');
    printPayload(payload);
    console.log('--- End payload ---');
    console.log('Key file: public/' + keyFile);
    console.log('urlList: ' + payload.urlList.length + ' URL(s)');
    return;
  }

  console.log(`Pinging IndexNow for ${payload.urlList.length} URL(s) on ${payload.host} ...`);
  const response = await sendPing(payload);
  // 202 means "received, key validation pending", not verified success.
  console.log(`IndexNow responded ${response.status} ${response.statusText}`);
}

// Run only as a CLI, so tests can import buildPayload without side effects.
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main().catch(err => { console.error(err); process.exit(1); });
}
