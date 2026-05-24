@echo off
setlocal

where bash >nul 2>nul
if errorlevel 1 (
  echo Bash nao encontrado. Rode pelo WSL: bash scripts/start-basic.sh
  exit /b 1
)

bash scripts/start-basic.sh
