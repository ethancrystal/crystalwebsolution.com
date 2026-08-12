# scan_project_debris.ps1 -- read-only recon of dead engineering-project artifacts.
# Grounded in this machine's layout: scans BOTH home roots (C:\Users\<user> and C:\home\<user>),
# never follows symlinks/junctions (the .claude dirs are symlinked between roots),
# and reports ghost profiles (e.g. Tesla Laptops) and stale claude-backup-* dirs as confirm-tier.
# Does ZERO deletions. Run clean_project_debris.ps1 to delete.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/scan_project_debris.ps1 > debris.txt 2>&1
param(
    [string[]]$SearchRoots = @(),
    [int]$MinAgeDays       = 30,
    [int]$MaxDepth         = 6
)
$ErrorActionPreference = 'SilentlyContinue'

# ---------- roots ----------
if ($SearchRoots.Count -eq 0) {
    $SearchRoots = @($env:USERPROFILE)
    $wslBridge = "C:\home\$env:USERNAME"
    if (Test-Path -LiteralPath $wslBridge) { $SearchRoots += $wslBridge }
}

function Get-DirSize($path) {
    if (-not (Test-Path -LiteralPath $path)) { return 0 }
    $sum = (Get-ChildItem -LiteralPath $path -Recurse -File -Force -EA SilentlyContinue |
            Measure-Object Length -Sum).Sum
    if ($null -eq $sum) { return 0 }
    return [math]::Round($sum / 1MB, 1)
}

# ---------- classification tables ----------
# Unambiguous debris dir names -> category. Matching stops recursion into that subtree.
$TargetMap = @{
    'node_modules'       = 'js-deps'
    '.venv'              = 'python-venv'
    'venv'               = 'python-venv'
    '__pycache__'        = 'py-artifacts'
    '.pytest_cache'      = 'py-artifacts'
    '.mypy_cache'        = 'py-artifacts'
    '.next'              = 'build-output'
    '.nuxt'              = 'build-output'
    '.output'            = 'build-output'
    'coverage'           = 'test-artifacts'
    '.nyc_output'        = 'test-artifacts'
    'htmlcov'            = 'test-artifacts'
    'test-results'       = 'test-artifacts'
    'playwright-report'  = 'test-artifacts'
    '.turbo'             = 'build-cache'
    '.parcel-cache'      = 'build-cache'
    '.vite'              = 'build-cache'
    '.ipynb_checkpoints' = 'jupyter'
    '.terraform'         = 'terraform'
}
# Ambiguous names: only debris if a project marker file sits BESIDE them; otherwise report-only.
$AmbiguousNames = @('dist','build','out')
$ProjectMarkers = @('package.json','pyproject.toml','setup.py','requirements.txt',
                    'Cargo.toml','pom.xml','go.mod','tsconfig.json','vite.config.ts',
                    'vite.config.js','next.config.js','next.config.mjs','composer.json')
# Never recurse into these (live agent state, system, cloud-synced, covered elsewhere).
$SkipDirs = @('AppData','OneDrive','Windows','.git','.claude','.codex','.grok','.ssh',
              '$Recycle.Bin','System Volume Information','Program Files','Program Files (x86)')

$CatMeta = [ordered]@{
    'js-deps'          = 'JS dependencies (node_modules) -- regen: npm/pnpm/yarn install'
    'python-venv'      = 'Python virtual envs (.venv/venv) -- regen: pip install -r requirements.txt'
    'py-artifacts'     = 'Python build/test artifacts -- auto-regenerated'
    'build-output'     = 'Build outputs (verified: project marker beside them) -- regen: build script'
    'unverified-build' = 'dist/build/out dirs with NO project marker -- REPORT ONLY, may be source'
    'test-artifacts'   = 'Test & coverage artifacts -- auto-regenerated'
    'build-cache'      = 'Bundler/monorepo caches -- auto-regenerated'
    'jupyter'          = 'Jupyter checkpoints -- auto-regenerated'
    'terraform'        = 'Terraform provider cache -- regen: terraform init'
    'log-files'        = 'Log files: .codex-*.log anywhere; other *.log over 10 MB'
    'tmp-orphans'      = 'Orphaned atomic-write temp files (*.tmp.*)'
    'copy-dupes'       = "' - Copy' duplicates (Windows/WSL artifacts) -- REPORT ONLY, verify by eye"
    'stale-backups'    = 'claude-backup-* / claude-unification-backup-* dirs -- CONFIRM before deleting'
}

