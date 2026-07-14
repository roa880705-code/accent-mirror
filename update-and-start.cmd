@echo off
chcp 65001 >nul
cd /d %~dp0
echo === Updating from GitHub ===
git pull
if errorlevel 1 (
  echo.
  echo git pull failed. Please check the error above.
  pause
  exit /b 1
)

echo.
echo === Checking dependencies ===
call npm install
if errorlevel 1 (
  echo.
  echo npm install failed. Please check the error above.
  pause
  exit /b 1
)

echo.
echo === Starting server ===
echo (Closing this window will stop the server)
call npm start
pause
