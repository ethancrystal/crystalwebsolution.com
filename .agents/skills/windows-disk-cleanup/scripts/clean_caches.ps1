# clean_caches.ps1 -- delete contents of safe, regenerating caches. Non-admin.
# Reports before/after free space. Remove-Item -Force bypasses the Recycle Bin (immediate reclaim).
# CRITICAL: excludes the active agent session folder under %TEMP% so it does not delete its own running scripts.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File clean_caches.ps1 [-TempExclude claude] [-IncludeClaudeInternal]
param(
  [string[]]$TempExclude = @('claude'),       # top-level %TEMP% subfolders to preserve (active session lives here)
  [switch]$IncludeClaudeInternal              # also clear .claude plugins cache + downloads (regenerate / re-download)
)
$ErrorActionPreference = 'SilentlyContinue'
$before = (Get-PSDrive C).Free

function Clear-DirContents([string]$path, [string[]]$exclude) {
  if (-not (Test-Path -LiteralPath $path)) { Write-Output ("  skip (missing): " + $path); return }
  $n = 0
  Get-ChildItem -LiteralPath $path -Force -EA SilentlyContinue |
    Where-Object { $exclude -notcontains $_.Name } |
    ForEach-Object {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force -EA SilentlyContinue
      if (-not (Test-Path -LiteralPath $_.FullName)) { $n++ }
    }
  Write-Output ("  cleared {0} items from {1}" -f $n, $path)
}

Write-Output "===== CLEAN CACHES ====="
Clear-DirContents $env:TEMP $TempExclude                  # preserve active session
Clear-DirContents "$env:WINDIR\Temp" @()
Clear-DirContents "$env:LOCALAPPDATA\npm-cache" @()
Clear-DirContents "$env:LOCALAPPDATA\pip\Cache" @()
Clear-DirContents "$env:LOCALAPPDATA\pnpm\store" @()
Clear-DirContents "$env:LOCALAPPDATA\Yarn\Cache" @()
Clear-DirContents "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache" @()
Clear-DirContents "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache" @()
Clear-DirContents "$env:USERPROFILE\.codex\cache" @()
Clear-DirContents "$env:USERPROFILE\.grok\cache" @()
Clear-DirContents "$env:USERPROFILE\.claude\paste-cache" @()
if ($IncludeClaudeInternal) {
  Clear-DirContents "$env:USERPROFILE\.claude\plugins\cache" @()
  Clear-DirContents "$env:USERPROFILE\.claude\downloads" @()
}

$after = (Get-PSDrive C).Free
Write-Output ("===== reclaimed {0} GB | free now {1} GB =====" -f [math]::Round(($after-$before)/1GB,2), [math]::Round($after/1GB,2))
Write-Output "DONE_CACHES"
