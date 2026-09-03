@echo off
setlocal EnableExtensions
cd /d "%~dp0"

REM ============================================================
REM  MaxHigh.bat — ONE click, full stack
REM  1) Install npm deps
REM  2) Start MariaDB + create/fix missing DB tables + seed
REM  3) Build + run Frontend/Backend
REM  4) Keep fetching GitHub forever (auto-update on new commits)
REM ============================================================

title MaxHigh — starting...
echo.
echo  ========================================
echo   MaxHigh — auto start
echo  ========================================
echo.

REM ---- 0) Tools ----
where node >nul 2>&1
if errorlevel 1 (
  echo [!] Node.js not found. Install Node 20+ then re-run.
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [!] npm not found.
  pause
  exit /b 1
)
where git >nul 2>&1
if errorlevel 1 (
  echo [!] git not found. Install Git for Windows then re-run.
  pause
  exit /b 1
)

REM ---- 1) .env ----
echo [1/7] Checking .env ...
if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
  echo       Created .env from .env.example
  echo       Edit DB password if needed, then press any key...
  notepad ".env"
  pause
) else (
  echo       OK
)

REM ---- 2) MariaDB / MySQL ----
echo [2/7] Starting database service ...
set "SERVICE="
for %%S in (MariaDB MySQL80 MySQL57 MySQL) do (
  sc query "%%S" >nul 2>&1
  if not errorlevel 1 (
    set "SERVICE=%%S"
    goto :db_found
  )
)
echo       No Windows MySQL service found — start XAMPP/WAMP MySQL manually.
goto :db_done

:db_found
sc query "%SERVICE%" | findstr /I "RUNNING" >nul
if not errorlevel 1 (
  echo       %SERVICE% already running
) else (
  net start "%SERVICE%" >nul 2>&1
  if errorlevel 1 (
    echo       [!] Could not start %SERVICE%. Run this bat as Administrator.
  ) else (
    echo       Started %SERVICE%
  )
)
:db_done

REM ---- 3) npm dependencies ----
echo [3/7] Installing npm dependencies ...
call npm install
if errorlevel 1 (
  echo [!] npm install failed.
  pause
  exit /b 1
)
echo       OK

REM ---- 4) Pull latest from GitHub (if remote reachable) ----
echo [4/7] Syncing latest code from GitHub ...
git fetch origin main >nul 2>&1
if not errorlevel 1 (
  git pull --ff-only origin main
  if errorlevel 1 (
    echo       Local branch diverged — skipped pull ^(will still start^)
  ) else (
    echo       Repo up to date with origin/main
  )
) else (
  echo       Could not fetch — offline? Continuing with local code.
)

REM ---- 5) Database schema + seed (non-interactive — never use drizzle-kit push here) ----
echo [5/7] Ensuring database tables + seed accounts ...
call npm run db:sync
if errorlevel 1 (
  echo [!] db:sync failed. Check MYSQL_* in .env and that MariaDB is up.
  pause
  exit /b 1
)
call npm run db:seed
if errorlevel 1 (
  echo       [!] db:seed warning — continuing
)
echo       OK

REM ---- 6) Production build ----
echo [6/7] Building Frontend + Backend ...
set NODE_ENV=production
call npm run build
if errorlevel 1 (
  echo [!] Build failed.
  pause
  exit /b 1
)
echo       OK

REM ---- 7) PM2: app + GitHub auto-updater ----
echo [7/7] Starting app + GitHub auto-updater ...
where pm2 >nul 2>&1
if errorlevel 1 (
  echo       Installing pm2 ...
  call npm install -g pm2
  if errorlevel 1 (
    echo [!] pm2 install failed.
    pause
    exit /b 1
  )
)

if not exist "deploy\logs" mkdir "deploy\logs"

REM Load deploy defaults into this session (watcher also reads .env)
if not defined DEPLOY_BRANCH set "DEPLOY_BRANCH=main"
if not defined DEPLOY_POLL_SECONDS set "DEPLOY_POLL_SECONDS=60"
if not defined DEPLOY_WEBHOOK_PORT set "DEPLOY_WEBHOOK_PORT=9090"
if not defined PORT set "PORT=8080"

call pm2 startOrReload deploy/ecosystem.config.cjs --update-env
if errorlevel 1 (
  echo       startOrReload failed — trying fresh start ...
  call pm2 delete maxhigh-app maxhigh-updater >nul 2>&1
  call pm2 start deploy/ecosystem.config.cjs
  if errorlevel 1 (
    echo [!] Could not start PM2 processes.
    pause
    exit /b 1
  )
)
call pm2 save >nul 2>&1

echo.
echo  ========================================
echo   MaxHigh is RUNNING
echo  ========================================
echo   App:      http://localhost:%PORT%/
echo   Updater:  polls GitHub every %DEPLOY_POLL_SECONDS%s
echo             health http://localhost:%DEPLOY_WEBHOOK_PORT%/health
echo.
echo   New commits on origin/main = auto pull + build + reload
echo   ^(no need to open this bat again^)
echo.
echo   Useful:
echo     pm2 status
echo     pm2 logs
echo     pm2 restart maxhigh-app
echo  ========================================
echo.

REM Open browser + show live logs (Ctrl+C only stops the log view, NOT the app)
start "" "http://localhost:%PORT%/"
timeout /t 2 /nobreak >nul
call pm2 logs --lines 40

endlocal
exit /b 0
