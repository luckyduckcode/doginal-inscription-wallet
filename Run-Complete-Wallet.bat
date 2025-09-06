@echo off
echo ============================================
echo   Doginal Wallet - Complete with DLLs
echo ============================================
echo.
echo This version includes all required DLLs for Windows.
echo No additional installations needed!
echo.
echo Starting Doginal Inscription Wallet...
echo.
cd /d "%~dp0dist-complete"
npx electron main.js
pause
