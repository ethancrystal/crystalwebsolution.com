---
name: obsidian-vault-ops
description: Operate an Obsidian vault safely through Claude Code using Obsidian's official command-line interface. Use whenever the user wants to read, search, create, edit, append to, move, rename, tag, or reorganize notes in an Obsidian vault; bootstrap a vault for agentic work; generate a vault CLAUDE.md; run recurring maintenance such as broken-link sweeps, orphan cleanup, or frontmatter normalization; or wire Obsidian into an automation. Trigger even when only implied — phrases like "my vault", "my notes", "my second brain", "daily note", "add this to Obsidian", "organize my notes", "fix my wikilinks", "clean up my vault", or pointing at a folder of markdown notes. The rule it enforces is to route any operation touching links, frontmatter, or file location through the official obsidian CLI, which keeps wikilinks intact, and fall back to direct file edits only for in-place body text. Never use plain mv or rm or raw rewrites on a vault — that silently breaks links and corrupts the graph.
compatibility: Requires the official Obsidian CLI (Obsidian v1.12.4+ with "Command line interface" enabled in Settings, General) and shell access such as Claude Code. The Obsidian desktop app must be running, since the CLI is a remote control for the running app.
---

# Obsidian Vault Ops

This skill exists to make the Obsidian + Claude Code workflow succeed reliably instead of *mostly* working until it quietly corrupts the vault. The single failure mode that ruins this workflow is broken links: an agent runs `mv note.md other/`, and every `[[note]]` wikilink pointing at it goes dead — sometimes dozens at once, discovered weeks later. The official Obsidian CLI eliminates that failure mode because its operations route through Obsidian's own internal API, so a move updates every backlink automatically. Treat the CLI as the safe interface to the vault and most of the danger disappears.

## The one rule

Route every operation that touches **links, frontmatter, or file location** through the `obsidian` CLI. Use direct file edits (str_replace, etc.) only for in-place changes to a note's *body text* that neither move the file nor alter links. When in doubt, prefer the CLI.

