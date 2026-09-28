---
name: repo-scanner
description: "Scan a GitHub repository via API to extract branches, commits, PRs, issues, releases, and contributors. Outputs a JSON snapshot for downstream tooling. Use when you need repository metadata, activity metrics, or project health signals without cloning code."
version: 1.0.0
---

# Repo Scanner

Fetches live repository metadata from GitHub's API and exports a structured JSON snapshot. Fast, no-code-clone required.

## When to Use

- Need repository health/activity overview
- Want branch, PR, issue counts without downloading code
- Feeding repo metadata into another tool or document
- Comparing multiple repositories quickly

## Requirements

- `GITHUB_TOKEN` environment variable (PAT with `repo` scope for private repos)
- Node.js 18+

## Workflow

### Step 1: Run Scanner

```bash
node scripts/scan-repo.mjs <repo-url> [branch] [depth]
```

| Arg | Default | Description |
|-----|---------|-------------|
| repo-url | — | Full GitHub URL |
| branch | main | Branch to focus commits on |
| depth | standard | quick (10 commits) / standard (30) / deep (100) |

### Step 2: Consume Output

The scanner writes `output/repo-scan-[owner]-[repo].json` containing:

```json
{
  "meta": { "owner", "repo", "branch", "scannedAt", "depth" },
  "repo": { "name", "description", "stars", "forks", "visibility", "license", "createdAt", "updatedAt" },
  "activity": { "commitsThisWeek", "commitsThisMonth", "staleness" },
  "branches": [{ "name", "protected", "sha" }],
  "commits": [{ "sha", "message", "author", "date" }],
  "pullRequests": { "open": [...], "recentlyMerged": [...] },
  "issues": [{ "number", "title", "labels", "author", "age" }],
  "releases": [{ "tag", "published", "body" }]
}
```

## Scripts

- [scan-repo.mjs](scripts/scan-repo.mjs) — Main scanner. Fetches GitHub API data and writes JSON.

## References

- [GitHub API Patterns](references/github-api-patterns.md) — Rate limits, pagination, auth
- [Output Schema](references/output-schema.md) — Full JSON schema documentation

## Integration

Pipe the JSON output into [codebase-archaeologist](skill:codebase-archaeologist) for full code analysis, or into [project-flow-documenter](skill:project-flow-documenter) to generate the final document.

```bash
# Full pipeline example
node repo-scanner/scripts/scan-repo.mjs https://github.com/acme/portal
node codebase-archaeologist/scripts/analyze-code.mjs https://github.com/acme/portal
node project-flow-documenter/scripts/generate-doc.mjs \
  --scan output/repo-scan-acme-portal.json \
  --code output/code-analysis-acme-portal.json \
  --out output/project-flow-acme-portal.md
```
