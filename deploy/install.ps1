# One-time install of MaxHigh production + auto-update on Windows Server.
# Run from the repo root in PowerShell (as the service account).
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

Write-Host "==> MaxHigh auto-deploy install (Windows)"
Write-Host "    repo: $Root"

if (-not (Test-Path ".env")) {
  throw "missing .env — copy .env.example and fill MySQL + DEPLOY_* secrets first."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "node is required"
}

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
  Write-Host "==> Installing pm2 globally"
  npm install -g pm2
}

Write-Host "==> npm ci"
npm ci

Write-Host "==> production build"
$env:NODE_ENV = "production"
npm run build

New-Item -ItemType Directory -Force -Path "deploy\logs" | Out-Null

Write-Host "==> starting PM2 (app + updater)"
pm2 start deploy/ecosystem.config.cjs
pm2 save

Write-Host ""
Write-Host "Done. Next:"
Write-Host "  1) pm2 startup   (then run the command it prints, may need Admin)"
Write-Host "  2) Open Windows Firewall for DEPLOY_WEBHOOK_PORT (default 9090) if using webhook"
Write-Host "  3) GitHub webhook → https://YOUR_DOMAIN:9090/hooks/github (push events)"
Write-Host "Polling works without webhook. Health: http://localhost:9090/health"
