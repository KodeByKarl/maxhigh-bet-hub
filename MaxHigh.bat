@echo off
setlocal EnableExtensions
cd /d "%~dp0"

REM ============================================================
REM  MaxHigh — single control panel (dev + DB + auto-deploy)
REM  Double-click this file. Old start-*.bat / setup-*.bat removed.
REM ============================================================

if /I "%~1"=="" goto :menu
call :dispatch "%~1"
goto :eof

:menu
cls
echo.
echo  ========================================
echo   MaxHigh Control Panel
echo  ========================================
echo.
echo   DEV
echo    1^) Start ALL          (MariaDB + npm run dev)
echo    2^) Start MariaDB only
echo    3^) Start Frontend/API (npm run dev)
echo    4^) Setup database     (db:push + seed)
echo.
echo   PRODUCTION / AUTO-UPDATE
echo    5^) Check GitHub updates
echo    6^) Deploy now         (pull + build + reload)
echo    7^) Force rebuild/reload
echo    8^) Install + start PM2 (app + auto-updater)
echo    9^) Run updater only   (poll/webhook, no PM2)
echo   10^) PM2 status / logs hint
echo.
echo    0^) Exit
echo.
set /p "CHOICE=  Choose: "

if "%CHOICE%"=="1"  call :start_all          & goto :end
if "%CHOICE%"=="2"  call :start_backend      & goto :end
if "%CHOICE%"=="3"  call :start_frontend     & goto :end
if "%CHOICE%"=="4"  call :setup_database     & goto :end
if "%CHOICE%"=="5"  call :deploy_check       & goto :end
if "%CHOICE%"=="6"  call :deploy_now         & goto :end
if "%CHOICE%"=="7"  call :deploy_force       & goto :end
if "%CHOICE%"=="8"  call :deploy_pm2_install & goto :end
if "%CHOICE%"=="9"  call :deploy_watch       & goto :end
if "%CHOICE%"=="10" call :pm2_hint           & goto :end
if "%CHOICE%"=="0"  goto :bye
echo.
echo  Invalid choice.
pause
goto :menu

:dispatch
if /I "%~1"=="all"      goto :start_all
if /I "%~1"=="db"       goto :start_backend
if /I "%~1"=="dev"      goto :start_frontend
if /I "%~1"=="setup"    goto :setup_database
if /I "%~1"=="check"    goto :deploy_check
if /I "%~1"=="deploy"   goto :deploy_now
if /I "%~1"=="force"    goto :deploy_force
if /I "%~1"=="pm2"      goto :deploy_pm2_install
if /I "%~1"=="watch"    goto :deploy_watch
echo Unknown command: %~1
echo Usage: MaxHigh.bat [ all ^| db ^| dev ^| setup ^| check ^| deploy ^| force ^| pm2 ^| watch ]
exit /b 1

REM -------------------- helpers --------------------

:ensure_env
if not exist ".env" (
  echo [!] .env missing — copying from .env.example
  copy /Y ".env.example" ".env" >nul
  echo     Edit .env with your MariaDB password if needed.
  echo.
)
goto :eof

:ensure_npm
if not exist "node_modules\" (
  echo Installing npm packages...
  call npm install
  if errorlevel 1 (
    echo [!] npm install failed.
    exit /b 1
  )
)
goto :eof

:find_mysql_service
set "SERVICE="
for %%S in (MariaDB MySQL80 MySQL57 MySQL) do (
  sc query "%%S" >nul 2>&1
  if not errorlevel 1 (
    set "SERVICE=%%S"
    goto :eof
  )
)
goto :eof

REM -------------------- actions --------------------

:start_backend
echo.
echo  ========================================
echo   MaxHigh — Backend (MariaDB / MySQL)
echo  ========================================
echo.
call :find_mysql_service
if not defined SERVICE (
  echo [!] No MariaDB/MySQL Windows service found.
  echo     Start it from XAMPP / WAMP / services.msc.
  echo.
  pause
  exit /b 1
)
echo Found service: %SERVICE%
sc query "%SERVICE%" | findstr /I "RUNNING" >nul
if not errorlevel 1 (
  echo [OK] %SERVICE% is already running.
) else (
  echo Starting %SERVICE% ...
  net start "%SERVICE%"
  if errorlevel 1 (
    echo [!] Failed — try Run as Administrator.
    pause
    exit /b 1
  )
  echo [OK] %SERVICE% started.
)
echo.
pause
goto :eof

