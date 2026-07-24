@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo  MaxHigh - Backend (MariaDB / MySQL)
echo ========================================
echo.

REM Try common Windows service names
set "SERVICE="
for %%S in (MariaDB MySQL80 MySQL57 MySQL) do (
  sc query "%%S" >nul 2>&1
  if not errorlevel 1 (
    set "SERVICE=%%S"
    goto :found
  )
)

echo [!] No MariaDB/MySQL Windows service found.
echo     Start MariaDB manually (XAMPP / WAMP / services.msc),
echo     then make sure .env has the correct credentials.
echo.
pause
exit /b 1

:found
echo Found service: %SERVICE%
sc query "%SERVICE%" | findstr /I "RUNNING" >nul
if not errorlevel 1 (
  echo [OK] %SERVICE% is already running.
) else (
  echo Starting %SERVICE% ...
  net start "%SERVICE%"
  if errorlevel 1 (
    echo.
    echo [!] Failed to start %SERVICE%.
    echo     Try running this .bat as Administrator.
    echo.
    pause
    exit /b 1
  )
  echo [OK] %SERVICE% started.
)

echo.
echo Database env: use .env  (see .env.example)
echo API lives inside the frontend process (TanStack Start).
echo Run start-frontend.bat or start-all.bat next.
echo.
pause
endlocal
