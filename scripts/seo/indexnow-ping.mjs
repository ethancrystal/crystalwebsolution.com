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

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', '..', 'public');

function findKeyFile() {
  const entries = readdirSync(PUBLIC_DIR);
  const match = entries.find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
  if (!match) {
    throw new Error('No IndexNow key file found in public/ (expected <32-hex>.txt)');
  }
  return match;
}

function readKey(fileName) {
  return readFileSync(join(PUBLIC_DIR, fileName), 'utf8').trim();
}

function deriveHost(firstUrl) {
  const parsed = new URL(firstUrl);
  return `${parsed.protocol}//${parsed.host}`;
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
  const urls = args.filter((a) => a !== '--dry-run');

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
  const host = deriveHost(urls[0]);
  const keyLocation = `${host}/public/${keyFile}`;
  const payload = buildPayload(host, key, keyLocation, urls);

  if (dryRun) {
    console.log('--- IndexNow payload (dry run) ---');
    printPayload(payload);
    console.log('--- End payload ---');
    console.log(`Key file: public/${keyFile}`);
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
