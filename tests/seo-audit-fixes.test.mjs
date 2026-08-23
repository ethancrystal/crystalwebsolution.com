import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('flagged About and Blog pages use descriptive metadata titles', () => {
  const about = source('app/about/page.jsx');
  const blog = source('app/blog/page.jsx');
  assert.match(about, /const TITLE = 'About the Studio';/);
  assert.match(blog, /const BLOG_TITLE = 'Studio Notes';/);
  for (const title of ['About the Studio | Crystal Web Solution', 'Studio Notes | Crystal Web Solution']) {
    assert.ok(title.length >= 30 && title.length <= 60, title + ' should be concise and descriptive');
  }
});

test('flagged case studies expose compact SEO titles', () => {
  const projects = source('lib/projects.js');
  const route = source('app/work/[slug]/page.jsx');
  assert.match(projects, /seoTitle: 'Immersive Web Experience \\| Crystal Web Solution'/);
  assert.match(projects, /seoTitle: 'Web & App Development \\| Crystal Web Solution'/);
  assert.match(route, /project\.seoTitle/);
});

test('flagged thin-content pages include useful explanatory copy', () => {
  const services = source('app/services/page.jsx');
  const contact = source('app/contact/page.jsx');
  const blog = source('app/blog/page.jsx');
  const projects = source('lib/projects.js');
  assert.match(services, /How the services connect/);
  assert.match(contact, /What to include in your brief/);
  assert.match(blog, /Notes from the work/);
  assert.match(projects, /The learning experience is the product/);
  assert.match(projects, /The catalog is only the starting point/);
});
