$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$env:PORT = "3003"
& "C:\Program Files\nodejs\node.exe" "server.js" *> "server-3003.ps.log"
