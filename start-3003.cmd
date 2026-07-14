@echo off
cd /d "%~dp0"
set PORT=3003
node server.js > server-3003.out.log 2> server-3003.err.log
