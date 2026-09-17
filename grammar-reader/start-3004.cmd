@echo off
cd /d "%~dp0.."
set GRAMMAR_PORT=3004
start "" http://localhost:3004/
node grammar-reader/server.js
pause
