$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
Get-Content -LiteralPath (Join-Path $root '.env') | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $key = $matches[1].Trim()
    $value = $matches[2].Trim().Trim('"')
    [Environment]::SetEnvironmentVariable($key, $value, 'Process')
  }
}
$token = (node scripts/create-admin-validation-session.mjs).Trim()
if (-not $token) { throw 'Could not create admin validation session' }
$env:ADMIN_LOAD_COOKIE = "admin_auth=$token"
$env:DISABLE_TEMPORAL = 'true'
$env:DISABLE_MCP = 'true'
$env:NOT_SECURED = 'true'
$env:PORT = '3000'
$env:FRONTEND_URL = 'http://localhost:4200'
$process = Start-Process -FilePath 'node.exe' -ArgumentList @('--experimental-require-module', 'apps/backend/dist/apps/backend/src/main.js') -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput 'var/admin-validation.out.log' -RedirectStandardError 'var/admin-validation.err.log' -PassThru
Write-Output $process.Id
