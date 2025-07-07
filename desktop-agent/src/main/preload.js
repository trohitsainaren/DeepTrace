const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  updateToken: (token, user) => ipcRenderer.send('update-token', { token, user }),
  logout: () => ipcRenderer.send('logout'),
  saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
  sendEvent: (event) => ipcRenderer.send('send-event', event)
});
