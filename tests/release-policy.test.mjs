// Rules of the `release-policy` check (scripts/release-policy.mjs), run by
// .github/workflows/dependabot-auto-merge.yml on every PR into main. They
// encode CLAUDE.md "Release versioning" rule 4: never reuse a number; take
// one above main and every open PR.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { APPROVED_MAJORS, compareVersions, parseVersion, validateRelease } from '../scripts/release-policy.mjs';

const MAIN_CHANGELOG = `## v1.84 — 2026-09-28

Docs only.

## v1.83 — 2026-09-28

Dependabot gate.
`;

const MAIN_COMMITS = [
  'Merge pull request #257 from ethancrystal/claude/backfill-v1.79\n\nv1.84 — backfill v1.79 and v1.81, restore versioning rules',
  'Merge main (v1.83) into v1.84; keep VERSION v1.84 and both changelog entries',
  'Merge pull request #256 from ethancrystal/manus/dependabot-auto-merge\n\nv1.83 — gate Dependabot auto-merge on release metadata and CI',
];

// The open queue on 2026-09-29, when the old "exactly main + 0.01" rule
// failed every PR but one.
const OPEN = [
  { number: 259, title: 'v1.85 — plan: client, employee and admin portal workings' },
  { number: 262, title: 'v1.88 — shared dark, flat frame for the client, employee and admin portals' },
  { number: 266, title: 'v1.91 — lead project manager assignment and its emails' },
  { number: 267, title: 'v1.92 — docs: CRM engagement engine design spec' },
  { number: 268, title: 'v1.93 — client notifications: brief receipt, new-client alert, no unheard messages' },
  { number: 264, title: 'chore(deps): bump the production-dependencies group' },
];

function changelogFor(version, body = 'What changed.') {
  return `## ${version} — 2026-09-29\n\n${body}\n\n${MAIN_CHANGELOG}`;
}

function input(number, version, overrides = {}) {
  const own = OPEN.find((pull) => pull.number === number);
  return {
    title: own?.title ?? `${version} — something`,
    number,
    changedFiles: ['VERSION', 'CHANGELOG.md', 'app/page.jsx'],
    baseVersion: 'v1.84',
    headVersion: version,
    headChangelog: changelogFor(version),
    mainChangelog: MAIN_CHANGELOG,
    mainCommitMessages: MAIN_COMMITS,
    otherOpenPulls: OPEN.filter((pull) => pull.number !== number),
    ...overrides,
  };
}

test('queued PRs above main with their own numbers pass (the case the old check failed)', () => {
  for (const [number, version] of [[259, 'v1.85'], [266, 'v1.91'], [268, 'v1.93']]) {
    const result = validateRelease(input(number, version));
    assert.equal(result.ok, true, `#${number} ${version}: ${result.message}`);
  }
  assert.match(validateRelease(input(268, 'v1.93')).notice, /valid for v1\.93 \(highest release on main: v1\.84\)/);
});

test('a new PR takes the next free number; gaps are fine', () => {
  assert.equal(validateRelease(input(270, 'v1.94')).ok, true);
  assert.equal(validateRelease(input(270, 'v1.97')).ok, true);
});

