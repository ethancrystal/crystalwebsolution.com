# SEO Branch Isolation and CRM Protection

## Current setup

SEO work lives on the dedicated branch `seo/strategic-seo-actions` in the isolated worktree `/home/ubuntu/worktrees/crystalwebsolution-seo`. The branch was created from `main` at commit `18823a2` and the baseline repository test suite passed with **377 tests and 0 failures** before any SEO changes were made.

The CRM implementation remains a separate workstream. It must not be edited from this SEO worktree, and SEO changes must not be applied directly to the CRM feature branch. The current SEO branch contains no CRM implementation commits beyond what is already present on the authoritative `main` base.

## Operating rules

1. Make SEO-only changes in `/home/ubuntu/worktrees/crystalwebsolution-seo` on `seo/strategic-seo-actions`.
2. Make CRM changes in a separate CRM worktree and branch. Never switch the SEO worktree to the CRM branch or copy CRM files into it.
3. Before each SEO change, run `git status --short --branch` and confirm the branch is `seo/strategic-seo-actions`.
4. Keep SEO commits small and scoped, for example: `seo: improve service-page metadata` or `seo: add internal-link audit notes`.
5. Before opening a pull request, run the full repository test suite, build, `git diff --check`, and a changed-file review. Do not merge if CRM files or migrations appear in an SEO-only diff.
6. Merge SEO through a pull request into `main`; do not merge SEO directly into the CRM feature branch.
7. If SEO and CRM both need to reach production, merge each reviewed branch independently into `main`, resolving conflicts explicitly rather than rebasing one feature over unreviewed work.

## Vercel protection model

The live Vercel project is named `crystalwebsolution` and serves `crystalwebsolution.com` and `www.crystalwebsolution.com`. Its framework is Next.js. The project’s production behavior should remain tied to the repository’s production branch, while the SEO branch is used for preview validation only.

The safe deployment sequence is:

| Stage | Branch or target | Allowed activity |
|---|---|---|
| Development | `seo/strategic-seo-actions` | SEO edits, local tests, and review only. |
| Preview | SEO branch preview deployment | Validate metadata, canonical URLs, structured data, internal links, and rendered pages. No production claims. |
| Production | Reviewed merge to `main` | Deploy only after PR review, full tests/build, SEO diff review, and explicit release approval. |
| CRM | Separate CRM feature branch | CRM implementation and Supabase migration work; never used as the SEO deployment source. |

Do not use a manual production deployment from the SEO worktree. Do not alter Vercel project settings, domains, environment variables, Supabase URLs, or database architecture as part of SEO work. A preview deployment can share the existing database only if the application’s established configuration requires it; SEO changes must not create a second database or change RLS/auth behavior.

## Recommended repository protection

Add branch protection or required pull-request checks on `main` so neither SEO nor CRM can bypass review. Recommended checks are the full test suite, production build, changed-file scope review, and migration/RLS checks when database files are modified. Keep CODEOWNERS or equivalent review ownership role-based if named owners are not yet established.

## Rollback

If an SEO change causes a production regression, revert the specific SEO merge commit on `main` and redeploy through the normal Vercel Git integration. Do not reset or force-push `main`, and do not roll back CRM commits to undo an SEO issue.

## Verification evidence

- Repository baseline: `pnpm test` — 377 passing tests, 0 failures.
- SEO branch: `seo/strategic-seo-actions`.
- SEO worktree: `/home/ubuntu/worktrees/crystalwebsolution-seo`.
- Base commit: `18823a2`.
- Vercel project: `crystalwebsolution`.
- Production domains: `crystalwebsolution.com`, `www.crystalwebsolution.com`.
