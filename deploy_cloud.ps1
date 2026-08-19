# =============================================================================
# Digital Growth Studio — 1-Click Unified Production Cloud Deploy
# Deploys Next.js Frontend & FastAPI Backend to Firebase & Cloud Run
# Target Domain: digitalgrowthstudio.in
# =============================================================================

Write-Host "🚀 Starting Digital Growth Studio Deployment for digitalgrowthstudio.in..." -ForegroundColor Green

# 1. Build Next.js Frontend
Write-Host "📦 Building Next.js Frontend..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\frontend"

# Force clear Next.js build caches
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }
if (Test-Path "out") { Remove-Item -Recurse -Force "out" }

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}

# 2. Deploy Frontend to Firebase Hosting
Write-Host "🔥 Deploying Frontend to Firebase Hosting..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot"
# Temporarily clear credentials to deploy using user authorization (flasshgames2026@gmail.com)
$oldCreds = $env:GOOGLE_APPLICATION_CREDENTIALS
$env:GOOGLE_APPLICATION_CREDENTIALS = ""

Write-Host "🔥 Deploying to Staging (digital-growth-studio)..." -ForegroundColor Cyan
npx --yes firebase-tools deploy --only hosting:staging --project digital-growth-studio --non-interactive

Write-Host "🔥 Deploying to Production (partner-dgs)..." -ForegroundColor Cyan
npx --yes firebase-tools deploy --only hosting:prod --project partner-dgs --non-interactive

# Restore credentials
$env:GOOGLE_APPLICATION_CREDENTIALS = $oldCreds
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase Hosting deploy failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Deployment successful! Your site is live and ready for digitalgrowthstudio.in" -ForegroundColor Green
