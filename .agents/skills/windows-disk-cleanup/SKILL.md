---
name: "windows-disk-cleanup"
description: "Calculated, recon-first cleanup of a full Windows C: drive. Measures disk usage first, then reclaims space by clearing regenerating caches (Temp, npm/pip/pnpm/yarn, Chrome/Edge, tool caches), pruning duplicate config backups (Claude/Codex/Grok), sweeping dead engineering-project debris (node_modules, venvs, build outputs, coverage, stale logs, orphaned temp files) across both home roots, fully removing Docker Desktop (its WSL distro + multi-GB data vhdx and all containers/images), and optionally compacting a WSL distro's vhdx. Use when the user asks to clean up or free space on C:, says the disk is full/low on space, wants to clear caches, clean up after a messy software project, remove Docker and its containers/images, or remove duplicate backups on a Windows machine. Windows + PowerShell only; some steps need admin (UAC)."
---

# Windows Disk Cleanup

A recon-first workflow to reclaim space on a full `C:` drive. Never delete blind — measure, present a plan with sizes, then execute in phases. All scripts are in `scripts/` (PowerShell).

## Hard rules (read first)

- **Recon before deletion.** Run `scripts/recon.ps1` and show the user the sizes + plan before removing anything.
- **WSL safety.** Docker's distro is named exactly `docker-desktop`. NEVER `wsl --unregister` any other distro — the user's real distro (e.g. `Ubuntu`) holds live data. `scripts/remove_docker.ps1` only targets `docker-desktop`; verify the distro list before and after.
- **Don't disable security to save space.** If `powercfg /a` reports hibernation disabled by **"Guarded Host"**, the machine runs VBS/Hyper-V and `hiberfil.sys` (~6 GB) cannot be reclaimed without disabling virtualization-based security. Do not do that. Report it and move on.
- **Confirm the irreversible step.** Removing Docker permanently deletes all local images/containers/volumes. Proceed only with explicit user authorization (the task itself usually is the authorization).
- **Never follow symlinks/junctions.** On this machine `C:\home\<user>\.claude` is a symlink to `C:\Users\<user>\.claude` (live agent config). Following reparse points double-counts and — worse — double-deletes live data. Every recursive scan/delete in this skill checks `ReparsePoint` and skips.
- **Ghost profiles are confirm-tier.** Dead provisioning identities (e.g. `C:\Users\Tesla Laptops`, `C:\home\tesla_laptops`) are reported by recon but never scripted for deletion — removing a profile dir needs explicit user confirmation and usually admin.

## Ground truth: this machine has TWO home roots

- `C:\Users\<user>` — native Windows home (config, dotfiles, AppData, some repos)
- `C:\home\<user>` — legacy WSL-bridge home holding the **active projects** (TTML, Real-Estate-Distress-Signal, GNZ, Obsidian vault, ...)

Both roots accumulate project debris independently; the debris scripts scan both by default. The Obsidian vault and anything modified within `-MinAgeDays` (default 30) is treated as live and skipped.

## Why free space can DROP during cleanup (expect this)

