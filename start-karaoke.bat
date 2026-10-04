@echo off
title KARA-OKEY Server
cd /d "%~dp0"
echo ========================================================
echo   🎤 KARA-OKEY Server is running!
echo   TV Screen:      http://localhost:3000
echo   Mobile Phone:   http://10.163.160.119:3000
echo ========================================================
echo.
npm start
if %errorlevel% neq 0 (
  echo Server stopped or error occurred. Press any key to exit.
  pause >nul
)
