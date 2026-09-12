# QOTA — macOS Distribution & Installation

This folder contains the complete standalone distribution, installers, and background agents for macOS (Apple Silicon `arm64` & Intel `x64`).

---

## Included Artifacts & Contents

| File | Type | Description |
|---|---|---|
| **`Qota-macOS-Universal.dmg`** | Disk Image | Ready-to-install drag-and-drop macOS installer with `/Applications` link |
| **`Qota.app`** | App Bundle | Standalone macOS application with `NSScreenSaverWindowLevel` (1001) entitlements |
| **`install.sh`** | Shell Script | Automated CLI installer: installs app, clears Gatekeeper quarantine, creates terminal `qota` alias, and registers LaunchAgent |
| **`uninstall.sh`** | Shell Script | Clean uninstallation script: unloads LaunchAgent and cleans up files |
| **`com.qota.hud.plist`** | LaunchAgent | macOS launch configuration for starting Qota in the Menu Bar on system login |
| **`build-macos.sh`** | Build Script | Reproducible script to rebuild `Qota.app` and `Qota-macOS-Universal.dmg` |

---

## Installation Methods

### Method 1: Interactive Drag-and-Drop (.dmg)
1. Double-click `Qota-macOS-Universal.dmg`.
2. Drag `Qota.app` into the **Applications** folder shortcut.
3. Open `Qota` from Spotlight (<kbd>Cmd</kbd> + <kbd>Space</kbd> &rarr; "Qota") or Applications.

### Method 2: One-Command Terminal Installer
Run the automated installer directly from terminal:
```bash
./macos/install.sh
```

### Gatekeeper Note
If macOS displays an unidentified developer warning on first launch, clear quarantine attributes:
```bash
xattr -cr /Applications/Qota.app
```

---

## Uninstallation
```bash
./macos/uninstall.sh
```
