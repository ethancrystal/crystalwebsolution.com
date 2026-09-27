---
description: Picks the next vX.NN release number, bumps VERSION, and adds the top CHANGELOG.md entry for a PR to main. Use when preparing a PR to main or asked to bump the version. Do NOT use for package.json versions or tagging.
argument-hint: summary of the change
allowed-tools: Bash(git log:*), Bash(gh pr list:*), Read, Edit
---

# Version Bump

Give this branch the next unused `vX.NN` and record it.

## Context

- Current file: !`cat VERSION`
- Merged to main: !`git log --oneline -15 origin/main`
- Open PRs to main: !`gh pr list --base main --state open --json number,title,headRefName`

## Steps

1. Take the highest `vX.NN` named in the merge log, `VERSION`, or the top `CHANGELOG.md` heading.
2. Skip a higher number an open PR from another branch already claims. Ignore stale PRs below it.
3. The next version is that number plus `0.01`, zero-padded.
4. Write it to `VERSION` with a trailing newline.
5. Add `## vX.NN — <today YYYY-MM-DD>` at the top of `CHANGELOG.md`, summarising `$ARGUMENTS` in the existing entry style.
6. Leave `package.json` untouched.
7. Print the PR title to use: `vX.NN — <summary>`.