$cutoff = (Get-Date).AddDays(-$MinAgeDays)
$found  = [System.Collections.Generic.List[object]]::new()

function Test-ProjectMarker($parentPath) {
    foreach ($m in $ProjectMarkers) {
        if (Test-Path -LiteralPath (Join-Path $parentPath $m)) { return $true }
    }
    return $false
}

function Add-Finding($category, $path, $lastWrite, $sizeMB) {
    $script:found.Add([PSCustomObject]@{
        Category = $category; Path = $path; LastWrite = $lastWrite; SizeMB = $sizeMB
    })
}

function Scan-Tree {
    param([string]$Path, [int]$Depth = 0)
    if ($Depth -gt $MaxDepth) { return }

    # file-level debris in this dir
    Get-ChildItem -LiteralPath $Path -File -Force -EA SilentlyContinue | ForEach-Object {
        if ($_.LastWriteTime -ge $cutoff) { return }
        $mb = [math]::Round($_.Length / 1MB, 1)
        if ($_.Name -like '.codex-*.log')                          { Add-Finding 'log-files'  $_.FullName $_.LastWriteTime $mb }
        elseif ($_.Extension -eq '.log' -and $_.Length -gt 10MB)   { Add-Finding 'log-files'  $_.FullName $_.LastWriteTime $mb }
        elseif ($_.Name -match '\.tmp\.')                          { Add-Finding 'tmp-orphans' $_.FullName $_.LastWriteTime $mb }
        elseif ($_.BaseName -match ' - Copy( \(\d+\))?$')          { Add-Finding 'copy-dupes' $_.FullName $_.LastWriteTime $mb }
    }

    Get-ChildItem -LiteralPath $Path -Directory -Force -EA SilentlyContinue | ForEach-Object {
        # NEVER follow symlinks/junctions -- .claude is symlinked between the two home roots.
        if ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) { return }
        $name = $_.Name
        if ($SkipDirs -contains $name) { return }

        if ($name -match '^claude(-unification)?-backup-') {
            Add-Finding 'stale-backups' $_.FullName $_.LastWriteTime (Get-DirSize $_.FullName)
            return
        }
        if ($name -match ' - Copy( \(\d+\))?$') {
            if ($_.LastWriteTime -lt $cutoff) { Add-Finding 'copy-dupes' $_.FullName $_.LastWriteTime (Get-DirSize $_.FullName) }
            return
        }
        if ($TargetMap.ContainsKey($name)) {
            if ($_.LastWriteTime -lt $cutoff) {
                Add-Finding $TargetMap[$name] $_.FullName $_.LastWriteTime (Get-DirSize $_.FullName)
            }
            return   # never recurse inside matched debris
        }
        if ($AmbiguousNames -contains $name) {
            if ($_.LastWriteTime -lt $cutoff) {
                $cat = if (Test-ProjectMarker $Path) { 'build-output' } else { 'unverified-build' }
                Add-Finding $cat $_.FullName $_.LastWriteTime (Get-DirSize $_.FullName)
            }
            return
        }
        Scan-Tree -Path $_.FullName -Depth ($Depth + 1)
    }
}

# ---------- run ----------
Write-Output "===== ENGINEERING PROJECT DEBRIS SCAN ====="
Write-Output ("Roots      : {0}" -f ($SearchRoots -join '  |  '))
Write-Output ("MinAgeDays : {0}  (anything modified after {1:yyyy-MM-dd} is skipped as live)" -f $MinAgeDays, $cutoff)
Write-Output ("MaxDepth   : {0}" -f $MaxDepth)
Write-Output "Scanning... (minutes, not seconds, on a full home dir)"
foreach ($root in $SearchRoots) { Scan-Tree -Path $root }