test('a number another open PR holds is refused, naming that PR', () => {
  const result = validateRelease(input(270, 'v1.85'));
  assert.equal(result.ok, false);
  assert.match(result.message, /v1\.85 is already claimed by open PR #259/);
});

test('a number at or below main is refused, including one named only in main\'s merge log', () => {
  assert.match(validateRelease(input(270, 'v1.84')).message, /must be above v1\.84, the highest release already on main/);
  assert.equal(validateRelease(input(270, 'v1.80')).ok, false);

  // A PR can deploy under its title without bumping VERSION or CHANGELOG.
  const titledOnly = input(270, 'v1.86', {
    mainCommitMessages: ['Merge pull request #269 from x/y\n\nv1.86 — deployed without a bump', ...MAIN_COMMITS],
  });
  assert.match(validateRelease(titledOnly).message, /must be above v1\.86/);
});

test('versions mentioned in prose inside a commit message do not count as releases', () => {
  const prose = input(270, 'v1.85', {
    otherOpenPulls: [],
    mainCommitMessages: ['Merge main (v1.83) into v1.84; renumber to v1.90 later', ...MAIN_COMMITS],
  });
  assert.equal(validateRelease(prose).ok, true);
});

test('title and VERSION must name the same release', () => {
  const result = validateRelease(input(270, 'v1.94', { title: 'v1.95 — mismatch' }));
  assert.match(result.message, /title names v1\.95 but VERSION says v1\.94/);
});

test('title, files and CHANGELOG shape are still enforced', () => {
  assert.match(validateRelease(input(270, 'v1.94', { title: 'chore: no version' })).message, /PR title must start with the release version/);
  assert.match(validateRelease(input(270, 'v1.94', { changedFiles: ['CHANGELOG.md'] })).message, /must modify VERSION/);
  assert.match(validateRelease(input(270, 'v1.94', { changedFiles: ['VERSION'] })).message, /must modify CHANGELOG\.md/);
  assert.match(validateRelease(input(270, 'v1.94', { headVersion: '1.94' })).message, /format vMAJOR\.NN/);
  assert.match(
    validateRelease(input(270, 'v1.94', { headChangelog: MAIN_CHANGELOG })).message,
    /CHANGELOG\.md must start with a heading for v1\.94/,
  );
  assert.match(
    validateRelease(input(270, 'v1.94', { headChangelog: `## v1.94 — 2026-09-29\n\n## v1.84 — 2026-09-28\n\nx\n` })).message,
    /must include a short summary/,
  );
  assert.equal(validateRelease(input(270, 'v1.94', { headChangelog: changelogFor('v1.94').replace(/\n/g, '\r\n') })).ok, true);
});

test('major-version changes still need the owner', () => {
  assert.match(validateRelease(input(270, 'v3.01')).message, /major-version transition requires owner direction/);
  assert.match(
    validateRelease(input(270, 'v3.01', { baseVersion: 'v2.40', mainChangelog: '', mainCommitMessages: [] })).message,
    /major-version transition requires owner direction/,
  );
  assert.match(
    validateRelease(input(270, 'v1.99', { baseVersion: 'v1.99', otherOpenPulls: [] })).message,
    /paused at \.99/,
  );
});

test('the owner-approved v2 series is accepted above a v1 main, including past .99', () => {
  assert.deepEqual([...APPROVED_MAJORS], [2]);
  const queue = [{ number: 259, title: 'v2.01 — plan: client, employee and admin portal workings' }];
  const first = validateRelease(input(259, 'v2.01', { title: queue[0].title, otherOpenPulls: [] }));
  assert.equal(first.ok, true, first.message);
  assert.equal(validateRelease(input(260, 'v2.02', { otherOpenPulls: queue })).ok, true);
  assert.match(validateRelease(input(260, 'v2.01', { otherOpenPulls: queue })).message, /v2\.01 is already claimed by open PR #259/);
  assert.equal(validateRelease(input(270, 'v2.01', { baseVersion: 'v1.99', otherOpenPulls: [] })).ok, true);
  // Once main is on v2, v1 numbers are below it and fail as any stale number does.
  const onV2 = { baseVersion: 'v2.01', mainChangelog: '## v2.01 — 2026-09-30\n\nx\n', mainCommitMessages: [], otherOpenPulls: [] };
  assert.match(validateRelease(input(270, 'v1.98', onV2)).message, /major-version transition requires owner direction|must be above v2\.01/);
  assert.equal(validateRelease(input(270, 'v2.02', onV2)).ok, true);
});

test('version helpers order releases numerically', () => {
  assert.deepEqual(parseVersion(' v1.09\n'), { major: 1, minor: 9 });
  assert.equal(parseVersion('v1.9'), null);
  assert.ok(compareVersions(parseVersion('v1.10'), parseVersion('v1.09')) > 0);
  assert.ok(compareVersions(parseVersion('v2.00'), parseVersion('v1.99')) > 0);
});

test('the workflow runs these rules for every PR into main and keeps the Dependabot gate', async () => {
  const workflow = await readFile('.github/workflows/dependabot-auto-merge.yml', 'utf8');
  assert.match(workflow, /await import\('\$\{\{ github\.workspace \}\}\/scripts\/release-policy\.mjs'\)/);
  assert.match(workflow, /uses: actions\/checkout@v7\s+with:\s+persist-credentials: false/);
  assert.match(workflow, /github\.rest\.pulls\.list, \{ owner, repo, state: 'open', base: pr\.base\.ref/);
  assert.match(workflow, /\.filter\(\(pull\) => pull\.number !== pr\.number\)/);
  assert.match(workflow, /github\.rest\.repos\.listCommits\(\{ owner, repo, sha: pr\.base\.ref/);
  assert.match(workflow, /if \(result\.ok\) core\.notice\(result\.notice\);\s+else core\.setFailed\(result\.message\);/);
  assert.match(workflow, /needs: release-policy/);
  // The job reads only; it never gets write access.
  assert.match(workflow, /^permissions:\n  contents: read\n  pull-requests: read$/m);
});
