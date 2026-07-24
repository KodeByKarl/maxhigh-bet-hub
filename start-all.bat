@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo  MaxHigh - Start ALL
echo  Backend (MariaDB) + Frontend/API
echo ========================================
echo.

REM ---- Backend: MariaDB / MySQL service ----
set "SERVICE="
for %%S in (MariaDB MySQL80 MySQL57 MySQL) do (
  sc query "%%S" >nul 2>&1
  if not errorlevel 1 (
    set "SERVICE=%%S"
    goto :found
  )
)
goto :no_service

:found
echo [Backend] Service: %SERVICE%
sc query "%SERVICE%" | findstr /I "RUNNING" >nul
if not errorlevel 1 (
  echo [Backend] Already running.
) else (
  echo [Backend] Starting %SERVICE% ...
  net start "%SERVICE%"
  if errorlevel 1 (
    echo [!] Could not start %SERVICE%. Run as Administrator, or start MariaDB manually.
  ) else (
    echo [Backend] Started.
  )
)
goto :frontend

:no_service
echo [Backend] No MariaDB/MySQL Windows service detected.
echo           If you use XAMPP/WAMP, start MySQL from that control panel.
echo.

:frontend
echo.
if not exist "node_modules\" (
  echo [Frontend] Installing npm packages...
  call npm install
  if errorlevel 1 (
    echo [!] npm install failed.
    pause
    exit /b 1
  )
)

if not exist ".env" (
  echo [!] .env missing — copying from .env.example
  copy /Y ".env.example" ".env" >nul
  echo     Edit .env with your DB password before logging in.
  echo.
)

echo [Frontend+API] Starting npm run dev ...
echo Press Ctrl+C to stop.
echo.
call npm run dev

pause
endlocal
