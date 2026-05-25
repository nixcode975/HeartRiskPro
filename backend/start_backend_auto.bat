@echo off
setlocal
cd /d "%~dp0\.."

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CD%\start_app.ps1"

if errorlevel 1 (
    echo.
    echo HeartRisk backend startup failed. Check the message above.
    pause >nul
)
