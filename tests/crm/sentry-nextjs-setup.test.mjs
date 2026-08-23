import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (relativePath) => fs.readFileSync(new URL(relativePath, root), 'utf8');
const exists = (relativePath) => fs.existsSync(new URL(relativePath, root));

const packageJson = JSON.parse(read('package.json'));
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

test('installs the Sentry Next.js SDK', () => {
  assert.match(dependencies['@sentry/nextjs'], /^\d|^[~^]\d/);
});

test('registers Sentry for client, Node, and Edge runtimes', () => {
  for (const file of [
    'instrumentation-client.js',
    'sentry.server.config.js',
    'sentry.edge.config.js',
    'instrumentation.js',
  ]) {
    assert.equal(exists(file), true, `${file} should exist`);
  }

  assert.match(read('instrumentation.js'), /captureRequestError/);
  assert.match(read('instrumentation.js'), /NEXT_RUNTIME/);
});

test('keeps Sentry initialization privacy-safe by default', () => {
  for (const file of [
    'instrumentation-client.js',
    'sentry.server.config.js',
    'sentry.edge.config.js',
  ]) {
    const source = read(file);
    assert.match(source, /sendDefaultPii:\s*false/);
    assert.doesNotMatch(source, /sendDefaultPii:\s*true/);
  }
});

test('captures App Router render errors without exposing error details', () => {
  for (const file of ['app/error.jsx', 'app/global-error.jsx']) {
    assert.equal(exists(file), true, `${file} should exist`);
    const source = read(file);
    assert.match(source, /Sentry\.captureException\(error/);
    assert.doesNotMatch(source, /error\.message|error\.stack/);
  }
});

test('wraps the existing Next.js configuration without replacing it', () => {
  const source = read('next.config.js');
  assert.match(source, /withSentryConfig/);
  assert.match(source, /module\.exports\s*=\s*withSentryConfig\(nextConfig/);
  assert.match(source, /const shouldUploadSentrySourceMaps = process\.env\.SENTRY_UPLOAD_SOURCEMAPS === ['\"]true['\"] && Boolean\(process\.env\.SENTRY_AUTH_TOKEN\)/);
  assert.match(source, /sourcemaps:\s*\{\s*disable:\s*!shouldUploadSentrySourceMaps/);
  assert.match(source, /release:\s*\{\s*create:\s*shouldUploadSentrySourceMaps/);
  assert.match(source, /deploy:\s*shouldUploadSentrySourceMaps/);
  assert.match(source, /unstable_sentryWebpackPluginOptions:\s*\{\s*release:\s*\{\s*create:\s*shouldUploadSentrySourceMaps,\s*finalize:\s*shouldUploadSentrySourceMaps,\s*deploy:\s*shouldUploadSentrySourceMaps/);
});

test('documents safe API-route and server-component error examples', () => {
  const source = read('docs/SENTRY-NEXTJS.md');
  assert.match(source, /app\/api\/contact\/route\.js/);
  assert.match(source, /Sentry\.captureException\(error/);
  assert.match(source, /Server Components/);
  assert.match(source, /sendDefaultPii:\s*false/);
  assert.match(source, /Do not attach request bodies, cookies, authorization headers, or Supabase credentials/);
});
