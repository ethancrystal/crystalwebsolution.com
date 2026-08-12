# prune_backups.ps1 -- remove duplicate/stale config backups, KEEP the newest safety copy of each.
# Non-admin. Negligible space; this is tidiness. Default is a DRY RUN -- pass -Apply to actually delete.
# Strategy: group backups by the live config they protect; keep the most-recent in each group; delete the rest.
# Also removes orphaned atomic-write temp files (settings.local.json.tmp.*). Single (non-duplicate) backups are kept.
param([switch]$Apply)
$ErrorActionPreference = 'SilentlyContinue'

$dirs = @("$env:USERPROFILE\.claude", "$env:USERPROFILE\.claude\backups", "$env:USERPROFILE\.claude\plugins", "$env:USERPROFILE")
$bk = foreach ($d in $dirs) {
  Get-ChildItem -LiteralPath $d -Force -File -EA SilentlyContinue |
    Where-Object { $_.Name -match '\.(bak|backup|old)(\b|[-.0-9])' }
}
# group key = filename with the backup suffix/timestamp stripped -> the live config it backs up
function Key($name) {
  ($name -replace '\.(bak|backup|old)([-.].*)?$','') -replace '\.\d{6,}$',''
}
$groups = $bk | Group-Object { Key $_.Name }
$toDelete = foreach ($g in $groups) {
  $g.Group | Sort-Object LastWriteTime -Descending | Select-Object -Skip 1   # keep newest per group
}
# orphaned atomic-write temp files
$tmp = foreach ($d in $dirs) {
  Get-ChildItem -LiteralPath $d -Force -File -EA SilentlyContinue | Where-Object { $_.Name -match '\.tmp\.\w+$' }
}
$toDelete = @($toDelete) + @($tmp)

if (-not $toDelete) { Write-Output "No duplicate backups found."; Write-Output "DONE_BACKUPS"; return }
Write-Output ("{0} duplicate/stale backup file(s){1}:" -f $toDelete.Count, $(if($Apply){''}else{' [DRY RUN -- pass -Apply to delete]'}))
foreach ($f in $toDelete) {
  if ($Apply) {
    Remove-Item -LiteralPath $f.FullName -Force -EA SilentlyContinue
    Write-Output ("  " + $(if(Test-Path $f.FullName){'FAILED  '}else{'removed '}) + $f.FullName)
  } else {
    Write-Output ("  would remove  {0:yyyy-MM-dd}  {1}" -f $f.LastWriteTime, $f.FullName)
  }
}
Write-Output "(kept the newest backup in each group as a safety copy)"
Write-Output "DONE_BACKUPS"
