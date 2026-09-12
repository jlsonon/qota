#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_SRC="$SCRIPT_DIR/Qota.app"
DEST="/Applications/Qota.app"

echo "=================================================="
echo "          QOTA MACOS AUTOMATED INSTALLER          "
echo "=================================================="

# Check for Qota.app
if [ ! -d "$APP_SRC" ]; then
  echo "[-] Qota.app not found in $SCRIPT_DIR. Running build script..."
  "$SCRIPT_DIR/build-macos.sh"
fi

echo "[+] Installing Qota to /Applications..."
rm -rf "$DEST"
cp -R "$APP_SRC" "$DEST"

echo "[+] Removing macOS Gatekeeper quarantine flags..."
xattr -cr "$DEST" 2>/dev/null || true

echo "[+] Creating CLI shortcut 'qota'..."
BIN_DIR="/usr/local/bin"
if [ -d "$BIN_DIR" ] && [ -w "$BIN_DIR" ]; then
  ln -sf "$DEST/Contents/MacOS/Qota" "$BIN_DIR/qota"
  echo "[+] Installed 'qota' command to $BIN_DIR/qota"
else
  USER_BIN="$HOME/.local/bin"
  mkdir -p "$USER_BIN"
  ln -sf "$DEST/Contents/MacOS/Qota" "$USER_BIN/qota"
  echo "[+] Installed 'qota' command to $USER_BIN/qota"
fi

echo "[+] Installing macOS LaunchAgent for auto-start on login..."
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
mkdir -p "$LAUNCH_AGENT_DIR"
cp "$SCRIPT_DIR/com.qota.hud.plist" "$LAUNCH_AGENT_DIR/"
launchctl unload "$LAUNCH_AGENT_DIR/com.qota.hud.plist" 2>/dev/null || true
launchctl load -w "$LAUNCH_AGENT_DIR/com.qota.hud.plist" 2>/dev/null || true
echo "[+] LaunchAgent registered: $LAUNCH_AGENT_DIR/com.qota.hud.plist"

echo ""
echo "=================================================="
echo "      INSTALLATION COMPLETE: Qota is ready!       "
echo "=================================================="
echo "• Launch from Spotlight or Applications: open -a Qota"
echo "• Or run via terminal: qota"
echo "• Floating HUD & Menu Bar will appear automatically."
echo "=================================================="
