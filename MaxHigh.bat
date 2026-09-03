@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

REM ============================================================
REM  MaxHigh.bat — ONE click
REM  deps → MariaDB → DB sync/seed → build → PM2 app+updater
REM  → Caddy https://maxhigh.online → keep fetching GitHub
REM ============================================================

title MaxHigh — starting...
echo.
echo  ========================================
echo   MaxHigh — auto start
echo  ========================================
echo.

where node >nul 2>&1 || (echo [!] Node.js missing & pause & exit /b 1)
where npm  >nul 2>&1 || (echo [!] npm missing & pause & exit /b 1)
where git  >nul 2>&1 || (echo [!] git missing & pause & exit /b 1)

REM ---- Load .env into this session (KEY=VALUE lines) ----
if exist ".env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" if not "%%B"=="" set "%%A=%%B"
  )
)

if not defined PORT set "PORT=8080"
if not defined CADDY_DOMAIN set "CADDY_DOMAIN=maxhigh.online"
if not defined PUBLIC_URL set "PUBLIC_URL=https://maxhigh.online"
if not defined CADDY_ACME_EMAIL set "CADDY_ACME_EMAIL=admin@maxhigh.online"
if not defined DEPLOY_BRANCH set "DEPLOY_BRANCH=main"
if not defined DEPLOY_POLL_SECONDS set "DEPLOY_POLL_SECONDS=60"
if not defined DEPLOY_WEBHOOK_PORT set "DEPLOY_WEBHOOK_PORT=9090"

echo [1/8] Checking .env ...
if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
  echo       Created .env — set MYSQL_* then save
  notepad ".env"
  pause
  for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" if not "%%B"=="" set "%%A=%%B"
  )
) else (
  echo       OK
)

echo [2/8] Starting database service ...
set "SERVICE="
for %%S in (MariaDB MySQL80 MySQL57 MySQL) do (
  sc query "%%S" >nul 2>&1
  if not errorlevel 1 (
    set "SERVICE=%%S"
    goto :db_found
  )
)
echo       No Windows MySQL service — start XAMPP/WAMP MySQL manually.
goto :db_done

:db_found
sc query "!SERVICE!" | findstr /I "RUNNING" >nul
if not errorlevel 1 (
  echo       !SERVICE! already running
) else (
  net start "!SERVICE!" >nul 2>&1
  if errorlevel 1 (
    echo       [!] Could not start !SERVICE! — run bat as Administrator
  ) else (
    echo       Started !SERVICE!
  )
)
:db_done

echo [3/8] Installing npm dependencies ...
call npm install
if errorlevel 1 (echo [!] npm install failed & pause & exit /b 1)
echo       OK

echo [4/8] Syncing latest code from GitHub ...
git fetch origin main >nul 2>&1
if not errorlevel 1 (
  for /f %%H in ('git rev-parse --short HEAD') do set "LOCAL_SHA=%%H"
  for /f %%H in ('git rev-parse --short origin/main') do set "REMOTE_SHA=%%H"
  echo       local  !LOCAL_SHA!  ^|  origin/main !REMOTE_SHA!
  git pull --ff-only origin main
  if errorlevel 1 (
    echo       Diverged — skipped pull
  ) else (
    for /f %%H in ('git rev-parse --short HEAD') do set "LOCAL_SHA=%%H"
    echo       Synced @ !LOCAL_SHA! ^(Already up to date = OK, latest na^)
  )
) else (
  echo       Fetch failed — continuing offline
)

echo [5/8] Ensuring database tables + seed ...
call npm run db:sync
if errorlevel 1 (echo [!] db:sync failed — check .env MYSQL_* & pause & exit /b 1)
call npm run db:seed
if errorlevel 1 echo       [!] db:seed warning — continuing
echo       OK

echo [6/8] Building Frontend + Backend ^(Nitro node-server^) ...
set NODE_ENV=production
set NITRO_PRESET=node-server
call npm run build
if errorlevel 1 (echo [!] Build failed & pause & exit /b 1)
if not exist ".output\server\index.mjs" (
  echo [!] Missing .output\server\index.mjs
  pause
  exit /b 1
)
echo       OK

echo [7/8] Starting app + GitHub auto-updater ^(PM2^) ...
where pm2 >nul 2>&1
if errorlevel 1 (
  call npm install -g pm2
  if errorlevel 1 (echo [!] pm2 install failed & pause & exit /b 1)
)
if not exist "deploy\logs" mkdir "deploy\logs"

