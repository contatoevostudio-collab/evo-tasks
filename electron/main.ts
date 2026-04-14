import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

// Guarda eventos que chegaram antes do renderer estar pronto
let pendingUpdateEvent: { type: 'available' | 'downloaded' | 'error'; payload?: string } | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d0d12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Aguarda o renderer carregar completamente antes de verificar atualizações
  mainWindow.webContents.on('did-finish-load', () => {
    // Re-envia evento pendente caso o check tenha terminado antes do renderer
    if (pendingUpdateEvent) {
      if (pendingUpdateEvent.type === 'available') mainWindow?.webContents.send('update-available');
      if (pendingUpdateEvent.type === 'downloaded') mainWindow?.webContents.send('update-downloaded');
      if (pendingUpdateEvent.type === 'error') mainWindow?.webContents.send('update-error', pendingUpdateEvent.payload);
      pendingUpdateEvent = null;
    }

    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow?.webContents.isLoading()) {
    pendingUpdateEvent = { type: 'available' };
  } else {
    mainWindow?.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow?.webContents.isLoading()) {
    pendingUpdateEvent = { type: 'downloaded' };
  } else {
    mainWindow?.webContents.send('update-downloaded', info);
  }
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
  if (mainWindow?.webContents.isLoading()) {
    pendingUpdateEvent = { type: 'error', payload: err.message };
  } else {
    mainWindow?.webContents.send('update-error', err.message);
  }
});

ipcMain.handle('install-update', () => {
  try {
    autoUpdater.quitAndInstall(false, true);
  } catch (err) {
    // Se quitAndInstall falhar (comum em apps sem assinatura no macOS),
    // abre a página de releases no navegador como fallback
    shell.openExternal('https://github.com/contatoevostudio-collab/evo-tasks/releases/latest');
  }
});

ipcMain.handle('check-for-updates', () => {
  if (!isDev) autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.handle('open-releases-page', () => {
  shell.openExternal('https://github.com/contatoevostudio-collab/evo-tasks/releases/latest');
});
