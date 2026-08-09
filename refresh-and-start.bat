@echo off
title MF Portfolio - Refresh & Start
cd /d "%~dp0"

echo ============================================
echo   MF Portfolio Analysis - Refresh Pipeline
echo ============================================
echo.

echo [1/3] Processing all disclosure files...
"C:\Users\WIN\AppData\Local\Programs\Python\Python314\python.exe" backend\generate_multi_period.py
if errorlevel 1 (
    echo ERROR: Data processing failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Building dashboard...
cd frontend
call npx vite build
cd ..
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Starting dashboard...
echo.
echo ============================================
echo   Dashboard ready: http://localhost:5174
echo   Close this window to stop the server.
echo ============================================
start http://localhost:5174
cd frontend
npx vite preview --port 5174 --strictPort
pause
