@echo off
echo ============================================
echo   Doginal Wallet - Persistent UTXO
echo ============================================
echo.
echo Starting Doginal Inscription Wallet...
echo.
cd /d "%~dp0dist"
npx electron main.js
pause
