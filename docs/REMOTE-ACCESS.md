# CD Sportswear USA: Remote Access and Recovery

This repository is the portable source of truth for the CD Sportswear USA application. The current `main` branch is hosted on GitHub, while the CRM’s application data and database schema are held in the configured Supabase project. Linear and the related Manus task conversations remain available through the same authenticated accounts.

## What is available from another PC

| Asset | Remote location | How to resume |
| --- | --- | --- |
| Application source, tests, migrations, and tracked documentation | GitHub repository `ethancrystal/crystalwebsolution.com` | Clone the repository and check out `main` |
| CRM database, authentication, storage, and production records | Supabase project configured for the application | Restore the project’s environment values securely; never commit secrets |
| Project updates and implementation plan | Linear project | Sign in to the same Linear workspace |
| Prior agent conversations and referenced task history | The same Manus account | Sign in to the same account and open the referenced tasks |
| Dependencies and build output | Recreated locally | Run `pnpm install --frozen-lockfile` |
| Environment secrets | Secure password manager or original PC | Restore into local environment files; do not put them in GitHub |
| Git stashes and local-only branches | Original checkout unless exported | Create a Git bundle if those historical states must be portable |

## Setup on another PC

Install Git, Node.js, and pnpm. Then run:

```bash
git clone https://github.com/ethancrystal/crystalwebsolution.com.git
cd crystalwebsolution.com
git checkout main
pnpm install --frozen-lockfile
pnpm dev
```

Restore the application’s environment variables from the secure source of record before starting the app. The tracked `README.md` documents the routes, tests, migrations, and architecture constraints.

## Preserving local-only Git history

The ordinary application history is already portable through GitHub. If the original PC contains important uncommitted work, local branches, or stashes, export them from that PC before replacing or discarding it:

```bash
git status --short --branch
git branch --all
git stash list
git bundle create crystal-web-solution-recovery.bundle --all
```

Store the bundle in a private, encrypted location. Do not commit `.env.local`, private keys, browser profiles, or local agent settings to the repository.

## Current verified state

The audited checkout is clean, has one authoritative worktree, and its local `main` commit matches `origin/main`. The authoritative local checkout documented by the prior audit was `C:\Users\moizjmj\CD Sportswear USA`.

Verify a checkout with:

```bash
git status --short --branch
git fetch origin --prune
git rev-parse HEAD
git rev-parse origin/main
```

The final two hashes should match when the checkout is synchronized.

## Resuming the work

From another PC, sign in to the same Manus account to recover the referenced conversations, open the Linear CRM project for the current plan, and clone this repository for the source code. Restore environment variables securely and use the existing Supabase project rather than creating a second database.

> The repository, Supabase project, Linear workspace, and Manus account are separate systems. Keeping the same account and remote project identifiers is what makes the work accessible across PCs; copying only the local project folder is not sufficient.

## References

- [Git documentation: git-clone](https://git-scm.com/docs/git-clone)
- [Git documentation: git-bundle](https://git-scm.com/docs/git-bundle)
- [Supabase documentation](https://supabase.com/docs)
- [Linear documentation](https://linear.app/docs)
- [Manus](https://manus.im/)

*Prepared by Manus AI. This guide contains no credentials.*

*Last verified against repository state: 2026-08-17.*
