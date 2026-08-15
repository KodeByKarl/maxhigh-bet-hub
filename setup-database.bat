@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo  MaxHigh - Setup Database
echo  (push schema + seed admin/player)
echo ========================================
echo.

if not exist ".env" (
  echo [!] .env missing — copying from .env.example
  copy /Y ".env.example" ".env" >nul
  echo.
  echo Edit .env now with your MariaDB user/password, then run this again.
  notepad ".env"
  pause
  exit /b 1
)

if not exist "node_modules\drizzle-kit" (
  echo [0/2] Installing npm dependencies...
  call npm install
  if errorlevel 1 (
    echo [!] npm install failed.
    pause
    exit /b 1
  )
  echo.
)

echo [1/2] Pushing Drizzle schema to MariaDB...
call npm run db:push
if errorlevel 1 (
  echo [!] db:push failed. Is MariaDB running? Check .env credentials.
  pause
  exit /b 1
)

echo.
echo [2/2] Seeding admin + player accounts...
call npm run db:seed
if errorlevel 1 (
  echo [!] db:seed failed.
  pause
  exit /b 1
)

echo.
echo ========================================
echo  Done.
echo  Casino:  player@maxhigh.gg / player123
echo  Admin:   admin@maxhigh.gg  / admin123
echo  Admin URL: /admin/login
echo ========================================
echo.
echo Next: double-click start-all.bat
echo.
pause
endlocal
