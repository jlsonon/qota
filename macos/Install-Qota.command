#!/usr/bin/env bash
set -e

# Resolve directory
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "=================================================="
echo "          QOTA MACOS ONE-CLICK INSTALLER          "
echo "=================================================="
echo ""

# Ensure execute permissions
chmod +x ./install.sh ./uninstall.sh 2>/dev/null || true

# Run install script
./install.sh

echo ""
echo "[✓] Launching QOTA Desktop HUD..."
open -a Qota 2>/dev/null || npm start 2>/dev/null || true

echo ""
echo "=================================================="
echo "  QOTA is now running in your Menu Bar & HUD!     "
echo "=================================================="
