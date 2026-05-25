@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_backend_autostart.ps1"

if errorlevel 1 (
    echo.
    echo Autostart installation failed. Check the message above.
    pause >nul
)
