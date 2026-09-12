# QOTA — Windows 10 & 11 Distribution

This folder contains the complete standalone distribution, installers, and background helpers for Microsoft Windows (64-bit).

---

## Included Artifacts & Contents

| File / Folder | Type | Description |
|---|---|---|
| **`install.bat`** | Batch Script | 1-click double-click installer: creates Shortcuts & registers Startup Registry key |
| **`install.ps1`** | PowerShell Script | Core installer engine for `%LOCALAPPDATA%\Qota` |
| **`launch-qota.vbs`** | VBScript | Silent launcher: runs Qota in background without keeping an open terminal window |
| **`run-portable.bat`** | Batch Script | Zero-install runner: instantly launches the portable HUD on any Windows machine |
| **`Qota-Windows-Portable/`**| Folder | Complete pre-assembled standalone Windows portable folder ready to copy/paste |
| **`qota-setup.iss`** | Inno Setup Script | Compiler script to build a single-file `Qota-Setup-x64.exe` installer |
| **`uninstall.ps1`** | PowerShell Script | Clean uninstaller: removes App directory, shortcuts, and registry autostart |

---

## Installation Methods

### Method 1: 1-Click Batch Installer
1. Double-click `install.bat` (or right-click &rarr; "Run with PowerShell" on `install.ps1`).
2. Qota installs into `%LOCALAPPDATA%\Qota`.
3. Shortcuts are created on your **Desktop** and **Start Menu**.
4. The app starts immediately and docks into the Windows System Tray.

### Method 2: Portable Zero-Install Run
1. Open the `Qota-Windows-Portable` folder.
2. Double-click `run-portable.bat`.
3. The floating HUD appears immediately on your screen with no installation required.

### Method 3: Compiling `Qota-Setup-x64.exe`
If you have [Inno Setup](https://jrsoftware.org/isinfo.php) installed on Windows:
```cmd
iscc windows\qota-setup.iss
```
This generates `Qota-Setup-x64.exe` with a graphical setup wizard and Windows Settings uninstaller.

---

## Uninstallation
Run PowerShell as current user:
```powershell
powershell -ExecutionPolicy Bypass -File .\windows\uninstall.ps1
```