| Intent | Use | Never |
|---|---|---|
| Move or rename a note | `obsidian move ...` | shell `mv` (breaks backlinks) |
| Delete a note | `obsidian` delete command (confirm with the user first) | shell `rm` |
| Create a note, especially a linked one | `obsidian create ...` | hand-writing a file that should be linked but isn't |
| Append to today's daily note | `obsidian daily:append ...` | locating + editing the dated file by hand |
| Set / change a frontmatter property | `obsidian property:set ...` | regex-rewriting YAML (corrupts notes with no/partial frontmatter) |
| Search the vault | `obsidian search query="..." format=json` | grep alone (misses Obsidian's index semantics) |
| Read a note's resolved content | `obsidian read file="..."` | fine to also read raw with view |
| Edit body text only (no move, no link change) | direct file edit is OK | — |

Exact subcommands and flags live in `references/cli-command-reference.md`. The CLI surface evolves between releases — when unsure of a flag, run `obsidian help` or `obsidian help <command>` rather than guessing.

## Preflight — run before any session that will modify the vault

These take seconds and prevent the two most common ways the workflow breaks. Report results briefly, then proceed.

1. **CLI present?** Run `obsidian help`. If the command is missing, stop and tell the user to enable it: Settings, General, "Command line interface," then add the binary to PATH and restart the shell. Do not silently fall back to raw file operations — that defeats the entire point of this skill.
2. **App running?** The CLI drives the running Obsidian app; if it is closed the command will launch it, which is fine but slower. Expect a brief startup on the first call.
3. **Git clean?** A vault under git is the user's undo button. If the vault is a git repo, confirm the working tree is clean before a batch of changes so the diff afterward is legible and revertible. If it is not a repo, offer to initialize one (see Setup).
4. **Sync active?** If Obsidian Sync, iCloud, or Dropbox is touching the folder, warn that simultaneous writes during a large batch can create conflict copies. Suggest pausing sync for big reorganizations.

## First-time setup (bootstrapping a vault)

When the user is setting up a vault for agentic work for the first time, or asks to "set up", "bootstrap", or "prepare" a vault:

1. Run the bootstrap routine in `assets/bootstrap-prompt.md`. It probes capabilities, surveys conventions without reading the whole vault, establishes a git baseline, writes a vault `CLAUDE.md`, and — critically — runs a live smoke test that proves a move keeps a wikilink intact before declaring success. Do not skip the smoke test; an unverified setup is the thing that fails later.
2. Drop `assets/vault-CLAUDE.md` at the vault root as the starting `CLAUDE.md`, edited to match the conventions actually detected (frontmatter schema, tag style, daily-note path and date format, link style, folder scheme). That file is what makes *future* sessions behave correctly without re-explaining, so invest in getting it right.
3. Leave the vault otherwise unchanged. Surface a prioritized list of hygiene fixes (see maintenance) and let the user choose which to run — do not reorganize unprompted.

## Conventions to respect in every vault

Detect these from the existing vault rather than imposing defaults, and record them in the vault's `CLAUDE.md`:

- **Links:** use `[[wikilinks]]` for internal references, not standard markdown links, unless the vault clearly uses the latter. Obsidian's graph depends on this.
- **Frontmatter:** match the existing YAML schema (title, date, tags, status, whatever the vault uses). Set properties via the CLI so notes with missing or partial frontmatter are handled correctly.
- **Tags:** match the vault's convention — frontmatter `tags:` vs inline `#tag`, and the existing casing/nesting style.
- **Daily notes:** match the configured folder and date format exactly; append via the CLI rather than guessing the dated filename.
- **Structure:** prefer flat over deeply nested. Deep paths cost context tokens on traversal and buy little. Flag any nesting deeper than ~3 levels rather than deepening it.
- **`.obsidian/` is off-limits.** It holds app config and workspace state, not content. Never modify, create, or reorganize anything inside it. Exclude `.obsidian/workspace*` from git.
- **Keep the graph connected.** When creating a note, link it to related existing notes. An orphan note is a note the user will never find again.

## Safety and reversibility

- **Git first.** Before a batch of structural changes, ensure a clean committed baseline. Afterward, the user reviews the diff and either keeps it or runs a single revert. This is the safety net that makes aggressive reorganization low-risk.
- **Confirm before deletions.** Deleting notes is destructive even through the CLI. Always confirm the specific files with the user first, and never bulk-delete on a vague instruction.
- **Batch, then verify.** After any set of moves/renames, run the broken-link check (below) and report the result. Do not consider a reorganization done until links are confirmed intact.
- **Pause sync for big jobs.** Concurrent sync writes during a large batch cause conflict copies; pausing avoids a cleanup headache.

## Verify after structural changes

After moving, renaming, or deleting notes, check for damage and report it plainly:

```bash
obsidian unresolved        # lists links that no longer resolve
```

If anything broke, fix it through the CLI (or revert via git) before telling the user the job is complete. A silent broken link is worse than a visible error.

## Recurring maintenance

For ongoing vault health — broken-link sweeps, orphan-note detection, frontmatter normalization, tag consolidation, daily/weekly rollups — follow `references/maintenance-playbook.md`. Run these as explicit, reviewable passes (propose, get approval, execute through the CLI, verify), not as silent background edits.

## Unattended and server use

The CLI normally needs the Obsidian desktop app running. For automation with no GUI — scheduled rollups, agent access to a vault without access to the user's whole machine, server-side processing — Obsidian's **Headless Sync** runs Sync without a GUI on a server. Point the user there for cron jobs and remote agents; it is a different setup from the interactive desktop case and worth calling out explicitly rather than trying to force the desktop CLI into a headless role.

## A note on the evolving CLI

The official CLI went generally available in Obsidian v1.12.4 and is still gaining commands. Treat `references/cli-command-reference.md` as a strong starting map, but when a command or flag is uncertain, confirm against the installed version with `obsidian help` or `obsidian help <command>` before running it. Accuracy on the exact invocation matters more here than speed — a wrong flag on a mutating command is how things break.
