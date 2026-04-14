import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

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

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update-downloaded', info);
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('check-for-updates', () => {
  if (!isDev) autoUpdater.checkForUpdatesAndNotify();
});
