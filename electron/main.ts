import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';


const isDev = !app.isPackaged;

// ─── Cert trust prompt (primeira abertura) ────────────────────────────────────
function promptCertTrustIfNeeded() {
  if (process.platform !== 'darwin') return;

  const flagPath = path.join(app.getPath('userData'), '.cert-trust-done');
  if (fs.existsSync(flagPath)) return; // já mostrou antes

  // Cert bundled em resources/cert.cer via extraResources no electron-builder
  const certPath = path.join(process.resourcesPath, 'cert.cer');
  if (!fs.existsSync(certPath)) return; // cert não empacotado, skip

  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'Evo Tasks — Configuração inicial',
    message: 'Instalar certificado de atualização',
    detail: [
      'Para que as atualizações automáticas funcionem sem precisar baixar um novo instalador, instale o certificado de confiança.',
      '',
      'Clique em "Instalar Certificado" → o Keychain vai abrir → dê duplo clique no certificado → em "Trust" selecione "Always Trust" → feche.',
      '',
      'Isso só aparece uma vez.',
    ].join('\n'),
    buttons: ['Instalar Certificado', 'Agora não'],
    defaultId: 0,
    cancelId: 1,
    icon: path.join(process.resourcesPath, '../icon.icns'),
  }).then(({ response }) => {
    if (response === 0) {
      shell.openPath(certPath);
    }
    // Marca como feito independente da escolha — não incomoda de novo
    fs.writeFileSync(flagPath, '1');
  });
}

let mainWindow: BrowserWindow | null = null;

// Guarda eventos que chegaram antes do renderer estar pronto
let pendingUpdateEvent: { type: 'available' | 'downloaded' | 'error'; payload?: string } | null = null;
// Caminho do arquivo de update baixado (para remover quarentena antes de instalar)
let downloadedUpdatePath: string | null = null;

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
      promptCertTrustIfNeeded();
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
  // Guarda o path do arquivo baixado para remover quarentena antes de instalar
  if (info.downloadedFile) downloadedUpdatePath = info.downloadedFile;

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

ipcMain.handle('install-update', async () => {
  // Remove atributo de quarentena do macOS antes de instalar
  if (process.platform === 'darwin' && downloadedUpdatePath && fs.existsSync(downloadedUpdatePath)) {
    await new Promise<void>(resolve => {
      execFile('xattr', ['-r', '-d', 'com.apple.quarantine', downloadedUpdatePath!], () => resolve());
    });
  }

  try {
    autoUpdater.quitAndInstall(false, true);
  } catch {
    // Só abre GitHub se quitAndInstall lançar exceção real
    shell.openExternal('https://github.com/contatoevostudio-collab/evo-tasks/releases/latest');
  }
  // Sem timer de fallback — se fechar é porque funcionou, se não fechar o usuário tenta de novo
});

ipcMain.handle('check-for-updates', () => {
  if (!isDev) autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on('get-app-version', (event) => {
  event.returnValue = app.getVersion();
});

ipcMain.handle('open-releases-page', () => {
  shell.openExternal('https://github.com/contatoevostudio-collab/evo-tasks/releases/latest');
});
