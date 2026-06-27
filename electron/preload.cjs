const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Open a URL in the system's default browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // App metadata
  getVersion: () => ipcRenderer.invoke('get-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform')
})
