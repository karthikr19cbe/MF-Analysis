@echo off
title MF Portfolio Dashboard
cd /d "%~dp0frontend"
echo Starting MF Portfolio Dashboard on http://localhost:5174 ...
start http://localhost:5174
npx vite preview --port 5174 --strictPort
pause