WSL2 and app VM disks (`ext4.vhdx`, `rootfs.vhdx`, Docker's `docker_data.vhdx`) are **dynamically expanding and never auto-shrink**. While the machine is in use they grow on write, so the live "free space" number can fall even as you delete gigabytes. Always measure free space before/after each phase (the scripts do this) and explain net vs. gross to the user. A negative "reclaimed" number usually means a vhdx grew concurrently, not that deletion failed — confirm with `recon.ps1`'s large-disk section.

## Running PowerShell via Desktop Commander (important gotchas)

If asked to "use Desktop Commander" (or any nested-shell runner):
- **Inline `$_`/`$env:` get mangled** by the outer shell. Don't pass complex one-liners — run the bundled **script files** instead.
- **Long deletes outlive the MCP call timeout.** Launch detached and poll a log file:
  ```
  cmd /c start /b powershell -NoProfile -ExecutionPolicy Bypass -File "<script>.ps1" > "<log>.txt" 2>&1
  ```
  Then poll `<log>.txt` for the script's `DONE_*` marker. Output is UTF-16 — strip nulls when reading (`tr -d '\000'`).

## Workflow

### 1. Recon
Run `scripts/recon.ps1` (redirect to a file; it scans recursively and can take a minute):
```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/recon.ps1 > recon.txt 2>&1
```
It reports: C: free, Docker footprint + distros, cache sizes, duplicate backups, and the large VM/WSL vhdx files (so you know what NOT to touch and can explain free-space drift). Present a phased plan with sizes and the expected total reclaim.

### 2. Phase 1 — Caches (non-admin, safe, regenerate)
```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/clean_caches.ps1
```
- Pass `-TempExclude claude` (default) to **preserve the active agent session's `%TEMP%` subfolder** — otherwise you delete your own running scripts mid-cleanup.
- Add `-IncludeClaudeInternal` only if the user wants `.claude\plugins\cache` + `.claude\downloads` cleared (they re-download; skipping avoids disrupting a live Claude session).

### 3. Phase 2 — Duplicate backups (non-admin, tidiness)
```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prune_backups.ps1            # dry run
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prune_backups.ps1 -Apply     # delete
```
Keeps the **newest** backup in each group as a safety copy; removes older duplicates + orphaned `*.tmp.*` atomic-write files. Single (non-duplicate) backups are kept. Always dry-run first and show the list.

### 4. Phase 3 — Remove Docker (the big reclaim)
```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/remove_docker.ps1
```
Unregisters `docker-desktop` and deletes `AppData\Local\Docker` (the large `docker_data.vhdx`), `AppData\Roaming\Docker`, and Docker Desktop folders. `Program Files\Docker` needs **admin** — run the script elevated (see §6) to clear that remnant, or report it as a tiny leftover. Verify the user's real distro still lists afterward.

### 5. Phase 4 — Engineering project debris (the messy-project aftermath)
The dead weight a software project leaves behind: `node_modules/`, Python venvs, build outputs, coverage dirs, bundler caches, `.codex-*.log` sprawl, oversized logs, orphaned `*.tmp.*` files, and stale `claude-backup-*` dirs. Two-step, dry-run-first:
```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/scan_project_debris.ps1 > debris.txt 2>&1   # read-only scan
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/clean_project_debris.ps1                     # dry run
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/clean_project_debris.ps1 -Apply              # delete
```
- Scans **both home roots** by default; pass `-SearchRoots` to narrow.
- **`-MinAgeDays 30`** (default) is the live-project guard — anything modified more recently is skipped. Raise it if the user is nervous, lower it only on explicit request.
- `dist`/`build`/`out` are only deleted when a project marker (`package.json`, `pyproject.toml`, etc.) sits beside them; unverified ones are reported as `unverified-build` and left alone.
- **Never scripted:** ghost profiles, ` - Copy` duplicates (`copy-dupes` — show the user the list, let them decide). **Opt-in flags:** `-IncludeGlobalCaches` (Maven/Gradle/Cargo/Go/HuggingFace/Puppeteer/Firebase/Chocolatey — safe but re-download on next use), `-IncludeStaleBackups` (`claude-backup-*` dirs — confirm with user first).
- With `-Apply` it also runs `docker builder prune -f` if Docker is on PATH.
- Show the user the scan output (category totals + per-item list) and get a nod before `-Apply`. Completion markers: `DONE_SCAN_DEBRIS`, `DONE_DEBRIS`.

### 6. Optional admin levers (UAC prompt)
Elevation: launch from a non-admin shell and have the user approve UAC. Log to a file and poll for `DONE_*`:
```powershell
Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','"<elevated-script>.ps1"'
```
- **Compact a WSL vhdx** — `scripts/compact_wsl_vhdx.ps1 -Distro Ubuntu` (elevated). Reclaims only unused/zeroed blocks; for more, `sudo fstrim -a` inside the distro first. The script stops the WSL service (which holds the vhdx handle) before `diskpart compact` — `wsl --shutdown` alone is insufficient.
- **Finish Docker remnant** — run `remove_docker.ps1` elevated, or `Remove-Item "$env:ProgramFiles\Docker" -Recurse -Force`.
- **Hibernation** — only if `powercfg /a` does NOT say "Guarded Host": `powercfg /h off` reclaims `hiberfil.sys`. Otherwise skip (see Hard rules).

### 7. Report
Give a before→after free-space number and a per-phase breakdown (gross deleted vs. net reclaimed). Note anything left behind and why (admin-blocked, security-protected, or live data deliberately preserved).

## Notes
- `Remove-Item -Force` bypasses the Recycle Bin → space frees immediately.
- `pagefile.sys` (often 15-20 GB) is system-managed; do not shrink it for cleanup.
- The user's real WSL distro vhdx and any running app VM bundle (e.g. a Claude desktop `claudevm.bundle`) are live data — never delete them; compaction is the only safe lever.
