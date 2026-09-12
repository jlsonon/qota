#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Packaging Qota for macOS..."

# 1. Prepare App Bundle
APP_DIR="$SCRIPT_DIR/Qota.app"
rm -rf "$APP_DIR"
cp -R "$ROOT_DIR/node_modules/electron/dist/Electron.app" "$APP_DIR"

# 2. Update Info.plist
INFO_PLIST="$APP_DIR/Contents/Info.plist"
plutil -replace CFBundleDisplayName -string "Qota" "$INFO_PLIST"
plutil -replace CFBundleName -string "Qota" "$INFO_PLIST"
plutil -replace CFBundleIdentifier -string "com.qota.hud" "$INFO_PLIST"
plutil -replace CFBundleExecutable -string "Qota" "$INFO_PLIST"

# 3. Rename Binary
mv "$APP_DIR/Contents/MacOS/Electron" "$APP_DIR/Contents/MacOS/Qota"

# 4. Generate ICNS Icon
ICON_DIR="$(mktemp -d)/app.iconset"
mkdir -p "$ICON_DIR"
sips -z 16 16     "$ROOT_DIR/assets/icon.png" --out "$ICON_DIR/icon_16x16.png" >/dev/null 2>&1 || true
sips -z 32 32     "$ROOT_DIR/assets/icon.png" --out "$ICON_DIR/icon_16x16@2x.png" >/dev/null 2>&1 || true
sips -z 32 32     "$ROOT_DIR/assets/icon.png" --out "$ICON_DIR/icon_32x32.png" >/dev/null 2>&1 || true
sips -z 64 64     "$ROOT_DIR/assets/icon.png" --out "$ICON_DIR/icon_32x32@2x.png" >/dev/null 2>&1 || true
sips -z 128 128   "$ROOT_DIR/assets/icon.png" --out "$ICON_DIR/icon_128x128.png" >/dev/null 2>&1 || true
sips -z 256 256   "$ROOT_DIR/assets/icon.png" --out "$ICON_DIR/icon_128x128@2x.png" >/dev/null 2>&1 || true
sips -z 256 256   "$ROOT_DIR/assets/icon.png" --out "$ICON_DIR/icon_256x256.png" >/dev/null 2>&1 || true
sips -z 512 512   "$ROOT_DIR/assets/icon.png" --out "$ICON_DIR/icon_256x256@2x.png" >/dev/null 2>&1 || true
sips -z 512 512   "$ROOT_DIR/assets/icon.png" --out "$ICON_DIR/icon_512x512.png" >/dev/null 2>&1 || true

ICNS_FILE="$(mktemp -d)/electron.icns"
iconutil -c icns "$ICON_DIR" -o "$ICNS_FILE" >/dev/null 2>&1 || true
if [ -f "$ICNS_FILE" ]; then
  cp "$ICNS_FILE" "$APP_DIR/Contents/Resources/electron.icns"
fi

# 5. Populate app resources
APP_RESOURCES="$APP_DIR/Contents/Resources/app"
rm -rf "$APP_RESOURCES"
mkdir -p "$APP_RESOURCES"
cp -R "$ROOT_DIR/main.js" "$APP_RESOURCES/"
cp -R "$ROOT_DIR/preload.js" "$APP_RESOURCES/"
cp -R "$ROOT_DIR/package.json" "$APP_RESOURCES/"
cp -R "$ROOT_DIR/src" "$APP_RESOURCES/"
cp -R "$ROOT_DIR/assets" "$APP_RESOURCES/"

# Remove default_app.asar if present
rm -f "$APP_DIR/Contents/Resources/default_app.asar"

echo "==> Built standalone $APP_DIR successfully."

# 6. Create DMG Installer
DMG_STAGE="$(mktemp -d)"
cp -R "$APP_DIR" "$DMG_STAGE/"
ln -s /Applications "$DMG_STAGE/Applications"

DMG_OUTPUT="$SCRIPT_DIR/Qota-macOS-Universal.dmg"
rm -f "$DMG_OUTPUT"

echo "==> Generating disk image $DMG_OUTPUT..."
hdiutil create -volname "Qota" -srcfolder "$DMG_STAGE" -ov -format UDZO "$DMG_OUTPUT"

rm -rf "$DMG_STAGE"
echo "==> Successfully created $DMG_OUTPUT."
