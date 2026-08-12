# compact_wsl_vhdx.ps1 -- shrink a WSL2 distro's dynamically-expanded ext4.vhdx. MUST RUN ELEVATED (admin).
# Reclaims only zeroed/unused blocks inside the disk; for a bigger win, run `sudo fstrim -a` inside the distro first.
# The WSL service holds an open handle on the vhdx, so `wsl --shutdown` alone is NOT enough -- this stops the
# service and waits for vmmemWSL to exit before diskpart can attach. The distro is NOT modified or unregistered.
# Usage (elevated): powershell -NoProfile -ExecutionPolicy Bypass -File compact_wsl_vhdx.ps1 -Distro Ubuntu
param([Parameter(Mandatory=$true)][string]$Distro)
$ErrorActionPreference = 'SilentlyContinue'
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
  Write-Output "ERROR: must run elevated (admin)."; return
}

# resolve the distro's vhdx from the Lxss registry
$vhd = $null
Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss' | ForEach-Object {
  $p = Get-ItemProperty $_.PSPath
  if ($p.DistributionName -eq $Distro) { $vhd = (Join-Path ($p.BasePath -replace '^\\\\\?\\','') 'ext4.vhdx') }
}
if (-not $vhd -or -not (Test-Path $vhd)) { Write-Output ("ERROR: vhdx for distro '{0}' not found." -f $Distro); return }
Write-Output ("distro: {0}" -f $Distro)
Write-Output ("vhdx:   {0}" -f $vhd)

$before = (Get-Item $vhd).Length
Write-Output ("vhdx before: {0:N0} MB" -f ($before/1MB))

# free the handle: shut down WSL and stop its service
wsl.exe --shutdown 2>&1 | Out-Null
foreach ($svc in @('WSLService','LxssManager')) {
  if (Get-Service -Name $svc -EA SilentlyContinue) { Stop-Service -Name $svc -Force -EA SilentlyContinue; Write-Output ("stopped service: " + $svc) }
}
for ($i=0; $i -lt 15; $i++) {
  if (-not (Get-Process -Name 'vmmemWSL','wslservice','wsl','wslhost' -EA SilentlyContinue)) { break }
  Start-Sleep -Seconds 1
}

# diskpart compact (attach read-only, compact, detach)
$dp = Join-Path $env:TEMP ("compact_{0}.txt" -f ([guid]::NewGuid().ToString('N')))
@(
  ('select vdisk file="{0}"' -f $vhd),
  'attach vdisk readonly',
  'compact vdisk',
  'detach vdisk',
  'exit'
) | Set-Content -LiteralPath $dp -Encoding ascii
(diskpart /s $dp 2>&1) | ForEach-Object { Write-Output $_ }
Remove-Item -LiteralPath $dp -Force -EA SilentlyContinue

$after = (Get-Item $vhd).Length
Write-Output ("vhdx after:  {0:N0} MB   (shrunk {1:N0} MB)" -f ($after/1MB), (($before-$after)/1MB))
Write-Output "DONE_COMPACT"
