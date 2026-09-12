#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Building QOTA Android APK..."

if command -v ./gradlew >/dev/null 2>&1; then
  ./gradlew assembleDebug
elif command -v gradle >/dev/null 2>&1; then
  gradle assembleDebug
else
  echo "[!] Gradle wrapper not yet initialized."
  echo "• To build from terminal: gradle wrapper && ./gradlew assembleDebug"
  echo "• Or open the 'android/' directory in Android Studio and click 'Build APK'."
fi
