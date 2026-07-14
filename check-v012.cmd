@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" --check server.js
"C:\Program Files\nodejs\node.exe" --check src\services\mirrorGeneratorService.js
"C:\Program Files\nodejs\node.exe" --check src\services\azureTtsService.js
"C:\Program Files\nodejs\node.exe" --check public\app.js
echo.
echo Syntax check complete.
