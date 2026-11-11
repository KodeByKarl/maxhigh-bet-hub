@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title MaxHigh - start validated release
where node >nul 2>&1 || (echo Node.js is required & exit /b 1)
where pm2 >nul 2>&1 || (echo Install and review PM2 before startup & exit /b 1)
if not exist ".env" (echo Configure .env before startup & exit /b 1)
if not exist "deploy\releases\current.json" (echo No activated release. See deploy\README.md & exit /b 1)
REM Startup deliberately never installs, pulls, builds, migrates or seeds.
if not exist "deploy\logs" mkdir "deploy\logs"
call pm2 startOrReload deploy/ecosystem.config.cjs --update-env
if errorlevel 1 exit /b 1
call pm2 save
exit /b %errorlevel%
