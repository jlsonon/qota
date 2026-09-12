# QOTA — Windows Automated PowerShell Installer
# Installs Qota to %LOCALAPPDATA%\Qota, creates Shortcuts, and registers System Tray Autostart.

$ErrorActionPreference = "Stop"
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "          QOTA WINDOWS AUTOMATED INSTALLER        " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$InstallDir = "$env:LOCALAPPDATA\Qota"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "[+] Preparing installation directory: $InstallDir" -ForegroundColor Green
if (!(Test-Path -Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Host "[+] Copying application files..." -ForegroundColor Green
$FilesToCopy = @("main.js", "preload.js", "package.json", "src", "assets")
foreach ($Item in $FilesToCopy) {
    $SourcePath = Join-Path $RootDir $Item
    if (Test-Path $SourcePath) {
        Copy-Item -Path $SourcePath -Destination $InstallDir -Recurse -Force
    }
}

# Copy Windows helper scripts
Copy-Item -Path (Join-Path $ScriptDir "launch-qota.vbs") -Destination $InstallDir -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $ScriptDir "run-portable.bat") -Destination $InstallDir -Force -ErrorAction SilentlyContinue

# Ensure node_modules or electron runtime
$ElectronPath = ""
if (Test-Path (Join-Path $RootDir "node_modules\electron\dist\electron.exe")) {
    $TargetNodeModules = Join-Path $InstallDir "node_modules"
    Write-Host "[+] Bundling Electron runtime..." -ForegroundColor Green
    if (!(Test-Path $TargetNodeModules)) { New-Item -ItemType Directory -Path $TargetNodeModules -Force | Out-Null }
    Copy-Item -Path (Join-Path $RootDir "node_modules\electron") -Destination $TargetNodeModules -Recurse -Force
    $ElectronPath = Join-Path $InstallDir "node_modules\electron\dist\electron.exe"
}

# Create Desktop and Start Menu Shortcuts
Write-Host "[+] Creating Shortcuts..." -ForegroundColor Green
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$StartMenuPath = [Environment]::GetFolderPath("Programs")

# Desktop Shortcut
$DesktopShortcut = $WshShell.CreateShortcut((Join-Path $DesktopPath "Qota.lnk"))
$DesktopShortcut.TargetPath = "wscript.exe"
$DesktopShortcut.Arguments = "`"$InstallDir\launch-qota.vbs`""
$DesktopShortcut.WorkingDirectory = $InstallDir
$IconPath = Join-Path $InstallDir "assets\icon.png"
if (Test-Path $IconPath) { $DesktopShortcut.IconLocation = $IconPath }
$DesktopShortcut.Save()

# Start Menu Shortcut
$StartMenuShortcut = $WshShell.CreateShortcut((Join-Path $StartMenuPath "Qota.lnk"))
$StartMenuShortcut.TargetPath = "wscript.exe"
$StartMenuShortcut.Arguments = "`"$InstallDir\launch-qota.vbs`""
$StartMenuShortcut.WorkingDirectory = $InstallDir
if (Test-Path $IconPath) { $StartMenuShortcut.IconLocation = $IconPath }
$StartMenuShortcut.Save()

# Register Autostart in Registry
Write-Host "[+] Registering Windows Startup Registry key..." -ForegroundColor Green
$RunKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$LaunchCmd = "wscript.exe `"$InstallDir\launch-qota.vbs`""
Set-ItemProperty -Path $RunKey -Name "Qota" -Value $LaunchCmd

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "    INSTALLATION COMPLETE: Qota is installed!     " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "• Desktop & Start Menu shortcuts created."
Write-Host "• Launching Qota into Windows System Tray now..."
Write-Host "==================================================" -ForegroundColor Cyan

# Launch
Start-Process "wscript.exe" -ArgumentList "`"$InstallDir\launch-qota.vbs`""
