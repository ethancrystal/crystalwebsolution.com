// Release-number policy for pull requests into main (CLAUDE.md "Release
// versioning", rule 4). Used by the `release-policy` job in
// .github/workflows/dependabot-auto-merge.yml, which gathers the inputs
// from the GitHub API and passes them here. Pure function, no I/O, so the
// rules are unit-tested in tests/release-policy.test.mjs.
//
// A PR's version must:
//   - be named the same in its title and in VERSION;
//   - be above every release already on main (VERSION, CHANGELOG headings,
//     and PR titles in main's commit messages, because a PR can deploy under
//     a title without bumping the files);
//   - not be claimed by another open PR;
//   - head CHANGELOG.md with a dated, non-empty entry.
// Minors are two digits, then three with no leading zero: v1.09, v1.99,
// v1.100 (owner decision 2026-09-29, when nine queued PRs met the old .99
// pause). Compare them as numbers, never as strings.
// Gaps are allowed: several PRs queue at once, and each takes the next free
// number when it is opened. If a higher version merges first, the lower one
// is renumbered before it merges.

const VERSION = /^v(\d+)\.(\d{2}|[1-9]\d{2,})$/;
const TITLE = /^v(\d+)\.(\d{2}|[1-9]\d{2,}) — .+$/u;
// A release name at the start of a line followed by " — ": the PR-title
// convention, and the first line of every merge commit's body. Mentions in
// prose ("renumber to v1.84") are deliberately not counted.
const RELEASE_LINE = /^v(\d+)\.(\d{2}|[1-9]\d{2,}) — /gmu;
const CHANGELOG_HEADING = /^## (v\d+\.(?:\d{2}|[1-9]\d{2,})) — (\d{4}-\d{2}-\d{2})$/u;
const ANY_CHANGELOG_HEADING = /^## (v\d+)\.(\d{2}|[1-9]\d{2,}) — /gmu;

export function parseVersion(text) {
  const match = VERSION.exec(String(text ?? '').trim());
  return match ? { major: Number(match[1]), minor: Number(match[2]) } : null;
}

export function formatVersion({ major, minor }) {
  return `v${major}.${String(minor).padStart(2, '0')}`;
}

export function compareVersions(a, b) {
  return a.major - b.major || a.minor - b.minor;
}

function releasesNamedIn(text, pattern) {
  const found = [];
  for (const match of String(text ?? '').matchAll(pattern)) {
    found.push({ major: Number(match[1]), minor: Number(match[2]) });
  }
  return found;
}

function highestOf(versions) {
  return versions.reduce((best, version) => (!best || compareVersions(version, best) > 0 ? version : best), null);
}

/**
 * @param {object} input
 * @param {string} input.title                 this PR's title
 * @param {number} [input.number]              this PR's number (for messages)
 * @param {string[]} input.changedFiles        paths this PR changes
 * @param {string} input.baseVersion           VERSION on main
 * @param {string} input.headVersion           VERSION on this PR's head
 * @param {string} input.headChangelog         CHANGELOG.md on this PR's head
 * @param {string} input.mainChangelog         CHANGELOG.md on main
 * @param {string[]} input.mainCommitMessages  recent commit messages on main
 * @param {{number: number, title: string}[]} input.otherOpenPulls  other open PRs into main
 * @returns {{ok: true, notice: string} | {ok: false, message: string}}
 */
export function validateRelease(input) {
  const fail = (message) => ({ ok: false, message });

  const titleMatch = TITLE.exec(input.title ?? '');
  if (!titleMatch) {
    return fail('PR title must start with the release version, an em dash, and a summary (for example: v1.94 — fix the release check).');
  }

  const changed = new Set(input.changedFiles ?? []);
  for (const path of ['VERSION', 'CHANGELOG.md']) {
    if (!changed.has(path)) return fail(`This main-branch PR must modify ${path} in the same PR.`);
  }

  const base = parseVersion(input.baseVersion);
  const head = parseVersion(input.headVersion);
  if (!base || !head) return fail('VERSION must contain a single version in the format vMAJOR.NN.');

  const headName = formatVersion(head);
  const titleName = `v${titleMatch[1]}.${titleMatch[2]}`;
  if (titleName !== headName) {
    return fail(`The PR title names ${titleName} but VERSION says ${headName}; they must match.`);
  }

  if (head.major !== base.major) {
    return fail('A major-version transition requires owner direction.');
  }

  const highestOnMain = highestOf([
    base,
    ...releasesNamedIn(input.mainChangelog, ANY_CHANGELOG_HEADING),
    ...(input.mainCommitMessages ?? []).flatMap((message) => releasesNamedIn(message, RELEASE_LINE)),
  ]);
  if (compareVersions(head, highestOnMain) <= 0) {
    return fail(`VERSION ${headName} must be above ${formatVersion(highestOnMain)}, the highest release already on main. Take the next number above main and every open PR.`);
  }

  for (const pull of input.otherOpenPulls ?? []) {
    const match = TITLE.exec(pull.title ?? '');
    if (match && Number(match[1]) === head.major && Number(match[2]) === head.minor) {
      return fail(`${headName} is already claimed by open PR #${pull.number} ("${pull.title}"). Take the next free number.`);
    }
  }

  const lines = String(input.headChangelog ?? '').replace(/\r\n/g, '\n').split('\n');
  const headingIndex = lines.findIndex((line) => line.trim().length > 0);
  const heading = headingIndex >= 0 ? lines[headingIndex].trim() : '';
  const headingMatch = CHANGELOG_HEADING.exec(heading);
  if (!headingMatch || headingMatch[1] !== headName) {
    return fail(`CHANGELOG.md must start with a heading for ${headName} in the format "## ${headName} — YYYY-MM-DD".`);
  }
  const nextHeading = lines.findIndex((line, index) => index > headingIndex && /^##\s/.test(line));
  const body = lines.slice(headingIndex + 1, nextHeading < 0 ? lines.length : nextHeading);
  if (!body.some((line) => line.trim().length > 0)) {
    return fail('The new top CHANGELOG.md entry must include a short summary of the change.');
  }

  return {
    ok: true,
    notice: `Release metadata is valid for ${headName} (highest release on main: ${formatVersion(highestOnMain)}).`,
  };
}
