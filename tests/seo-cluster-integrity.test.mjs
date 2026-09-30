// Cluster integrity: the pillar + cluster rule in docs/seo/STRATEGY.md §3, enforced.
//
// The rule: "One pillar URL per theme targets the head term. Supporting pages
// are built first, each targeting one narrow term, and every one links up to
// its pillar." Plus "One keyword -> exactly one URL."
//
// Three sources have to agree, and nothing until now checked that they do:
//   1. docs/seo/KEYWORD-REGISTRY.md  - the keyword -> URL map (source of truth)
//   2. docs/seo/drafts/blog/*.md     - post bodies; publish-blog-drafts.mjs
//                                      upserts approved ones into Supabase, so
//                                      these files are the canonical body
//   3. lib/servicePages.mjs GUIDE_LINKS - the pillar -> post direction
//
// This drifted in practice: /blog/web-development-rfp-guide sat with no
// reportable impressions partly because Google had not crawled the pages
// linking to it, and the registry still records the link graph nobody checks.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { SERVICE_PAGES } from '../lib/servicePages.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = join(ROOT, 'docs/seo/KEYWORD-REGISTRY.md');
const DRAFTS_DIR = join(ROOT, 'docs/seo/drafts/blog');

const MIN_ANCHOR_LENGTH = 10;

/**
 * Rows of the "## Mapped" table only. Later sections (drift, unmapped clusters,
 * split rulings) use different column shapes and are not the keyword -> URL map.
 */
function readMappedRows() {
  const text = readFileSync(REGISTRY, 'utf8');
  const start = text.indexOf('## Mapped');
  assert.notEqual(start, -1, 'KEYWORD-REGISTRY.md must keep its "## Mapped" section');
  const rest = text.slice(start + 3);
  const end = rest.indexOf('\n## ');
  const section = end === -1 ? rest : rest.slice(0, end);

  const rows = [];
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.length < 7) continue;
    if (cells[0] === 'Keyword' || /^-+$/.test(cells[0])) continue;
    const [keyword, , , , , targetUrl, pageState] = cells;
    if (!targetUrl.startsWith('/')) continue;
    rows.push({ keyword, targetUrl, pageState });
  }
  assert.ok(rows.length > 5, 'expected the mapped table to parse into rows');
  return rows;
}

function readDrafts() {
  return readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((file) => {
      const slug = file.slice(0, -3);
      const source = readFileSync(join(DRAFTS_DIR, file), 'utf8');
      const fm = source.startsWith('---\n') ? source.slice(4, source.indexOf('\n---', 4)) : '';
      const meta = Object.fromEntries(
        fm
          .split('\n')
          .map((l) => l.match(/^([a-z_]+):\s*(.*)$/i))
          .filter(Boolean)
          .map((m) => [m[1], m[2].trim()]),
      );
      return { file, slug, meta, body: source };
    });
}

/** Markdown links pointing at a service pillar, with their anchor text. */
function pillarLinks(body) {
  const links = [];
  const re = /\[([^\]]+)\]\((\/services\/[a-z0-9-]+)\)/g;
  let m;
  while ((m = re.exec(body)) !== null) links.push({ label: m[1], href: m[2] });
  return links;
}

const SERVICE_HREFS = new Set(SERVICE_PAGES.map((p) => `/services/${p.slug}`));

test('registry: one keyword maps to exactly one URL', () => {
  const byKeyword = new Map();
  for (const { keyword, targetUrl } of readMappedRows()) {
    if (!byKeyword.has(keyword)) byKeyword.set(keyword, new Set());
    byKeyword.get(keyword).add(targetUrl);
  }
  const conflicts = [...byKeyword]
    .filter(([, urls]) => urls.size > 1)
    .map(([keyword, urls]) => `${keyword} -> ${[...urls].join(' AND ')}`);
  assert.deepEqual(conflicts, [], 'a keyword pointing at two URLs makes the pages compete');
});

test('registry: every row claiming a draft has that draft file on disk', () => {
  const slugs = new Set(readDrafts().map((d) => d.slug));
  const missing = readMappedRows()
    .filter((r) => r.targetUrl.startsWith('/blog/') && /^draft\b/i.test(r.pageState))
    .map((r) => r.targetUrl.slice('/blog/'.length))
    .filter((slug) => !slugs.has(slug));
  assert.deepEqual(
    [...new Set(missing)],
    [],
    'registry claims a draft that does not exist in docs/seo/drafts/blog/',
  );
});

test('registry: every blog draft on disk is mapped in the registry', () => {
  const mapped = new Set(
    readMappedRows()
      .filter((r) => r.targetUrl.startsWith('/blog/'))
      .map((r) => r.targetUrl.slice('/blog/'.length)),
  );
  const unmapped = readDrafts()
    .map((d) => d.slug)
    .filter((slug) => !mapped.has(slug));
  assert.deepEqual(unmapped, [], 'an unmapped draft can publish a URL that competes for an owned term');
});

test('drafts: target_url front matter matches the filename', () => {
  for (const { file, slug, meta } of readDrafts()) {
    assert.equal(
      meta.target_url,
      `/blog/${slug}`,
      `${file}: target_url must be "/blog/${slug}" or the publish script rejects it`,
    );
  }
});

test('drafts: every cluster post links up to a pillar with descriptive anchor text', () => {
  for (const { file, body } of readDrafts()) {
    const links = pillarLinks(body);
    assert.ok(
      links.length > 0,
      `${file}: no link to a /services/ pillar — STRATEGY.md §3 requires every supporting page to link up`,
    );
    for (const { label, href } of links) {
      assert.ok(
        SERVICE_HREFS.has(href),
        `${file}: ${href} is not a real service page (see lib/servicePages.mjs)`,
      );
      assert.ok(
        label.trim().length >= MIN_ANCHOR_LENGTH,
        `${file}: anchor text "${label}" is too thin for ${href}`,
      );
    }
  }
});

test('reciprocity: an approved post that links up to a pillar is linked back from it', () => {
  const guideHrefs = new Map(
    SERVICE_PAGES.map((p) => [`/services/${p.slug}`, new Set((p.guideLinks || []).map((l) => l.href))]),
  );
  for (const { file, slug, meta, body } of readDrafts()) {
    if (meta.approved !== 'true') continue; // unpublished posts must not be linked from live pillars
    for (const { href } of pillarLinks(body)) {
      assert.ok(
        guideHrefs.get(href)?.has(`/blog/${slug}`),
        `${file} links up to ${href}, but that pillar's guideLinks does not link back to /blog/${slug}`,
      );
    }
  }
});

test('guideLinks: every pillar-to-post link is well formed and reachable', () => {
  for (const page of SERVICE_PAGES) {
    for (const link of page.guideLinks || []) {
      assert.match(link.href, /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/, `${page.slug}: ${link.href}`);
      assert.ok(
        link.label.trim().length >= MIN_ANCHOR_LENGTH,
        `${page.slug}: anchor text too thin for ${link.href}`,
      );
    }
  }
});
