# recon.ps1 -- measure a Windows C: drive before deleting anything.
# Prints: disk free, Docker footprint, cache sizes, duplicate backups, large VM/WSL vhdx disks.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File recon.ps1 > recon.txt 2>&1
$ErrorActionPreference = 'SilentlyContinue'

function Get-DirSize($path) {
  if (-not (Test-Path -LiteralPath $path)) { return $null }
  $sum = (Get-ChildItem -LiteralPath $path -Recurse -File -Force -EA SilentlyContinue | Measure-Object Length -Sum).Sum
  if ($null -eq $sum) { return 0 }
  return [math]::Round($sum/1MB,1)
}

Write-Output "===== DISK ====="
$c = Get-PSDrive C
Write-Output ("C: used={0}GB free={1}GB" -f [math]::Round($c.Used/1GB,1), [math]::Round($c.Free/1GB,1))

Write-Output "`n===== DOCKER ====="
$dk = Get-Command docker -EA SilentlyContinue
if ($dk) {
  Write-Output ("docker bin: " + $dk.Source)
  Write-Output ("server: " + (((docker version --format '{{.Server.Version}}') 2>&1) -join ' '))
  (docker system df 2>&1) | ForEach-Object { Write-Output $_ }
} else { Write-Output "docker: NOT FOUND on PATH" }
foreach ($p in @("$env:ProgramFiles\Docker","$env:LOCALAPPDATA\Docker","$env:APPDATA\Docker")) {
  if (Test-Path $p) { Write-Output ("install path: {0}  {1}MB" -f $p, (Get-DirSize $p)) }
}
Write-Output "-- WSL distros (only 'docker-desktop' is Docker's; never remove the user's real distro) --"
(wsl.exe -l -v 2>&1) | ForEach-Object { ($_ -replace "`0","").TrimEnd() } | Where-Object { $_ -ne '' } | ForEach-Object { Write-Output ("  " + $_) }

Write-Output "`n===== CACHES ====="
$caches = [ordered]@{
  'Windows Temp'         = "$env:WINDIR\Temp"
  'User Temp'            = $env:TEMP
  'npm-cache'            = "$env:LOCALAPPDATA\npm-cache"
  'pip Cache'            = "$env:LOCALAPPDATA\pip\Cache"
  'pnpm store'           = "$env:LOCALAPPDATA\pnpm\store"
  'yarn Cache'           = "$env:LOCALAPPDATA\Yarn\Cache"
  'Chrome Cache'         = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
  'Edge Cache'           = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
  '.claude plugins cache'= "$env:USERPROFILE\.claude\plugins\cache"
  '.claude downloads'    = "$env:USERPROFILE\.claude\downloads"
  '.claude paste-cache'  = "$env:USERPROFILE\.claude\paste-cache"
  '.codex cache'         = "$env:USERPROFILE\.codex\cache"
  '.grok cache'          = "$env:USERPROFILE\.grok\cache"
  'HuggingFace cache'    = "$env:USERPROFILE\.cache\huggingface"
  'Puppeteer cache'      = "$env:USERPROFILE\.cache\puppeteer"
  'Firebase cache'       = "$env:USERPROFILE\.cache\firebase"
  'Chocolatey http'      = "$env:USERPROFILE\.chocolatey\http-cache"
}
foreach ($k in $caches.Keys) {
  $p = $caches[$k]
  if (Test-Path $p) { Write-Output ("{0,-22} {1,9}MB  {2}" -f $k, (Get-DirSize $p), $p) }
}

Write-Output "`n===== DUPLICATE BACKUPS (claude/codex/grok configs) ====="
$roots = @("$env:USERPROFILE\.claude","$env:USERPROFILE\.claude\backups","$env:USERPROFILE\.codex","$env:USERPROFILE\.grok","$env:USERPROFILE")
foreach ($r in $roots) {
  Get-ChildItem -LiteralPath $r -Force -File -EA SilentlyContinue |
    Where-Object { $_.Name -match '\.(bak|backup|old)(\b|[-.0-9])' -or $_.Name -match '\.tmp\.' } |
    Sort-Object Name | ForEach-Object {
      Write-Output ("{0,9:N0}KB  {1:yyyy-MM-dd}  {2}" -f ($_.Length/1KB), $_.LastWriteTime, $_.FullName)
    }
}

Write-Output "`n===== LARGE VM / WSL DISKS (do NOT delete live ones; explain free-space drift) ====="
Write-Output "These dynamically-expand on write and never auto-shrink; they can make free space DROP mid-cleanup."
$big = @()
$wslRoot = "$env:LOCALAPPDATA\wsl"
if (Test-Path $wslRoot) { $big += Get-ChildItem $wslRoot -Recurse -File -Force -Filter *.vhdx -EA SilentlyContinue }
$big += Get-ChildItem "$env:LOCALAPPDATA\Packages" -Recurse -File -Force -Filter *.vhdx -EA SilentlyContinue
foreach ($n in @('pagefile.sys','hiberfil.sys','swapfile.sys')) {
  $f = Get-Item "C:\$n" -Force -EA SilentlyContinue
  if ($f) { Write-Output ("{0,9:N0} MB  {1}" -f ($f.Length/1MB), $f.FullName) }
}
$big | Sort-Object Length -Descending | Select-Object -First 12 | ForEach-Object {
  Write-Output ("{0,9:N0} MB  {1}" -f ($_.Length/1MB), $_.FullName)
}

Write-Output "`n===== PROJECT DEBRIS QUICK PASS (counts only -- run scan_project_debris.ps1 for sizes) ====="
# Two home roots on this machine: C:\Users\<user> (config) and C:\home\<user> (active projects).
$debrisRoots = @($env:USERPROFILE)
$wslBridge = "C:\home\$env:USERNAME"
if (Test-Path -LiteralPath $wslBridge) { $debrisRoots += $wslBridge }
$quickNames = @('node_modules','.venv','venv','dist','.next','coverage','__pycache__')
$counts = @{}
function Quick-Count {
  param([string]$Path, [int]$Depth = 0)
  if ($Depth -gt 4) { return }
  Get-ChildItem -LiteralPath $Path -Directory -Force -EA SilentlyContinue | ForEach-Object {
    if ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) { return }   # .claude is symlinked between roots
    if (@('AppData','OneDrive','Windows','.git','.claude','$Recycle.Bin') -contains $_.Name) { return }
    if ($quickNames -contains $_.Name) { $counts[$_.Name] = 1 + [int]$counts[$_.Name]; return }
    Quick-Count -Path $_.FullName -Depth ($Depth + 1)
  }
}
foreach ($r in $debrisRoots) { Quick-Count -Path $r }
foreach ($k in ($counts.Keys | Sort-Object)) { Write-Output ("  {0,-14} x{1}" -f $k, $counts[$k]) }
if ($counts.Count -eq 0) { Write-Output "  (none found at depth <=4)" }

Write-Output "`n===== GHOST PROFILES (dead provisioning identities -- confirm-tier, never auto-delete) ====="
$sysProfiles = @('Public','Default','Default User','All Users','WDAGUtilityAccount','Administrator')
foreach ($base in @('C:\Users','C:\home')) {
  if (-not (Test-Path $base)) { continue }
  Get-ChildItem -LiteralPath $base -Directory -Force -EA SilentlyContinue | ForEach-Object {
    if ($sysProfiles -contains $_.Name -or $_.Name -ieq $env:USERNAME) { return }
    Write-Output ("  {0}  (last write {1:yyyy-MM-dd})" -f $_.FullName, $_.LastWriteTime)
  }
}

Write-Output "`n===== DONE ====="
