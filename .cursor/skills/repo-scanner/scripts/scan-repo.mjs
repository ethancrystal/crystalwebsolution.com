#!/usr/bin/env node
/**
 * Repo Scanner - GitHub API scanner
 * Outputs JSON snapshot of repository metadata
 * Usage: node scan-repo.mjs <repo-url> [branch] [depth]
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const API_BASE = 'https://api.github.com';
const DEFAULT_BRANCH = 'main';
const DEFAULT_DEPTH = 'standard';
const OUTPUT_DIR = join(process.cwd(), 'output');

const DEPTH = {
  quick:    { commits: 10,  issues: 25,  prs: 10,  pages: 2  },
  standard: { commits: 30,  issues: 50,  prs: 20,  pages: 5  },
  deep:     { commits: 100, issues: 200, prs: 50,  pages: 10 }
};

// ─── Utils ───────────────────────────────────────────────────────────────
function log(msg) { console.log(`[repo-scan] ${msg}`); }
function error(msg) { console.error(`[repo-scan] ERROR: ${msg}`); process.exit(1); }

function parseRepoUrl(url) {
  const m = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (!m) error(`Invalid GitHub URL: ${url}`);
  return { owner: m[1], repo: m[2], fullUrl: url.replace(/\.git$/, '') };
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log(`Usage: node scan-repo.mjs <repo-url> [branch] [depth]
  depth: quick | standard (default) | deep`);
    process.exit(0);
  }
  return {
    url: args[0],
    branch: args[1] || DEFAULT_BRANCH,
    depth: DEPTH[args[2]] ? args[2] : DEFAULT_DEPTH
  };
}

async function githubFetch(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'repo-scanner/1.0'
  };
  if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;

  const res = await fetch(url, { headers });

  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    const resetAt = parseInt(res.headers.get('x-ratelimit-reset') || '0') * 1000;
    const wait = Math.ceil((resetAt - Date.now()) / 1000) + 5;
    if (wait > 0 && wait < 3600) {
      log(`Rate limited. Waiting ${wait}s...`);
      await new Promise(r => setTimeout(r, wait * 1000));
      return githubFetch(path, opts);
    }
  }

  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getAllPages(urlPath, maxPages) {
  const results = [];
  let page = 1;
  while (page <= maxPages) {
    const sep = urlPath.includes('?') ? '&' : '?';
    const data = await githubFetch(`${urlPath}${sep}page=${page}&per_page=100`);
    if (!Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return results;
}

function daysAgo(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function getStaleness(days) {
  if (days === null) return 'unknown';
  if (days < 3) return 'very active';
  if (days < 14) return 'active';
  if (days < 60) return 'moderate';
  if (days < 180) return 'stale';
  return 'very stale';
}

function formatDate(iso) {
  if (!iso) return 'Never';
  return new Date(iso).toISOString();
}

// ─── Main Scanner ────────────────────────────────────────────────────────

async function scanRepo({ url, branch, depth }) {
  const { owner, repo, fullUrl } = parseRepoUrl(url);
  const config = DEPTH[depth];

  log(`Scanning ${owner}/${repo} (branch: ${branch}, depth: ${depth})`);

  // 1. Repo info
  log('Fetching repository metadata...');
  const repoInfo = await githubFetch(`/repos/${owner}/${repo}`);

  // 2. Branches
  log('Fetching branches...');
  const branches = await getAllPages(`/repos/${owner}/${repo}/branches?per_page=100`, 3);

  // 3. Commits
  log(`Fetching commits (limit: ${config.commits})...`);
  const commits = await getAllPages(
    `/repos/${owner}/${repo}/commits?sha=${branch}&per_page=100`,
    Math.ceil(config.commits / 100)
  );

  // 4. Pull requests
  log('Fetching pull requests...');
  const openPRs = await getAllPages(
    `/repos/${owner}/${repo}/pulls?state=open&sort=updated&direction=desc&per_page=100`,
    Math.ceil(config.prs / 100)
  );
  const mergedPRs = await getAllPages(
    `/repos/${owner}/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
    2
  );
  const recentlyMerged = mergedPRs
    .filter(p => p.merged_at && daysAgo(p.merged_at) < 7)
    .slice(0, 10);

  // 5. Issues
  log('Fetching issues...');
  const issues = await getAllPages(
    `/repos/${owner}/${repo}/issues?state=open&sort=created&direction=desc&per_page=100`,
    Math.ceil(config.issues / 100)
  );
  const realIssues = issues.filter(i => !i.pull_request);

  // 6. Releases
  log('Fetching releases...');
  const releases = await getAllPages(`/repos/${owner}/${repo}/releases?per_page=20`, 2);

  // 7. Contributors
  log('Fetching contributors...');
  const contributors = await getAllPages(`/repos/${owner}/${repo}/contributors?per_page=100`, 2);

  // Build output
  const weekCommits = commits.filter(c => daysAgo(c.commit?.committer?.date || c.commit?.author?.date) < 7).length;
  const monthCommits = commits.filter(c => daysAgo(c.commit?.committer?.date || c.commit?.author?.date) < 30).length;

  const output = {
    meta: {
      owner, repo, branch, fullUrl,
      scannedAt: new Date().toISOString(),
      depth
    },
    repo: {
      name: repoInfo.name,
      description: repoInfo.description,
      stars: repoInfo.stargazers_count,
      forks: repoInfo.forks_count,
      watchers: repoInfo.watchers_count,
      visibility: repoInfo.visibility,
      license: repoInfo.license?.name || null,
      language: repoInfo.language,
      defaultBranch: repoInfo.default_branch,
      createdAt: formatDate(repoInfo.created_at),
      updatedAt: formatDate(repoInfo.updated_at),
      archived: repoInfo.archived,
      openIssues: repoInfo.open_issues_count
    },
    activity: {
      commitsThisWeek: weekCommits,
      commitsThisMonth: monthCommits,
      totalCommitsAnalyzed: commits.length,
      staleness: getStaleness(daysAgo(repoInfo.updated_at))
    },
    branches: branches.map(b => ({
      name: b.name,
      protected: b.protected,
      sha: b.commit?.sha?.slice(0, 7) || null
    })),
    commits: commits.map(c => ({
      sha: c.sha?.slice(0, 7) || null,
      message: (c.commit?.message || '').split('\n')[0].slice(0, 80),
      author: c.author?.login || c.commit?.author?.name || 'Unknown',
      date: formatDate(c.commit?.committer?.date || c.commit?.author?.date)
    })),
    pullRequests: {
      open: openPRs.map(p => ({
        number: p.number,
        title: p.title,
        author: p.user?.login,
        createdAt: formatDate(p.created_at),
        draft: p.draft,
        branch: p.head?.ref
      })),
      count: openPRs.length,
      recentlyMerged: recentlyMerged.map(p => ({
        number: p.number,
        title: p.title,
        author: p.user?.login,
        mergedAt: formatDate(p.merged_at),
        branch: p.head?.ref
      }))
    },
    issues: {
      items: realIssues.map(i => ({
        number: i.number,
        title: i.title,
        labels: (i.labels || []).map(l => typeof l === 'string' ? l : l.name),
        author: i.user?.login,
        createdAt: formatDate(i.created_at),
        age: daysAgo(i.created_at)
      })),
      count: realIssues.length
    },
    releases: releases.slice(0, 10).map(r => ({
      tag: r.tag_name,
      name: r.name,
      publishedAt: formatDate(r.published_at),
      prerelease: r.prerelease
    })),
    contributors: contributors.slice(0, 15).map(c => ({
      login: c.login,
      contributions: c.contributions
    }))
  };

  // Save
  if (!globalThis.__skipWrite__) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const outPath = join(OUTPUT_DIR, `repo-scan-${owner}-${repo}.json`);
    writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
    log(`Saved to ${outPath}`);
    return { output, outPath };
  }

  return { output, outPath: null };
}

// ─── Entry Point ─────────────────────────────────────────────────────────

async function main() {
  if (!GITHUB_TOKEN) {
    console.warn('[repo-scan] WARN: No GITHUB_TOKEN set. Rate limit: 60 req/hour.');
  }
  const args = parseArgs();
  const { output, outPath } = await scanRepo(args);
  if (outPath) {
    console.log(`\n✅ Repo scan complete: ${outPath}`);
  }
  return output;
}

// Export for programmatic use
export { scanRepo };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => { error(e.message); });
}
