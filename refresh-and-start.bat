@echo off
title MF Portfolio - Refresh & Start
cd /d "%~dp0"

echo ============================================
echo   MF Portfolio Analysis - Refresh Pipeline
echo ============================================
echo.

echo [1/4] Processing all disclosure files...
"C:\Users\WIN\AppData\Local\Programs\Python\Python314\python.exe" backend\generate_multi_period.py
if errorlevel 1 (
    echo ERROR: Data processing failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Running regression tests...
"C:\Users\WIN\AppData\Local\Programs\Python\Python314\python.exe" backend\test_regression.py
if errorlevel 1 (
    echo.
    echo ============================================
    echo   REGRESSION TESTS FAILED - see output above
    echo   Data may be wrong. Fix before using.
    echo ============================================
    pause
    exit /b 1
)

echo.
echo [3/4] Building dashboard...
cd frontend
call npx vite build
cd ..
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Starting dashboard...
echo.
echo ============================================
echo   Dashboard ready: http://localhost:5174
echo   Close this window to stop the server.
echo ============================================
start http://localhost:5174
cd frontend
npx vite preview --port 5174 --strictPort
pause
