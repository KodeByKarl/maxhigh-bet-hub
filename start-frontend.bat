@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo  MaxHigh - Frontend + API (Vite)
echo ========================================
echo.
echo This starts the website AND server functions
echo (login, coins, jackpot, profile) together.
echo Make sure MariaDB is running first.
echo.

if not exist "node_modules\" (
  echo Installing npm packages...
  call npm install
  if errorlevel 1 (
    echo [!] npm install failed.
    pause
    exit /b 1
  )
)

if not exist ".env" (
  echo [!] .env not found. Copying .env.example ...
  copy /Y ".env.example" ".env" >nul
  echo     Edit .env with your MariaDB password, then re-run.
  echo.
  pause
)

echo Starting: npm run dev
echo Open the URL shown below in your browser.
echo Press Ctrl+C to stop.
echo.
call npm run dev

pause
endlocal
