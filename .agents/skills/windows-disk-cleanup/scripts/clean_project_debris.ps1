# clean_project_debris.ps1 -- delete dead engineering-project artifacts found by scan_project_debris.ps1.
# DRY-RUN by default; pass -Apply to delete. Same grounded rules as the scan:
#   - scans both home roots (C:\Users\<user> and C:\home\<user>)
#   - never follows symlinks/junctions (.claude is symlinked between roots)
#   - age guard: -MinAgeDays protects anything recently modified (live projects)
#   - 'unverified-build', 'copy-dupes', and ghost profiles are NEVER deleted by this script
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/clean_project_debris.ps1            # dry run
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/clean_project_debris.ps1 -Apply     # delete
param(
    [string[]]$SearchRoots  = @(),
    [int]$MinAgeDays        = 30,
    [int]$MaxDepth          = 6,
    [switch]$Apply,
    [string[]]$Categories   = @(),           # empty = all safe categories
    [switch]$IncludeGlobalCaches,             # opt-in: .m2, .gradle, cargo, go, huggingface, puppeteer, firebase, chocolatey
    [switch]$IncludeStaleBackups              # opt-in: claude-backup-* / claude-unification-backup-* dirs
)
$ErrorActionPreference = 'SilentlyContinue'

if ($SearchRoots.Count -eq 0) {
    $SearchRoots = @($env:USERPROFILE)
    $wslBridge = "C:\home\$env:USERNAME"
    if (Test-Path -LiteralPath $wslBridge) { $SearchRoots += $wslBridge }
}

# Safe-by-default categories. NOT here: unverified-build, copy-dupes (human judgment),
# stale-backups + global caches (opt-in switches), ghost profiles (never scripted).
$SafeCategories = @('js-deps','python-venv','py-artifacts','build-output','test-artifacts',
                    'build-cache','jupyter','terraform','log-files','tmp-orphans')
if ($Categories.Count -eq 0) { $Categories = $SafeCategories }
$Categories = @($Categories | Where-Object { $SafeCategories -contains $_ })
if ($IncludeStaleBackups) { $Categories += 'stale-backups' }

function Get-DirSize($path) {
    if (-not (Test-Path -LiteralPath $path)) { return 0 }
    $sum = (Get-ChildItem -LiteralPath $path -Recurse -File -Force -EA SilentlyContinue |
            Measure-Object Length -Sum).Sum
    if ($null -eq $sum) { return 0 }
    return [math]::Round($sum / 1MB, 1)
}

# ---------- discovery (mirror of scan_project_debris.ps1) ----------
$TargetMap = @{
    'node_modules'='js-deps'; '.venv'='python-venv'; 'venv'='python-venv'
    '__pycache__'='py-artifacts'; '.pytest_cache'='py-artifacts'; '.mypy_cache'='py-artifacts'
    '.next'='build-output'; '.nuxt'='build-output'; '.output'='build-output'
    'coverage'='test-artifacts'; '.nyc_output'='test-artifacts'; 'htmlcov'='test-artifacts'
    'test-results'='test-artifacts'; 'playwright-report'='test-artifacts'
    '.turbo'='build-cache'; '.parcel-cache'='build-cache'; '.vite'='build-cache'
    '.ipynb_checkpoints'='jupyter'; '.terraform'='terraform'
}
$AmbiguousNames = @('dist','build','out')
$ProjectMarkers = @('package.json','pyproject.toml','setup.py','requirements.txt',
                    'Cargo.toml','pom.xml','go.mod','tsconfig.json','vite.config.ts',
                    'vite.config.js','next.config.js','next.config.mjs','composer.json')
$SkipDirs = @('AppData','OneDrive','Windows','.git','.claude','.codex','.grok','.ssh',
              '$Recycle.Bin','System Volume Information','Program Files','Program Files (x86)')

$cutoff  = (Get-Date).AddDays(-$MinAgeDays)
$targets = [System.Collections.Generic.List[object]]::new()

