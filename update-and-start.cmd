@echo off
cd /d %~dp0
echo === GitHubから最新版を取り込みます ===
git pull
if errorlevel 1 (
  echo.
  echo git pull に失敗しました。上のエラー内容を確認してください。
  pause
  exit /b 1
)

echo.
echo === 必要な部品を確認します ===
call npm install
if errorlevel 1 (
  echo.
  echo npm install に失敗しました。上のエラー内容を確認してください。
  pause
  exit /b 1
)

echo.
echo === サーバーを起動します ===
echo （このウィンドウを閉じるとサーバーも止まります）
call npm start
pause
