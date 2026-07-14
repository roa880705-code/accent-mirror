@echo off
cd /d "%~dp0"
set PORT=3003
title Accent Mirror v0.12.0 - localhost:3003
echo Accent Mirror v0.12.0 Timeline Voice Script
echo.
echo Open http://localhost:3003/
echo Press Ctrl+C to stop.
echo.
"C:\Program Files\nodejs\node.exe" server.js
