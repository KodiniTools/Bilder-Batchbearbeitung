const { contextBridge } = require('electron')

// Expose minimal API to renderer if needed in the future
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true
})
