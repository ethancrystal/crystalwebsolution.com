#!/usr/bin/env node
// IndexNow ping for CD Sportswear INC.
// Generates/updates the IndexNow key file and POSTs {host, key, keyLocation, urlList}
// to https://api.indexnow.org/indexnow for the URLs passed on the command line.
//
// Usage:
//   node scripts/seo/indexnow-ping.mjs https://www.cdsportswearinc.com https://www.cdsportswearinc.com/foo https://www.cdsportswearinc.com/bar
//   node scripts/seo/indexnow-ping.mjs --dry-run https://www.cdsportswearinc.com https://www.cdsportswearinc.com/foo
//
// The first positional argument is always the host; every subsequent positional
// argument is a URL to include in urlList. With --dry-run, the payload is
// printed to stdout and nothing is sent.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const KEY_FILE = join(PROJECT_ROOT, 'public');

// IndexNow key: a 32-character lowercase hex string stored as
// public/<key>.txt. Generate once if missing.
function generateKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function keyFileName(key) {
  return `${key}.txt`;
}

function ensureKeyFile() {
  const files = existsSync(KEY_FILE)
    ? readFileSync(KEY_FILE, 'utf8').split(/\r?\n).filter(Boolean)
    : [];
  // Find any existing 32-char-hex .txt file in public/
  const existing = files.find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  if (existing) {
    const key = existing.replace(/\.txt$/, '');
    return { key, fileName: existing, exists: true };
  }
  const key = generateKey();
  const fileName = keyFileName(key);
  const fullPath = join(KEY_FILE, fileName);
  writeFileSync(fullPath, key, 'utf8');
  return { key, fileName, exists: false };
}

function buildPayload(host, key, keyLocation, urlList) {
  return {
    host,
    key,
    keyLocation,
    urlList: urlList.filter((url) => url.startsWith(host)),
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
  const positional = args.filter((a) => a !== '--dry-run');

  if (positional.length < 1) {
    console.error('Usage: node scripts/seo/indexnow-ping.mjs [--dry-run] <host> <url> [<url> ...]');
    console.error('  host   - the site host, e.g. https://www.cdsportswearinc.com');
    console.error('  url    - one or more URLs to ping (must start with host)');
    process.exit(1);
  }

  const host = positional[0];
  const urlList = positional.slice(1);
  return { dryRun, host, urlList };
}

async function main() {
  const { dryRun, host, urlList } = parseArgs(process.argv);

  if (!host.startsWith('http://') && !host.startsWith('https://')) {
    console.error('Host must start with http:// or https://');
    process.exit(1);
  }

  const { key, fileName, exists } = ensureKeyFile();
  const keyLocation = `${host}/public/${fileName}`;

  const payload = buildPayload(host, key, keyLocation, urlList);

  if (dryRun) {
    console.log('--- IndexNow payload (dry run) ---');
    printPayload(payload);
    console.log('--- End payload ---');
    console.log(`Key file: public/${fileName} (${exists ? 'existing' : 'created'})`);
    console.log(`urlList: ${payload.urlList.length} URL(s)`);
    return;
  }

  console.log(`Pinging IndexNow for ${payload.urlList.length} URL(s) on ${host} ...`);
  const response = await sendPing(payload);
  console.log(`IndexNow responded ${response.status} ${response.statusText}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
