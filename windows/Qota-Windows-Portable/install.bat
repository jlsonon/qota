@echo off
title Qota Installer
echo ==================================================
echo           QOTA WINDOWS AUTOMATED INSTALLER        
echo ==================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo [!] An error occurred during installation.
    pause
)
