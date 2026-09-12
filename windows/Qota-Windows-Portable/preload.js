const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('antigravityAPI', {
  getQuotaStatus: () => ipcRenderer.invoke('get-quota-status'),
  refreshQuota: () => ipcRenderer.invoke('refresh-quota'),
  manualRefillSprint: () => ipcRenderer.invoke('manual-refill-sprint'),
  setSprintRemaining: (units) => ipcRenderer.invoke('set-sprint-remaining', units),
  setActiveModel: (modelId) => ipcRenderer.invoke('set-active-model', modelId),
  logConsumption: (modelId, units, note) => ipcRenderer.invoke('log-consumption', { modelId, units, note }),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  setWindowMode: (mode) => ipcRenderer.invoke('set-window-mode', mode),
  setHudWeekly: (show) => ipcRenderer.invoke('set-hud-weekly', show),
  hideWindow: () => ipcRenderer.send('hide-window'),
  quitApp: () => ipcRenderer.send('quit-app'),
  onQuotaUpdated: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('quota-updated', subscription);
    return () => ipcRenderer.removeListener('quota-updated', subscription);
  }
});
