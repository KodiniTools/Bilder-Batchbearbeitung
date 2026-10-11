const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')

// Windows: App-User-Model-ID für Taskbar-Pinning und Benachrichtigungen
if (process.platform === 'win32') {
  app.setAppUserModelId('com.kodinitools.bilderserie-bearbeiten')
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Disable web security only in dev; keep sandbox in production
      sandbox: false,
    },
    title: `Bilderserie Bearbeiten v${app.getVersion()} – KodiniTools`,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#1a1a2e',
  })

  // Show window once ready (avoids white flash on startup)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // In production, load the built files
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  } else {
    mainWindow.loadURL('http://localhost:3000/bilderseriebearbeiten/')
    mainWindow.webContents.openDevTools()
  }

  // Open all external links in the default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appUrl = app.isPackaged
      ? `file://${path.join(__dirname, '..', 'dist', 'index.html')}`
      : 'http://localhost:3000'

    if (!url.startsWith(appUrl) && !url.startsWith('file://')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // Graceful error handling if the built file is missing
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    if (app.isPackaged) {
      dialog.showErrorBox(
        'Ladefehler',
        `Die App konnte nicht geladen werden.\n\nFehler ${errorCode}: ${errorDescription}\n\nBitte reinstallieren Sie die Anwendung.`
      )
    }
  })

  buildMenu()
}

function buildMenu() {
  const isMac = process.platform === 'darwin'
  const template = [
    {
      label: 'Datei',
      submenu: [
        isMac ? { role: 'close', label: 'Fenster schließen' } : { role: 'quit', label: 'Beenden' },
      ],
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo', label: 'Rückgängig' },
        { role: 'redo', label: 'Wiederholen' },
        { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' },
        { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einfügen' },
        { role: 'selectAll', label: 'Alles auswählen' },
      ],
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'reload', label: 'Neu laden' },
        // DevTools only in development
        ...(!app.isPackaged ? [{ role: 'toggleDevTools', label: 'Entwicklertools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom zurücksetzen' },
        { role: 'zoomIn', label: 'Vergrößern' },
        { role: 'zoomOut', label: 'Verkleinern' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Vollbild' },
      ],
    },
    {
      label: 'Hilfe',
      submenu: [
        {
          label: 'Website öffnen',
          click: () => shell.openExternal('https://kodinitools.com/bilderseriebearbeiten/'),
        },
        {
          label: 'FAQ',
          click: () => shell.openExternal('https://kodinitools.com/bilderseriebearbeiten/faq'),
        },
        { type: 'separator' },
        {
          label: `Version ${app.getVersion()}`,
          enabled: false,
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// IPC: open external URL from renderer
ipcMain.handle('open-external', (_event, url) => {
  shell.openExternal(url)
})

// IPC: get app version
ipcMain.handle('get-version', () => app.getVersion())

// IPC: get platform
ipcMain.handle('get-platform', () => process.platform)

// IPC: PDF zum Drucken in einem eigenen Fenster mit der PDF-Ansicht von Chromium öffnen
// (Drucksymbol bzw. Strg+P). Die Datei liegt nur temporär auf dem Gerät.
const MAX_PRINT_PDF_BYTES = 1024 * 1024 * 1024
ipcMain.handle('print-pdf', async (_event, data) => {
  const bytes = Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data)
  if (bytes.length === 0 || bytes.length > MAX_PRINT_PDF_BYTES) {
    throw new Error('Ungültige PDF-Größe')
  }
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error('Keine PDF-Datei')
  }

  const file = path.join(os.tmpdir(), `kodini-druck-${crypto.randomUUID()}.pdf`)
  await fs.promises.writeFile(file, bytes)

  const printWindow = new BrowserWindow({
    width: 1000,
    height: 900,
    parent: mainWindow ?? undefined,
    title: 'PDF drucken',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      // PDF-Ansicht von Chromium
      plugins: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  printWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  printWindow.on('closed', () => {
    fs.promises.unlink(file).catch(() => {})
  })
  await printWindow.loadFile(file)
})

app.whenReady().then(createWindow)

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