$grandMB = 0.0
foreach ($cat in $CatMeta.Keys) {
    $items = @($found | Where-Object { $_.Category -eq $cat } | Sort-Object SizeMB -Descending)
    if ($items.Count -eq 0) { continue }
    $catMB = [math]::Round(($items | Measure-Object SizeMB -Sum).Sum, 1)
    $grandMB += $catMB
    Write-Output ("-" * 70)
    Write-Output ("  [{0}]  {1}" -f $cat, $CatMeta[$cat])
    Write-Output ("  Total: {0:N0} MB in {1} item(s)" -f $catMB, $items.Count)
    foreach ($i in $items) {
        Write-Output ("    {0,9:N1}MB  {1:yyyy-MM-dd}  {2}" -f $i.SizeMB, $i.LastWrite, $i.Path)
    }
}
Write-Output ("-" * 70)

# ---------- ghost profiles (report-only, confirm tier) ----------
Write-Output "`n===== GHOST PROFILES (report-only -- CONFIRM with user; may need admin) ====="
$sysProfiles = @('Public','Default','Default User','All Users','WDAGUtilityAccount','Administrator', $env:USERNAME)
foreach ($base in @('C:\Users','C:\home')) {
    if (-not (Test-Path $base)) { continue }
    Get-ChildItem -LiteralPath $base -Directory -Force -EA SilentlyContinue | ForEach-Object {
        if ($sysProfiles -contains $_.Name) { return }
        if ($_.Name -ieq $env:USERNAME) { return }
        Write-Output ("  {0,9:N0}MB  {1}  (last write {2:yyyy-MM-dd})" -f (Get-DirSize $_.FullName), $_.FullName, $_.LastWriteTime)
    }
}
Write-Output "  Note: 'Tesla Laptops' is the dead provisioning identity; its PATH entry also breaks git cloning."

# ---------- global language/tool caches (report-only here) ----------
Write-Output "`n===== GLOBAL LANGUAGE/TOOL CACHES (safe to delete; re-download on next use) ====="
$globalCaches = [ordered]@{
    'Maven repo'        = "$env:USERPROFILE\.m2\repository"
    'Gradle caches'     = "$env:USERPROFILE\.gradle\caches"
    'Cargo registry'    = "$env:USERPROFILE\.cargo\registry"
    'Go module cache'   = "$env:USERPROFILE\go\pkg\mod\cache"
    'HuggingFace cache' = "$env:USERPROFILE\.cache\huggingface"
    'Puppeteer cache'   = "$env:USERPROFILE\.cache\puppeteer"
    'Firebase cache'    = "$env:USERPROFILE\.cache\firebase"
    'Chocolatey http'   = "$env:USERPROFILE\.chocolatey\http-cache"
}
$globalMB = 0.0
foreach ($k in $globalCaches.Keys) {
    $p = $globalCaches[$k]
    if (Test-Path -LiteralPath $p) {
        $mb = Get-DirSize $p
        $globalMB += $mb
        Write-Output ("  {0,-18} {1,9:N0}MB  {2}" -f $k, $mb, $p)
    }
}
if ($globalMB -gt 0) { Write-Output ("  Subtotal: {0:N0} MB" -f $globalMB) }

# ---------- docker build cache ----------
$dk = Get-Command docker -EA SilentlyContinue
if ($dk) {
    Write-Output "`n===== DOCKER BUILD CACHE ====="
    (docker system df 2>&1) | ForEach-Object { Write-Output ("  " + $_) }
    Write-Output "  Reclaim with: docker builder prune -f  (clean script does this with -Apply)"
}

Write-Output ""
Write-Output ("===== TOTAL project debris: {0:N0} MB ({1:N1} GB)  +  global caches: {2:N0} MB =====" -f `
    $grandMB, ($grandMB/1024), $globalMB)
Write-Output ""
Write-Output "Next: dry run   -> clean_project_debris.ps1"
Write-Output "Then: execute   -> clean_project_debris.ps1 -Apply"
Write-Output "Opt-in extras   -> -IncludeGlobalCaches   -IncludeStaleBackups"
Write-Output ""
Write-Output "DONE_SCAN_DEBRIS"