:start_frontend
echo.
echo  ========================================
echo   MaxHigh — Frontend + API (dev)
echo  ========================================
echo.
call :ensure_env
call :ensure_npm
if errorlevel 1 ( pause & exit /b 1 )
echo Starting: npm run dev
echo Press Ctrl+C to stop.
echo.
call npm run dev
pause
goto :eof

:start_all
echo.
echo  ========================================
echo   MaxHigh — Start ALL
echo  ========================================
echo.
call :find_mysql_service
if defined SERVICE (
  echo [Backend] Service: %SERVICE%
  sc query "%SERVICE%" | findstr /I "RUNNING" >nul
  if errorlevel 1 (
    echo [Backend] Starting %SERVICE% ...
    net start "%SERVICE%"
  ) else (
    echo [Backend] Already running.
  )
) else (
  echo [Backend] No Windows MySQL service — start XAMPP/WAMP MySQL manually.
)
echo.
call :ensure_env
call :ensure_npm
if errorlevel 1 ( pause & exit /b 1 )
echo [Frontend+API] npm run dev
echo Press Ctrl+C to stop.
echo.
call npm run dev
pause
goto :eof

:setup_database
echo.
echo  ========================================
echo   MaxHigh — Setup Database
echo  ========================================
echo.
call :ensure_env
if not exist ".env" (
  notepad ".env"
  pause
  exit /b 1
)
call :ensure_npm
if errorlevel 1 ( pause & exit /b 1 )
echo [1/2] db:push ...
call npm run db:push
if errorlevel 1 (
  echo [!] db:push failed. Is MariaDB running? Check .env.
  pause
  exit /b 1
)
echo.
echo [2/2] db:seed ...
call npm run db:seed
if errorlevel 1 (
  echo [!] db:seed failed.
  pause
  exit /b 1
)
echo.
echo  Done. Next: choose option 1 ^(Start ALL^).
echo.
pause
goto :eof

:deploy_check
echo.
call npm run deploy:check
echo.
pause
goto :eof

:deploy_now
echo.
echo Deploying from GitHub if behind...
call npm run deploy:now
echo.
pause
goto :eof

:deploy_force
echo.
echo Force rebuild + reload...
call npm run deploy:force
echo.
pause
goto :eof

:deploy_pm2_install
echo.
echo  ========================================
echo   MaxHigh — PM2 production + auto-update
echo  ========================================
echo.
call :ensure_env
where pm2 >nul 2>&1
if errorlevel 1 (
  echo Installing pm2 globally...
  call npm install -g pm2
)
call :ensure_npm
if errorlevel 1 ( pause & exit /b 1 )
echo Building production...
set NODE_ENV=production
call npm run build
if errorlevel 1 (
  echo [!] build failed.
  pause
  exit /b 1
)
if not exist "deploy\logs" mkdir "deploy\logs"
echo Starting PM2 (maxhigh-app + maxhigh-updater)...
call pm2 start deploy/ecosystem.config.cjs
call pm2 save
echo.
echo  Done. Enable boot:  pm2 startup
echo  Health:             http://localhost:9090/health
echo  Docs:               deploy\README.md
echo.
pause
goto :eof

:deploy_watch
echo.
echo Starting auto-update watcher (Ctrl+C to stop)...
echo.
call npm run deploy:watch
pause
goto :eof

:pm2_hint
echo.
echo  pm2 status
echo  pm2 logs maxhigh-updater
echo  pm2 logs maxhigh-app
echo  pm2 reload maxhigh-app
echo  curl http://localhost:9090/health
echo.
where pm2 >nul 2>&1
if not errorlevel 1 call pm2 status
echo.
pause
goto :eof

:end
goto :eof

:bye
echo.
echo  Bye.
endlocal
exit /b 0
