# Worktree State

Last audited: 2026-08-02

## Canonical checkout

- Path: `C:\Users\moizjmj\Crystal Web Solution`
- Branch: `main`
- Cleanup base: `c5a922f91b460f1a4aa73db2839d08c0cfc9a728`
- Remote check at cleanup start: `origin/main` resolved to the same commit
- Final retained inventory before commit: one worktree, 45 local branch refs,
  and 10 stashes

This is the only authoritative local checkout. Confirm the branch, commit,
and dirty state here before reusing evidence from another branch or worktree.
There are no linked worktrees after this cleanup. Create a new isolated
worktree deliberately if recovery or branch-specific work is needed later.

The canonical checkout had four migration alternatives/edits under review:

- modified `supabase/migrations/0007_notes_creation_scoping.sql`
- untracked `supabase/migrations/0009_safe_project_realtime_crm.sql`
- untracked `supabase/migrations/0009b_drop_legacy_project_message_tables.sql`
- untracked `supabase/migrations/0009c_canonical_project_schema.sql`
- untracked local Claude settings

After a dedicated migration audit and explicit approval, `0007` was restored
byte-for-byte to its committed historical form and the three untracked `0009`
alternatives were removed. They were superseded, two had invalid nonnumeric
Supabase migration versions, and the remaining file collided with canonical
version `0009`. Canonical migrations `0009_project_realtime_crm.sql`,
`0010_project_workspace.sql`, and `0011_workspace_hardening_from_main.sql`
were retained unchanged. Local `.claude/settings.local.json` remains local and
is now explicitly ignored by this repository.

## Cleanup performed

The original local inventory contained 20 registered worktrees: the canonical
`main` checkout plus 19 linked worktrees removed during the first cleanup
passes. One additional linked worktree then appeared during the final
confirmation window at `.claude/worktrees/suspicious-moore-190bc1`, bringing
the total distinct worktrees encountered to 21 and the total removed to 20.
It was clean, one commit behind `main`, had zero unique commits, and was removed
after the amended manifest was explicitly approved. The repository ended with
only the canonical checkout. These removals included
branches already contained in `main`, an exact duplicate, and five approved
divergent legacy snapshots. Every branch ref was deliberately preserved.

No merge, rebase, cherry-pick, reset, branch deletion, stash deletion, or
deployment was performed. Cleanup began from `c5a922f`, which matched the
remote `main`. Only the approved cleanup/auth/documentation checkpoint, after
it passes the tests, production build, browser regression checks, and final
review, is authorized for push; verify synchronization with the commands below
rather than assuming this document itself proves remote state.

Before removing dirty merged worktrees, their tracked, staged, and untracked
files were saved in named Git stashes. List them with:

```bash
git stash list --grep=worktree-cleanup-2026-08-01
```

Preserved stash commits:

| Source checkout | Stash commit |
| --- | --- |
| `file-directory-replacement-e48863` | `421bce3d0dc6a5338e2d9d202566e9030827eb7f` |
| `directory-remote-sync-38d795` | `0b8802d1c19d7f0f36a694c67063df42f6f7aaa1` |
| `seo-on-page-foundation` | `2175691dc07c7c413ab9a02406e8e0f9b6ea8dfd` |
| `contentistic` | `8bfc8879724affc6211c35570e2c4e75c937cf7a` |
| `crm-completion` | `c9363c3e67d0c02a472cb3a20f2810e5cc95f4f6` |
| `new-changes` | `553b7f9bb340a5a3349be8a46c13f5d26d33c3fa` |
| `newchanges` | `787a3ec470d53a50820583945af3026550edee21` |
| detached `main-build-check` | `86fe6ef710ca0c98d551b1defeaadb1865d1db9e` |

The table records the eight stashes created specifically for worktree cleanup.
Two earlier stashes were also retained unchanged, so the final total is 10:

| Earlier stash source | Stash commit |
| --- | --- |
| `claude/21st-services-approach-glow` | `cca91a29815e48314cdc8fed2c31a79dba19c253` |
| `perf-and-showcase-contrast` | `400f80998e74ab7382184c38ab7a9d025a47fb93` |

Inspect a saved state before applying it:

```bash
git stash show --stat <stash-commit>
git stash show --patch <stash-commit>
```

Apply recovery work only in a deliberately created branch/worktree. Do not
apply these stashes directly onto a dirty `main` checkout.

## Preserved divergent branch history

The five divergent checkout directories were deleted after explicit approval,
but each exact HEAD remains reachable through a local branch ref.

| Removed checkout | Preserved HEAD | Relationship to `main` at audit |
| --- | --- | --- |
| `.claude/worktrees/CRM` | `787a982` | 91 commits behind, 2 unique commits |
| `.claude/worktrees/file-directory-replacement-e48863` | `a80319c` | unrelated/obsolete replacement history; 5 unique commits |
| `.claude/worktrees/wonderful-lewin-831eb3` | `3688114` | detached old snapshot; 205 behind, 3 unique commits |
| `.worktrees/new-changes` | `67d1032` | 104 behind, 1 unique commit |
| `C:\c\Users\moizjmj\Crystal Web Solution\.claude\worktrees\contentful-merge` | `844eb41` | 88 behind, 3 unique commits |

The removed `newchanges` checkout had the same HEAD and byte-identical Hermes
attachments as `new-changes`. Its branch ref and named recovery stash remain.

## Uncommitted-source audit

Before final deletion, all five registered divergent worktrees were checked
for tracked, staged, and untracked changes. There were no application, test,
migration, configuration, or documentation changes that could aid the current
code. Two transient untracked files were local Claude permission/MCP settings,
not application code.

Six unregistered filesystem remnants were also audited before deletion. Blob
comparison found zero modified tracked files and zero untracked source
candidates in `cool-lichterman-f6ef12`, `priceless-wilbur-6c4422`, and
`wonderful-lewin-831eb3` relative to their preserved branch commits. The
1.5 GB `heuristic-ptolemy-60ac6f` copy had zero modified or untracked source
candidates relative to `main`; its extra size was generated build caches and
dependencies.

A later completion audit found an additional unregistered 153 MB `main-check`
copy. Its differing human-authored files were all older, superseded state:
npm-era README instructions, Next 14/React 18 dependencies, an old lockfile,
and older carousel tests. It had no new source candidates. Three other late
remnants were empty. Together, the removed orphan copies reclaimed roughly
2.5 GB, and their empty `.worktrees` container directories were removed.

## Administrative cleanup

The stale metadata records for `cool-lichterman-f6ef12`,
`priceless-wilbur-6c4422`, and the partially removed
`wonderful-lewin-831eb3` were deleted. Windows deny ACLs inherited by their
parent prevented normal pruning. Cleanup used a temporary ACL window only on
`.git/worktrees`; the parent ACL was reset and its final SDDL was verified to
match the original exactly.

## Verification commands

```bash
git status --short --branch
git worktree list --porcelain
git worktree prune --dry-run --verbose
git stash list --grep=worktree-cleanup-2026-08-01
```

Worktree removal does not delete branch refs. Branch deletion, stash deletion,
merging, and deployment are separate operations and are not part of this
cleanup. A verified cleanup/auth/documentation checkpoint and its final parity
check are the only authorized remote synchronization steps.
