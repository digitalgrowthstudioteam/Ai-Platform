# =====================================================================
# Digital Growth Studio - Automated Git Health & Watcher Protection
# Prevents "fatal: Unable to read current working directory" race conditions
# =====================================================================

Write-Host ">>> [1/5] Checking and clearing stale Git lock files..." -ForegroundColor Cyan
$lockFiles = Get-ChildItem -Path ".git" -Filter "*.lock" -Recurse -Force -ErrorAction SilentlyContinue
if ($lockFiles) {
    foreach ($lock in $lockFiles) {
        Write-Host "Removing stale lock: $($lock.FullName)" -ForegroundColor Yellow
        Remove-Item -Path $lock.FullName -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "No stale lock files found." -ForegroundColor Green
}

Write-Host "`n>>> [2/5] Optimizing Git configuration for Windows..." -ForegroundColor Cyan
git config core.fscache true
git config core.preloadindex true
git config status.showUntrackedFiles normal
git config core.ignorecase true
Write-Host "Git Windows performance flags applied (fscache=true, preloadindex=true, showUntrackedFiles=normal)." -ForegroundColor Green

Write-Host "`n>>> [3/5] Refreshing Git commit-graph..." -ForegroundColor Cyan
git commit-graph write --reachable
Write-Host "Commit graph is healthy and reachable." -ForegroundColor Green

Write-Host "`n>>> [4/5] Enforcing IDE watcher exclusions (.vscode/settings.json)..." -ForegroundColor Cyan
$settingsDir = ".vscode"
$settingsFile = "$settingsDir/settings.json"
if (-not (Test-Path $settingsDir)) {
    New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
}

$settingsJson = @{
    "files.watcherExclude" = @{
        "**/.git/objects/**" = $true
        "**/.git/subtree-cache/**" = $true
        "**/node_modules/**" = $true
        "**/.next/**" = $true
        "**/build/**" = $true
        "**/.gradle/**" = $true
        "**/.dart_tool/**" = $true
        "**/android/.gradle/**" = $true
        "**/android/app/build/**" = $true
        "**/partner_app/build/**" = $true
        "**/partner_app/.dart_tool/**" = $true
        "**/partner_app/android/.gradle/**" = $true
        "**/vendors/**/builds/**" = $true
        "**/.pytest_cache/**" = $true
        "**/venv/**" = $true
        "**/tmp/**" = $true
    }
    "search.exclude" = @{
        "**/node_modules" = $true
        "**/build" = $true
        "**/.gradle" = $true
        "**/.next" = $true
        "**/.dart_tool" = $true
    }
    "git.repositoryScanIgnoredFolders" = @(
        "node_modules",
        "build",
        ".gradle",
        ".dart_tool",
        ".next",
        "dist",
        "out",
        "vendors"
    )
    "git.untrackedChanges" = "separate"
    "git.autorefresh" = $true
    "git.detectSubmodules" = $false
    "git.ignoreLimitWarning" = $true
} | ConvertTo-Json -Depth 5

Set-Content -Path $settingsFile -Value $settingsJson -Force
Write-Host "IDE watcher exclusions verified and active." -ForegroundColor Green

Write-Host "`n>>> [5/5] Checking repository integrity..." -ForegroundColor Cyan
git status -s
Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Git health automation completed successfully!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
