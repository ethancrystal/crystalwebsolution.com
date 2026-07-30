import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

function major(version) {
  return Number.parseInt(version.match(/\d+/)?.[0], 10);
}

test('uses the React 19-compatible Next 15 platform contract', async () => {
  const [packageJson, caseStudy] = await Promise.all([
    readFile(new URL('package.json', root), 'utf8'),
    readFile(new URL('app/work/[slug]/page.jsx', root), 'utf8'),
  ]);
  const pkg = JSON.parse(packageJson);

  assert.equal(major(pkg.dependencies.next), 15);
  assert.equal(major(pkg.dependencies.react), 19);
  assert.equal(major(pkg.dependencies['react-dom']), 19);
  assert.equal(major(pkg.dependencies['@react-three/fiber']), 9);
  assert.match(caseStudy, /async function generateMetadata\(\{ params \}\)/);
  assert.match(caseStudy, /const \{ slug \} = await params/);
  assert.match(caseStudy, /export default async function CaseStudy\(\{ params \}\)/);
});
