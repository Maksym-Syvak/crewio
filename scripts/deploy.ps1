# Crewio — скрипт деплою (Windows PowerShell)
# Запуск: .\scripts\deploy.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "`n=== Crewio Deploy ===" -ForegroundColor Cyan
Write-Host @"

Потрібні акаунти (безкоштовно):
  1. GitHub  — github.com
  2. Render  — render.com  (backend + PostgreSQL)
  3. Vercel  — vercel.com  (frontend Mini App)

"@

# --- GitHub ---
Write-Host "[1/4] GitHub" -ForegroundColor Yellow
Set-Location $Root
if (-not (Test-Path ".git")) { git init; git branch -M main }
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    $repo = Read-Host "URL GitHub репозиторію (https://github.com/user/crewio.git)"
    if ($repo) { git remote add origin $repo }
}
git add .
$status = git status --porcelain
if ($status) {
    git commit -m "Crewio: backend + frontend + deploy configs"
    git push -u origin main
    Write-Host "  Pushed to GitHub" -ForegroundColor Green
} else {
    Write-Host "  Nothing to commit" -ForegroundColor Gray
}

# --- Render ---
Write-Host "`n[2/4] Render (backend)" -ForegroundColor Yellow
Write-Host @"
  1. Відкрийте https://dashboard.render.com/blueprints
  2. New Blueprint Instance -> підключіть GitHub репозиторій
  3. Render створить crewio-api + crewio-db з render.yaml
  4. Додайте env: TELEGRAM_BOT_TOKEN, FRONTEND_URL (після Vercel)
  5. Скопіюйте URL API, напр. https://crewio-api.onrender.com
"@ -ForegroundColor Gray

$apiUrl = Read-Host "URL backend API (Enter — пропустити)"
if (-not $apiUrl) { $apiUrl = "https://crewio-api.onrender.com" }

# --- Vercel ---
Write-Host "`n[3/4] Vercel (frontend)" -ForegroundColor Yellow
Set-Location "$Root\restaurant-shifts-frontend"
npx vercel login
$env:VITE_API_URL = $apiUrl
$env:VITE_WS_URL = $apiUrl
npx vercel --prod --yes
Write-Host "  Frontend deployed" -ForegroundColor Green

# --- Telegram ---
Write-Host "`n[4/4] Telegram BotFather" -ForegroundColor Yellow
Write-Host @"
  /mybots -> @Crewiostaffbot -> Menu Button -> URL Vercel
  Оновіть FRONTEND_URL на Render
"@ -ForegroundColor Gray

Write-Host "`nDone! Open DEPLOY.md for details.`n" -ForegroundColor Green