function Test-ProjectMarker($parentPath) {
    foreach ($m in $ProjectMarkers) {
        if (Test-Path -LiteralPath (Join-Path $parentPath $m)) { return $true }
    }
    return $false
}
function Add-Target($category, $path, $isDir, $sizeMB) {
    if ($Categories -notcontains $category) { return }
    $script:targets.Add([PSCustomObject]@{ Category=$category; Path=$path; IsDir=$isDir; SizeMB=$sizeMB })
}
function Scan-Tree {
    param([string]$Path, [int]$Depth = 0)
    if ($Depth -gt $MaxDepth) { return }
    Get-ChildItem -LiteralPath $Path -File -Force -EA SilentlyContinue | ForEach-Object {
        if ($_.LastWriteTime -ge $cutoff) { return }
        $mb = [math]::Round($_.Length / 1MB, 1)
        if ($_.Name -like '.codex-*.log')                        { Add-Target 'log-files'   $_.FullName $false $mb }
        elseif ($_.Extension -eq '.log' -and $_.Length -gt 10MB) { Add-Target 'log-files'   $_.FullName $false $mb }
        elseif ($_.Name -match '\.tmp\.')                        { Add-Target 'tmp-orphans' $_.FullName $false $mb }
    }
    Get-ChildItem -LiteralPath $Path -Directory -Force -EA SilentlyContinue | ForEach-Object {
        if ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) { return }   # symlink safety
        $name = $_.Name
        if ($SkipDirs -contains $name) { return }
        if ($name -match '^claude(-unification)?-backup-') {
            Add-Target 'stale-backups' $_.FullName $true (Get-DirSize $_.FullName); return
        }
        if ($name -match ' - Copy( \(\d+\))?$') { return }   # copy-dupes: never scripted deletion
        if ($TargetMap.ContainsKey($name)) {
            if ($_.LastWriteTime -lt $cutoff) { Add-Target $TargetMap[$name] $_.FullName $true (Get-DirSize $_.FullName) }
            return
        }
        if ($AmbiguousNames -contains $name) {
            # only delete when a project marker verifies it as build output
            if ($_.LastWriteTime -lt $cutoff -and (Test-ProjectMarker $Path)) {
                Add-Target 'build-output' $_.FullName $true (Get-DirSize $_.FullName)
            }
            return
        }
        Scan-Tree -Path $_.FullName -Depth ($Depth + 1)
    }
}

$freeBefore = [math]::Round((Get-PSDrive C).Free / 1GB, 2)
Write-Output ("===== PROJECT DEBRIS CLEAN ({0}) =====" -f $(if ($Apply) { 'APPLY -- DELETING' } else { 'DRY RUN -- nothing deleted' }))
Write-Output ("Roots      : {0}" -f ($SearchRoots -join '  |  '))
Write-Output ("Categories : {0}" -f ($Categories -join ', '))
Write-Output ("Age guard  : skipping anything modified after {0:yyyy-MM-dd}" -f $cutoff)
Write-Output ("C: free    : {0} GB" -f $freeBefore)
Write-Output ""

foreach ($root in $SearchRoots) { Scan-Tree -Path $root }

$totalMB = 0.0; $failed = 0
foreach ($t in ($targets | Sort-Object Category, Path)) {
    $totalMB += $t.SizeMB
    if ($Apply) {
        if ($t.IsDir) { Remove-Item -LiteralPath $t.Path -Recurse -Force -EA SilentlyContinue }
        else          { Remove-Item -LiteralPath $t.Path -Force -EA SilentlyContinue }
        if (Test-Path -LiteralPath $t.Path) {
            $failed++
            Write-Output ("FAILED   {0,9:N1}MB  [{1}]  {2}" -f $t.SizeMB, $t.Category, $t.Path)
        } else {
            Write-Output ("removed  {0,9:N1}MB  [{1}]  {2}" -f $t.SizeMB, $t.Category, $t.Path)
        }
    } else {
        Write-Output ("would remove  {0,9:N1}MB  [{1}]  {2}" -f $t.SizeMB, $t.Category, $t.Path)
    }
}

# ---------- opt-in: global caches ----------
if ($IncludeGlobalCaches) {
    $globalCaches = @(
        "$env:USERPROFILE\.m2\repository", "$env:USERPROFILE\.gradle\caches",
        "$env:USERPROFILE\.cargo\registry", "$env:USERPROFILE\go\pkg\mod\cache",
        "$env:USERPROFILE\.cache\huggingface", "$env:USERPROFILE\.cache\puppeteer",
        "$env:USERPROFILE\.cache\firebase", "$env:USERPROFILE\.chocolatey\http-cache"
    )
    foreach ($p in $globalCaches) {
        if (-not (Test-Path -LiteralPath $p)) { continue }
        $mb = Get-DirSize $p
        $totalMB += $mb
        if ($Apply) {
            Remove-Item -LiteralPath $p -Recurse -Force -EA SilentlyContinue
            Write-Output ("removed  {0,9:N1}MB  [global-cache]  {1}" -f $mb, $p)
        } else {
            Write-Output ("would remove  {0,9:N1}MB  [global-cache]  {1}" -f $mb, $p)
        }
    }
}

# ---------- docker build cache ----------
$dk = Get-Command docker -EA SilentlyContinue
if ($dk) {
    if ($Apply) {
        Write-Output "`nPruning Docker build cache..."
        (docker builder prune -f 2>&1) | ForEach-Object { Write-Output ("  " + $_) }
    } else {
        Write-Output "`n(with -Apply, would also run: docker builder prune -f)"
    }
}

$freeAfter = [math]::Round((Get-PSDrive C).Free / 1GB, 2)
Write-Output ""
Write-Output ("Items: {0}   Gross: {1:N0} MB ({2:N1} GB)   Failed: {3}" -f $targets.Count, $totalMB, ($totalMB/1024), $failed)
if ($Apply) { Write-Output ("C: free {0} GB -> {1} GB  (net {2:+0.00;-0.00} GB)" -f $freeBefore, $freeAfter, ($freeAfter - $freeBefore)) }
else        { Write-Output "Dry run complete. Re-run with -Apply to delete." }
Write-Output ""
Write-Output "DONE_DEBRIS"
