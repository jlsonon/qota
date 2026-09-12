@echo off
title Qota Portable HUD
cd /d "%~dp0.."
if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" .
) else (
    npm start
)
