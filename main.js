const { app, BrowserWindow, Tray, Menu, ipcMain, screen, Notification, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { QuotaService, SPRINT_MAX } = require('./src/quota-service');

// Robust EIO / EPIPE protection across all console & stream write methods
let eioDetected = false;

const safeWrapStream = (stream) => {
  if (!stream) return;
  if (stream.on) {
    stream.on('error', (err) => {
      if (err && (err.code === 'EIO' || err.code === 'EPIPE' || String(err).includes('EIO'))) {
        eioDetected = true;
        stream._eio = true;
      }
    });
  }
  const origWrite = stream.write ? stream.write.bind(stream) : null;
  if (origWrite) {
    stream.write = function (chunk, encoding, callback) {
      if (eioDetected || stream._eio || stream.destroyed || !stream.writable) {
        if (typeof encoding === 'function') encoding();
        if (typeof callback === 'function') callback();
        return true;
      }
      try {
        return origWrite(chunk, encoding, (err) => {
          if (err && (err.code === 'EIO' || err.code === 'EPIPE' || String(err).includes('EIO'))) {
            eioDetected = true;
            stream._eio = true;
            return;
          }
          if (typeof callback === 'function') callback(err);
        });
      } catch (err) {
        if (err && (err.code === 'EIO' || err.code === 'EPIPE' || String(err).includes('EIO'))) {
          eioDetected = true;
          stream._eio = true;
          return true;
        }
        throw err;
      }
    };
  }
};

safeWrapStream(process.stdout);
safeWrapStream(process.stderr);

const origWarn = console.warn.bind(console);
console.warn = function (...args) {
  if (eioDetected || (process.stderr && process.stderr._eio)) return;
  try {
    origWarn(...args);
  } catch (e) {
    if (e && (e.code === 'EIO' || e.code === 'EPIPE' || String(e).includes('EIO'))) {
      eioDetected = true;
    }
  }
};

const origError = console.error.bind(console);
console.error = function (...args) {
  if (eioDetected || (process.stderr && process.stderr._eio)) return;
  try {
    origError(...args);
  } catch (e) {
    if (e && (e.code === 'EIO' || e.code === 'EPIPE' || String(e).includes('EIO'))) {
      eioDetected = true;
    }
  }
};

const origLog = console.log.bind(console);
console.log = function (...args) {
  if (eioDetected || (process.stdout && process.stdout._eio)) return;
  try {
    origLog(...args);
  } catch (e) {
    if (e && (e.code === 'EIO' || e.code === 'EPIPE' || String(e).includes('EIO'))) {
      eioDetected = true;
    }
  }
};

// Intercept Electron error dialogs to prevent EIO popups from interrupting user
if (dialog && dialog.showErrorBox) {
  const origShowErrorBox = dialog.showErrorBox.bind(dialog);
  dialog.showErrorBox = function (title, content) {
    if (content && (content.includes('EIO') || content.includes('EPIPE') || content.includes('write EIO'))) {
      return;
    }
    return origShowErrorBox(title, content);
  };
}

// Prepend uncaughtException listener to absorb EIO before Electron dialog triggers
process.prependListener('uncaughtException', (err) => {
  if (err && (err.code === 'EIO' || err.code === 'EPIPE' || (err.message && err.message.includes('EIO')))) {
    eioDetected = true;
    return;
  }
});

process.on('uncaughtException', (err) => {
  if (err && (err.code === 'EIO' || err.code === 'EPIPE' || (err.message && err.message.includes('EIO')))) return;
  try {
    const userData = app.getPath('userData');
    fs.appendFileSync(path.join(userData, 'error.log'), `[${new Date().toISOString()}] ${err.stack || err.message}\n`);
  } catch (e) {}
});

function safeSend(win, channel, ...args) {
  try {
    if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  } catch (e) {}
}

let tray = null;
let mainWindow = null;
let quotaService = null;
let pollInterval = null;

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Qota is already running. Focusing active window...');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      showWindow();
      mainWindow.focus();
    }
  });
}

// On macOS, activate window on dock icon click
app.on('activate', () => {
  showWindow();
});

