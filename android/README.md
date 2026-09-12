# QOTA — Android Distribution & Companion HUD

This folder contains the complete Android project, native floating overlay service, Progressive Web App (PWA) manifest, and automated installation scripts.

---

## Included Artifacts & Contents

| File / Folder | Type | Description |
|---|---|---|
| **`app/`** | Android Studio Module | Complete native Android application source with `FloatingHudService` and `MainActivity` |
| **`app/src/main/assets/`** | Embedded Assets | 100% offline responsive QOTA dashboard web bundle |
| **`manifest.json`** | Web App Manifest | Enables 0-install native PWA installation from Chrome / Edge on Android |
| **`service-worker.js`** | Service Worker | Offline cache and telemetric background sync for Android PWA |
| **`install-adb.sh`** | Shell Script | Automated 1-command installer via ADB with automatic `SYSTEM_ALERT_WINDOW` permission grant |
| **`build-apk.sh`** | Build Script | Gradle command-line script to assemble `app-debug.apk` / `app-release.apk` |

---

## Installation Methods

### Method 1: Instant PWA (Zero-Install / Add to Home Screen)
1. Open Chrome or Samsung Internet on your Android device.
2. Navigate to your QOTA deployment or local server URL.
3. Tap the browser menu (<kbd>&vellip;</kbd>) &rarr; **"Add to Home screen"** or **"Install app"**.
4. QOTA launches fullscreen with zero URL bar and full offline caching.

### Method 2: Sideload via ADB (Native Floating HUD)
If you have an Android device or emulator with USB Debugging enabled:
```bash
./android/install-adb.sh
```
This script will:
1. Detect your device.
2. Build and install the APK.
3. Automatically grant the `Display over other apps` overlay permission.
4. Launch QOTA.

### Method 3: Android Studio
1. Open **Android Studio**.
2. Select **Open an Existing Project** and choose the `android/` directory.
3. Click **Run** (<kbd>Shift</kbd> + <kbd>F10</kbd>) to deploy directly to your physical phone or emulator.

---

## Native Floating HUD Service
When **Floating HUD** is enabled, QOTA renders a compact, translucent pill that floats over all open Android apps (Termux, GitHub, Chrome). You can drag the pill anywhere on your screen and tap it to instantly expand the full quota dashboard.
