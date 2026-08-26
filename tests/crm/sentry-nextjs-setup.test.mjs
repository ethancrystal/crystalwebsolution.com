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

test('enables privacy-safe performance monitoring in all runtimes', () => {
  const client = read('instrumentation-client.js');
  const server = read('sentry.server.config.js');
  const edge = read('sentry.edge.config.js');

  assert.match(client, /tracesSampler|traceSampleRate|tracesSampleRate/);
  assert.match(server, /tracesSampler|tracesSampleRate/);
  assert.match(edge, /tracesSampler|tracesSampleRate/);
  for (const source of [client, server, edge]) {
    assert.doesNotMatch(source, /tracesSampleRate:\s*0\b/);
  }
  assert.match(client, /browserTracingIntegration/);
  assert.match(client, /tracePropagationTargets/);
});

test('enables session replay with masking and no network bodies', () => {
  const source = read('instrumentation-client.js');
  assert.match(source, /replayIntegration\(\{/);
  assert.match(source, /maskAllText:\s*true/);
  assert.match(source, /maskAllInputs:\s*true/);
  assert.match(source, /blockAllMedia:\s*true/);
  assert.match(source, /networkCaptureBodies:\s*false/);
  assert.match(source, /replaysOnErrorSampleRate/);
  assert.doesNotMatch(source, /sendDefaultPii:\s*true/);
});

test('keeps the Sentry verification route preview-only and privacy-safe', () => {
  assert.equal(exists('app/api/sentry-verification/route.js'), true);
  const source = read('app/api/sentry-verification/route.js');
  assert.match(source, /process\.env\.VERCEL_ENV\s*!==\s*['\"]preview['\"]/);
  assert.match(source, /sentry-verification/);
  assert.match(source, /Sentry\.captureException/);
  assert.match(source, /Sentry\.flush/);
  assert.doesNotMatch(source, /request\.json|request\.formData|cookies\(|authorization/i);
});

test('documents safe API-route and server-component error examples', () => {
  const source = read('docs/SENTRY-NEXTJS.md');
  assert.match(source, /app\/api\/contact\/route\.js/);
  assert.match(source, /Sentry\.captureException\(error/);
  assert.match(source, /Server Components/);
  assert.match(source, /sendDefaultPii:\s*false/);
  assert.match(source, /Do not attach request bodies, cookies, authorization headers, Supabase credentials, or user emails/);
});
