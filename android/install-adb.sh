#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "         QOTA ANDROID ADB DEPLOYMENT TOOL         "
echo "=================================================="

# Check if ADB is available
if ! command -v adb >/dev/null 2>&1; then
  echo "[-] Error: 'adb' command not found. Install Android Platform Tools or add to PATH."
  exit 1
fi

echo "[+] Checking for connected Android devices/emulators..."
DEVICES=$(adb devices | grep -v "List of devices" | grep "device" || true)

if [ -z "$DEVICES" ]; then
  echo "[-] No connected Android devices or emulators found."
  echo "• Enable USB Debugging on your Android phone, or start an Android Emulator."
  exit 1
fi

echo "[+] Target device detected:"
echo "$DEVICES"

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

if [ ! -f "$APK_PATH" ]; then
  echo "[+] Building Android APK via Gradle..."
  ./android/build-apk.sh
fi

if [ -f "$APK_PATH" ]; then
  echo "[+] Installing APK onto Android device..."
  adb install -r "$APK_PATH"

  echo "[+] Granting 'Draw over other apps' overlay permission..."
  adb shell appops set com.qota.hud SYSTEM_ALERT_WINDOW allow 2>/dev/null || true

  echo "[+] Launching QOTA..."
  adb shell am start -n com.qota.hud/.MainActivity

  echo "=================================================="
  echo "   DEPLOYMENT COMPLETE: QOTA is live on Android!  "
  echo "=================================================="
else
  echo "[-] Could not find compiled APK. Open the 'android/' folder in Android Studio to build and run."
fi