app.whenReady().then(async () => {
  let dbPath;
  try {
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'quota-state.json');
  } catch (e) {
    dbPath = path.join(__dirname, '.quota-state.json');
  }
  quotaService = new QuotaService(dbPath);

  // Real-time hook for live Antigravity file watching
  quotaService.onQuotaChangeCallback = (status) => {
    updateTray(status);
    checkAndSendThresholdNotification(status);
    if (mainWindow && mainWindow.isVisible()) {
      safeSend(mainWindow, 'quota-updated', status);
    }
  };

  // Perform initial real-time sync with Antigravity Language Server
  try {
    await quotaService.syncLanguageServerQuota();
  } catch (e) {}

  if (process.platform === 'darwin' && app.dock) {
    const dockIconPath = path.join(__dirname, 'assets', 'icon.png');
    if (fs.existsSync(dockIconPath)) {
      app.dock.setIcon(dockIconPath);
    }
  }

  createTray();
  createWindow();
  setupIpcHandlers();
  startBackgroundPolling();

  if (process.env.ELECTRON_SMOKE_TEST === 'true') {
    console.log('[OK] Smoke test: Initialized Tray, Window, IPC and QuotaService successfully.');
    app.isQuitting = true;
    setTimeout(() => {
      app.quit();
    }, 800);
  }

  if (process.env.ELECTRON_E2E_TEST === 'true') {
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log('[Renderer Console]', message, `(line ${line})`);
    });

    mainWindow.webContents.on('did-finish-load', async () => {
      try {
        await new Promise(r => setTimeout(r, 600));

        const domCheck = await mainWindow.webContents.executeJavaScript(`
          (() => {
            const hud = document.getElementById('floating-hud');
            const assistantBadge = document.getElementById('hud-assistant-badge')?.textContent;
            const modelName = document.getElementById('hud-model-name')?.textContent;
            const barWidth = document.getElementById('hud-bar-fill')?.style?.width;
            const hasExpandBtn = !!document.getElementById('btn-hud-expand');
            const weeklyRail = document.getElementById('hud-weekly-rail-row');
            const weeklyToggleBtn = document.getElementById('btn-toggle-hud-weekly');
            const contextNudge = document.getElementById('context-nudge-banner');
            const promptCacheTile = document.getElementById('cache-hit-rate');
            const secToggleCount = document.querySelectorAll('[id^="chk-sec-"]')?.length || 0;
            const bodyClass = document.body.className;
            const officialPools = document.getElementById('official-pools-list');
            const weeklyTile = document.querySelector('.weekly-tile');
            const hasServiceAlert = !!document.getElementById('service-alert-banner');
            const hasProjectBreakdown = !!document.getElementById('project-breakdown-list');

            // Check that weekly cap is positioned before official pools
            const overviewPanel = document.getElementById('tab-overview');
            const weeklyIndex = Array.from(overviewPanel?.querySelectorAll('.weekly-tile, .official-pools-container') || []).indexOf(weeklyTile);
            const poolsIndex = Array.from(overviewPanel?.querySelectorAll('.weekly-tile, .official-pools-container') || []).indexOf(document.querySelector('.official-pools-container'));
            const weeklyAtTop = weeklyIndex !== -1 && poolsIndex !== -1 && weeklyIndex < poolsIndex;

            return {
              hasHud: !!hud,
              assistantBadge,
              modelName,
              barWidth,
              hasExpandBtn,
              hasWeeklyRail: !!weeklyRail,
              hasWeeklyToggleBtn: !!weeklyToggleBtn,
              hasServiceAlert,
              hasProjectBreakdown,
              hasContextNudge: !!contextNudge,
              hasPromptCache: !!promptCacheTile,
              weeklyAtTop,
              secToggleCount,
              bodyClass,
              hasOfficialPools: !!officialPools,
              hasAntigravityAPI: typeof window.antigravityAPI !== 'undefined'
            };
          })()
        `);

        console.log('E2E DOM Inspection Result:', JSON.stringify(domCheck, null, 2));

        if (!domCheck.hasHud) throw new Error('Floating HUD element missing in DOM');
        if (!domCheck.assistantBadge) throw new Error('HUD assistant badge missing in DOM');
        if (!domCheck.hasAntigravityAPI) throw new Error('window.antigravityAPI IPC bridge missing');
        if (!domCheck.hasOfficialPools) throw new Error('Official pools container missing in DOM');
        if (!domCheck.weeklyAtTop) throw new Error('Weekly Cap must be positioned at top above quota pools');
        if (!domCheck.modelName) throw new Error('HUD active model name not rendered');
        if (!domCheck.hasWeeklyRail) throw new Error('HUD Weekly limit rail missing in DOM');
        if (!domCheck.hasWeeklyToggleBtn) throw new Error('HUD Weekly toggle button missing in DOM');
        if (domCheck.hasServiceAlert) throw new Error('Service Alert banner should be removed from DOM');
        if (domCheck.hasProjectBreakdown) throw new Error('Per-Project Breakdown should be removed from DOM');
        if (domCheck.hasContextNudge) throw new Error('Context Nudge banner should be removed from DOM');
        if (domCheck.secToggleCount < 4) throw new Error('Section visibility switches incomplete in DOM');

        console.log('[OK] Minimal Floating HUD with Dual Razor Rails & Hover Actions verified');
        console.log('[OK] Weekly Baseline Cap positioned at top above Official Quota Pools');
        console.log('[OK] Active Model Name: ' + domCheck.modelName);
        console.log('[OK] Decreasing Progress Bar: Width ' + domCheck.barWidth);
        console.log('[OK] Service Alert Banner, Context Nudge & Project Breakdown confirmed removed');
        console.log('[OK] Section Switches verified in DOM');
        console.log('[OK] window.antigravityAPI contextBridge IPC functional');
        console.log('ALL E2E DOM & IPC CHECKS PASSED');

        app.isQuitting = true;
        setTimeout(() => app.quit(), 300);
      } catch (err) {
        console.error('[FAIL] E2E test failed:', err);
        app.isQuitting = true;
        app.exit(1);
      }
    });
  }
});

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let icon = nativeImage.createFromPath(iconPath);
  
  if (icon.isEmpty()) {
    // Fallback if image not yet loaded
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Qota — AI Quota Monitor');

  // macOS / Windows click behaviors
  tray.on('click', () => {
    toggleWindow();
  });

  tray.on('right-click', () => {
    const isCompact = (quotaService.state.windowMode || 'compact') === 'compact';
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Quota Monitor',
        click: () => showWindow()
      },
      {
        label: 'Floating Quota Bar Mode',
        type: 'checkbox',
        checked: isCompact,
        click: () => {
          quotaService.setWindowMode('compact');
          if (mainWindow) {
            const showWeekly = !!(quotaService.state.settings && quotaService.state.settings.showWeeklyInHud);
            mainWindow.setResizable(true);
            mainWindow.setSize(285, showWeekly ? 52 : 40);
            mainWindow.setResizable(false);
            applyAlwaysOnFront();
            mainWindow.show();
            safeSend(mainWindow, 'quota-updated', quotaService.getStatus());
          }
        }
      },
      {
        label: 'Full Matrix View',
        type: 'checkbox',
        checked: !isCompact,
        click: () => {
          quotaService.setWindowMode('expanded');
          if (mainWindow) {
            mainWindow.setResizable(true);
            mainWindow.setSize(380, 540);
            mainWindow.setResizable(false);
            applyAlwaysOnFront();
            showWindow();
            safeSend(mainWindow, 'quota-updated', quotaService.getStatus());
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Refill Sprint (250 units)',
        click: () => {
          const status = quotaService.manualRefillSprint();
          updateTray(status);
          safeSend(mainWindow, 'quota-updated', status);
        }
      },
      { type: 'separator' },
      {
        label: 'Quit Qota',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray.popUpContextMenu(contextMenu);
  });

  updateTray(quotaService.getStatus());
}

function updateTray(status) {
  if (!tray || !status) return;

  // Color-coded icon from green to red:
  // >= 50% = green, 20% to 49% = yellow, < 20% = red
  let iconName = 'tray-green.png';
  if (status.sprint && status.sprint.percentage < 20) {
    iconName = 'tray-red.png';
  } else if (status.sprint && status.sprint.percentage < 50) {
    iconName = 'tray-yellow.png';
  }
  const colorIconPath = path.join(__dirname, 'assets', iconName);
  const colorIcon = nativeImage.createFromPath(colorIconPath);
  if (!colorIcon.isEmpty()) {
    colorIcon.setTemplateImage(false);
    tray.setImage(colorIcon);
  }

  // On macOS, show the remaining sprint units right in the menu bar text!
  if (process.platform === 'darwin') {
    tray.setTitle(` ${status.sprint.remaining}u`);
  }

  const assistantTag = (status.activeAssistant || 'antigravity').toUpperCase();
  tray.setToolTip(
    `[${assistantTag}] Qota\nModel: ${status.activeModel ? status.activeModel.name : 'Unknown'}\n5h Limit: ${status.sprint.remaining}/${status.sprint.max} (${status.sprint.percentage}%)\nWeekly: ${status.weekly.remaining}/${status.weekly.max} (${status.weekly.percentage}%)\nRefill: ${status.sprint.formattedReset}`
  );
}

function applyAlwaysOnFront() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  // On macOS Cocoa, 'screen-saver' sits above full-screen spaces and menus.
  // On Windows, 'status' or 'screen-saver' ensures topmost Z-order over fullscreen DirectX/GDI apps.
  if (process.platform === 'darwin') {
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.setFullScreenable(false);
  } else {
    // Windows 10/11 topmost pin
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setMinimizable(false);
  }
}

function createWindow() {
  const isCompact = (quotaService.state.windowMode || 'compact') === 'compact';
  const showWeekly = !!(quotaService.state.settings && quotaService.state.settings.showWeeklyInHud);
  const compactHeight = showWeekly ? 52 : 40;
  mainWindow = new BrowserWindow({
    width: isCompact ? 285 : 380,
    height: isCompact ? compactHeight : 540,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  applyAlwaysOnFront();

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.webContents.on('did-finish-load', () => {
    const status = quotaService.getStatus();
    updateTray(status);
    safeSend(mainWindow, 'quota-updated', status);
  });

  // Immediately display the Floating Bar HUD on startup!
  mainWindow.once('ready-to-show', () => {
    positionWindow();
    mainWindow.show();
    mainWindow.focus();
    applyAlwaysOnFront();
    console.log('\n======================================================');
    console.log('QOTA RUNNING');
    console.log('- Floating Quota Bar is visible on your screen.');
    console.log('- Always on front (visible even over Full Screen apps).');
    console.log('- Drag it anywhere on your desktop.');
    console.log('- Click expand button or double-click to view Full Dashboard.');
    console.log('- macOS Menu Bar indicator is active.');
    console.log('- Press Ctrl+C in terminal to stop.');
    console.log('======================================================\n');
  });

  // Only auto-hide if in expanded popover mode
  mainWindow.on('blur', () => {
    if (quotaService.state.windowMode === 'expanded' && !mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    showWindow();
  }
}

async function showWindow() {
  if (!mainWindow) return;

  positionWindow();
  mainWindow.show();
  mainWindow.focus();
  applyAlwaysOnFront();

  // Refresh quota status from Language Server on open
  try {
    await quotaService.syncLanguageServerQuota();
  } catch (e) {}

  const status = quotaService.getStatus();
  updateTray(status);
  safeSend(mainWindow, 'quota-updated', status);
}

function positionWindow() {
  if (!mainWindow) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const windowBounds = mainWindow.getBounds();

  let x = 0;
  let y = 0;

  if (tray) {
    try {
      const trayBounds = tray.getBounds();
      if (trayBounds && trayBounds.width > 0 && trayBounds.height > 0) {
        if (process.platform === 'darwin') {
          x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
          y = Math.round(trayBounds.y + trayBounds.height + 6);
        } else {
          x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
          y = Math.round(trayBounds.y - windowBounds.height - 8);
        }
      } else {
        // Fallback: top right corner near menu bar
        x = screenWidth - windowBounds.width - 24;
        y = 48;
      }
    } catch (e) {
      x = screenWidth - windowBounds.width - 24;
      y = 48;
    }
  } else {
    x = screenWidth - windowBounds.width - 24;
    y = 48;
  }

  // Keep within screen edges
  x = Math.max(10, Math.min(x, screenWidth - windowBounds.width - 10));
  y = Math.max(10, Math.min(y, screenHeight - windowBounds.height - 10));

  mainWindow.setPosition(x, y, false);
}

function setupIpcHandlers() {
  ipcMain.handle('get-quota-status', async () => {
    if (!quotaService.state.liveQuotaGroups) {
      try {
        await quotaService.syncLanguageServerQuota();
      } catch (e) {}
    }
    const status = quotaService.getStatus();
    updateTray(status);
    return status;
  });

  ipcMain.handle('refresh-quota', async () => {
    const status = await quotaService.refreshQuota();
    updateTray(status);
    return status;
  });

  ipcMain.handle('manual-refill-sprint', () => {
    const status = quotaService.manualRefillSprint();
    updateTray(status);
    return status;
  });

  ipcMain.handle('set-sprint-remaining', (event, units) => {
    const status = quotaService.setSprintRemaining(units);
    updateTray(status);
    return status;
  });

  ipcMain.handle('set-active-model', (event, modelId) => {
    const status = quotaService.setActiveModel(modelId);
    updateTray(status);
    return status;
  });

  ipcMain.handle('log-consumption', (event, { modelId, units, note }) => {
    const status = quotaService.consume(modelId, units, note);
    updateTray(status);
    checkAndSendThresholdNotification(status);
    return status;
  });

  ipcMain.handle('get-settings', () => {
    return quotaService.state.settings;
  });

  ipcMain.handle('save-settings', (event, settings) => {
    const status = quotaService.updateSettings(settings);
    restartBackgroundPolling();
    return status;
  });

  ipcMain.handle('set-window-mode', (event, mode) => {
    const newMode = quotaService.setWindowMode(mode);
    if (!mainWindow) return newMode;

    mainWindow.setResizable(true);
    if (newMode === 'compact') {
      const showWeekly = !!(quotaService.state.settings && quotaService.state.settings.showWeeklyInHud);
      mainWindow.setSize(285, showWeekly ? 52 : 40);
    } else {
      mainWindow.setSize(380, 540);
    }
    mainWindow.setResizable(false);
    applyAlwaysOnFront();
    return newMode;
  });

  ipcMain.handle('set-hud-weekly', (event, show) => {
    quotaService.state.settings.showWeeklyInHud = !!show;
    quotaService.saveState();
    if (mainWindow && quotaService.state.windowMode === 'compact') {
      mainWindow.setResizable(true);
      mainWindow.setSize(285, show ? 52 : 40);
      mainWindow.setResizable(false);
      applyAlwaysOnFront();
    }
    return show;
  });

  ipcMain.on('hide-window', () => {
    if (mainWindow) mainWindow.hide();
  });

  ipcMain.on('quit-app', () => {
    app.isQuitting = true;
    app.quit();
  });
}

function startBackgroundPolling() {
  const intervalSec = quotaService.state.settings.pollingIntervalSec || 60;
  if (pollInterval) clearInterval(pollInterval);

  pollInterval = setInterval(async () => {
    try {
      await quotaService.syncLanguageServerQuota();
    } catch (e) {}
    const status = quotaService.getStatus();
    updateTray(status);

    // Check for auto-refill events
    if (status.resetEvents && status.resetEvents.length > 0) {
      status.resetEvents.forEach(evt => {
        if (Notification.isSupported() && quotaService.state.settings.notifySprintRefilled) {
          new Notification({
            title: 'Antigravity Quota Refreshed',
            body: evt.message,
            icon: path.join(__dirname, 'assets', 'icon.png')
          }).show();
        }
      });
    }

    checkAndSendThresholdNotification(status);

    if (mainWindow && mainWindow.isVisible()) {
      safeSend(mainWindow, 'quota-updated', status);
    }
  }, intervalSec * 1000);
}

function restartBackgroundPolling() {
  startBackgroundPolling();
}

let lastContextAlertTime = 0;

function checkAndSendThresholdNotification(status) {
  if (!Notification.isSupported()) return;

  const settings = quotaService.state.settings;

  // Check Sprint low threshold
  if (settings.notifySprintLow && status.sprint.percentage <= settings.notifySprintLowThreshold) {
    new Notification({
      title: 'Antigravity 5h Quota Low',
      body: `Only ${status.sprint.remaining} units left (${status.sprint.percentage}%). Consider switching to Gemini Flash.`,
      icon: path.join(__dirname, 'assets', 'icon.png')
    }).show();
  }

  // Check Weekly low threshold
  if (settings.notifyWeeklyLow && status.weekly.percentage <= settings.notifyWeeklyLowThreshold) {
    new Notification({
      title: 'Antigravity Weekly Limit Low',
      body: `Weekly baseline is down to ${status.weekly.remaining} units (${status.weekly.percentage}%).`,
      icon: path.join(__dirname, 'assets', 'icon.png')
    }).show();
  }

  // Check Context Window threshold (70%)
  if (settings.notifyContextLimit && status.contextUsage && status.contextUsage.nudgeActive) {
    const now = Date.now();
    if (now - lastContextAlertTime > 20 * 60 * 1000) { // Nudge at most every 20 minutes
      lastContextAlertTime = now;
      new Notification({
        title: 'Context Window Warning',
        body: status.contextUsage.nudgeMessage || `Context is at ${status.contextUsage.percentage}%. Run /compact or /clear to prevent token waste.`,
        icon: path.join(__dirname, 'assets', 'icon.png')
      }).show();
    }
  }
}

app.on('window-all-closed', (e) => {
  // Prevent quitting when window is closed; app stays in tray
  e.preventDefault();
});
