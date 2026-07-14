@echo off
rem This launcher is kept intentionally minimal and stable.
rem Do not add logic here: git pull can rewrite this very file while it
rem is running, which corrupts cmd.exe's read position mid-script.
rem All actual logic lives in run-server.cmd, which is safe to change
rem because it is opened fresh (after the pull) via the call below.
cd /d %~dp0
git pull
call run-server.cmd
