# Version Bump

Give this branch the next unused `vX.NN` and record it. Not for `package.json` versions or tagging.

## Steps

1. Run `cat VERSION`, `git log --oneline -15 origin/main`, and `gh pr list --base main --state open --json number,title,headRefName`.
2. Take the highest `vX.NN` named in the merge log, `VERSION`, or the top `CHANGELOG.md` heading.
3. Skip a higher number an open PR from another branch already claims. Ignore stale PRs below it.
4. The next version is that number plus `0.01`, zero-padded.
5. Write it to `VERSION` with a trailing newline.
6. Add `## vX.NN — <today YYYY-MM-DD>` at the top of `CHANGELOG.md`, summarising `$ARGUMENTS` in the existing entry style.
7. Leave `package.json` untouched and print the PR title `vX.NN — <summary>`.