call pm2 startOrReload deploy/ecosystem.config.cjs --update-env
if errorlevel 1 (
  call pm2 delete maxhigh-app maxhigh-updater >nul 2>&1
  call pm2 start deploy/ecosystem.config.cjs
  if errorlevel 1 (echo [!] PM2 start failed & pause & exit /b 1)
)
call pm2 save >nul 2>&1
echo       App on http://127.0.0.1:!PORT!/

echo [8/8] Caddy → https://!CADDY_DOMAIN!/ ...
set "CADDY_EXE="
where caddy >nul 2>&1 && for /f "delims=" %%C in ('where caddy') do (
  set "CADDY_EXE=%%C"
  goto :have_caddy
)
if exist "%ProgramFiles%\Caddy\caddy.exe" set "CADDY_EXE=%ProgramFiles%\Caddy\caddy.exe"
if exist "%LOCALAPPDATA%\Caddy\caddy.exe" set "CADDY_EXE=%LOCALAPPDATA%\Caddy\caddy.exe"
if exist "C:\caddy\caddy.exe" set "CADDY_EXE=C:\caddy\caddy.exe"
if exist "%~dp0caddy.exe" set "CADDY_EXE=%~dp0caddy.exe"
if exist "%~dp0deploy\caddy.exe" set "CADDY_EXE=%~dp0deploy\caddy.exe"

:have_caddy
if not defined CADDY_EXE (
  echo       [!] caddy.exe not found
  echo           Install: https://caddyserver.com/docs/install#windows
  echo           Or drop caddy.exe into deploy\
  echo           Local app works; HTTPS domain not proxied yet.
  goto :summary
)

echo       Using: !CADDY_EXE!
"!CADDY_EXE!" validate --config "%~dp0deploy\Caddyfile" --adapter caddyfile
if errorlevel 1 (
  echo       [!] Invalid deploy\Caddyfile
  goto :summary
)

call pm2 describe maxhigh-caddy >nul 2>&1
if not errorlevel 1 (
  "!CADDY_EXE!" reload --config "%~dp0deploy\Caddyfile" --adapter caddyfile
  if errorlevel 1 (
    call pm2 restart maxhigh-caddy --update-env
  ) else (
    echo       Caddy reloaded
  )
) else (
  call pm2 start "!CADDY_EXE!" --name maxhigh-caddy --interpreter none -- run --config "%~dp0deploy\Caddyfile" --adapter caddyfile
  if errorlevel 1 (
    start "MaxHigh-Caddy" /MIN "!CADDY_EXE!" run --config "%~dp0deploy\Caddyfile" --adapter caddyfile
    echo       Caddy started in background window
  ) else (
    echo       Caddy via PM2 ^(maxhigh-caddy^)
  )
  call pm2 save >nul 2>&1
)

timeout /t 3 /nobreak >nul
curl -s -o NUL -w "%%{http_code}" --max-time 5 "http://127.0.0.1:!PORT!/" > "%TEMP%\mh_app.txt" 2>nul
set /p APP_CODE=<"%TEMP%\mh_app.txt"
echo       Local app: HTTP !APP_CODE!
curl -s -o NUL -w "%%{http_code}" --max-time 10 -k "https://!CADDY_DOMAIN!/" > "%TEMP%\mh_site.txt" 2>nul
set /p SITE_CODE=<"%TEMP%\mh_site.txt"
if "!SITE_CODE!"=="" set "SITE_CODE=000"
if "!SITE_CODE!"=="000" (
  echo       https://!CADDY_DOMAIN!/ not up yet — check DNS A record + firewall 80/443
) else (
  echo       https://!CADDY_DOMAIN!/ HTTP !SITE_CODE!
)

:summary
echo.
echo  ========================================
echo   MaxHigh is RUNNING
echo  ========================================
echo   Public:  !PUBLIC_URL!/
echo   Local:   http://127.0.0.1:!PORT!/
echo   Domain:  !CADDY_DOMAIN!  ^(Caddy + Let's Encrypt^)
echo   Updater: every !DEPLOY_POLL_SECONDS!s from GitHub
echo.
echo   Need: DNS A/AAAA → this PC, ports 80+443 open
echo   pm2 status ^| pm2 logs
echo  ========================================
echo.

start "" "!PUBLIC_URL!/"
timeout /t 2 /nobreak >nul
call pm2 logs --lines 40

endlocal
exit /b 0
