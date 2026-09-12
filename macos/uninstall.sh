#!/usr/bin/env bash
set -euo pipefail

echo "==> Uninstalling Qota from macOS..."

# Unload and remove LaunchAgent
LAUNCH_AGENT="$HOME/Library/LaunchAgents/com.qota.hud.plist"
if [ -f "$LAUNCH_AGENT" ]; then
  echo "[+] Unloading LaunchAgent..."
  launchctl unload "$LAUNCH_AGENT" 2>/dev/null || true
  rm -f "$LAUNCH_AGENT"
fi

# Kill any running Qota instance
pkill -f "Qota" 2>/dev/null || true

# Remove Application
if [ -d "/Applications/Qota.app" ]; then
  echo "[+] Removing /Applications/Qota.app..."
  rm -rf "/Applications/Qota.app"
fi

# Remove CLI shortcuts
rm -f "/usr/local/bin/qota" "$HOME/.local/bin/qota"

echo "[+] Qota uninstalled successfully."
