# remove_docker.ps1 -- fully remove Docker Desktop's data + WSL distro. Reclaims the big space (often 20-40GB).
# Deleting Program Files\Docker needs ADMIN; run this whole script elevated to also clear that remnant.
# SAFETY: unregisters ONLY the 'docker-desktop' distro. NEVER touches the user's real distro (Ubuntu, etc.).
$ErrorActionPreference = 'SilentlyContinue'
$before = (Get-PSDrive C).Free
Write-Output ("FREE before: {0} GB" -f [math]::Round($before/1GB,2))

Write-Output "--- WSL distros BEFORE ---"
$distros = (wsl.exe -l -q 2>&1) | ForEach-Object { ($_ -replace "`0","").Trim() } | Where-Object { $_ -ne '' }
$distros | ForEach-Object { Write-Output ("  " + $_) }

# release vhdx handles; Stopped distros lose no data on shutdown
wsl.exe --shutdown 2>&1 | Out-Null
Start-Sleep -Seconds 4

if ($distros -contains 'docker-desktop') {
  Write-Output "Unregistering distro: docker-desktop"
  wsl.exe --unregister docker-desktop 2>&1 | ForEach-Object { Write-Output ("  " + ($_ -replace "`0","")) }
} else { Write-Output "docker-desktop distro not present; skipping unregister" }

Write-Output "--- Deleting leftover Docker folders ---"
foreach ($p in @("$env:LOCALAPPDATA\Docker","$env:APPDATA\Docker","$env:LOCALAPPDATA\Docker Desktop","$env:APPDATA\Docker Desktop","$env:ProgramFiles\Docker")) {
  if (Test-Path -LiteralPath $p) {
    Remove-Item -LiteralPath $p -Recurse -Force -EA SilentlyContinue
    if (Test-Path -LiteralPath $p) { Write-Output ("  PARTIAL/FAILED (needs admin?): " + $p) } else { Write-Output ("  deleted: " + $p) }
  } else { Write-Output ("  not present: " + $p) }
}

Write-Output "--- WSL distros AFTER (user's real distro must remain) ---"
(wsl.exe -l -q 2>&1) | ForEach-Object { ($_ -replace "`0","").Trim() } | Where-Object { $_ -ne '' } | ForEach-Object { Write-Output ("  " + $_) }

$after = (Get-PSDrive C).Free
Write-Output ("FREE after: {0} GB   (reclaimed {1} GB)" -f [math]::Round($after/1GB,2), [math]::Round(($after-$before)/1GB,2))
Write-Output "DONE_DOCKER"
