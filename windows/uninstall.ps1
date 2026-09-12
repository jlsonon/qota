# QOTA — Windows Uninstaller

Write-Host "==> Uninstalling Qota from Windows..." -ForegroundColor Cyan

# Kill running processes
Get-Process -Name "electron", "Qota" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*Qota*" } | Stop-Process -Force

# Remove Registry Autostart
$RunKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
Remove-ItemProperty -Path $RunKey -Name "Qota" -ErrorAction SilentlyContinue
Write-Host "[+] Removed Startup Registry key" -ForegroundColor Green

# Remove Shortcuts
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$StartMenuPath = [Environment]::GetFolderPath("Programs")
Remove-Item -Path (Join-Path $DesktopPath "Qota.lnk") -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $StartMenuPath "Qota.lnk") -Force -ErrorAction SilentlyContinue
Write-Host "[+] Removed Desktop and Start Menu shortcuts" -ForegroundColor Green

# Remove App Folder
$InstallDir = "$env:LOCALAPPDATA\Qota"
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[+] Removed $InstallDir" -ForegroundColor Green
}

Write-Host "[+] Qota uninstalled successfully." -ForegroundColor Green
