@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall_backend_autostart.ps1"

if errorlevel 1 (
    echo.
    echo Autostart removal failed. Check the message above.
    pause >nul
)
