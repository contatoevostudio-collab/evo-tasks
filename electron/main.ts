import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';

// ─── Dynamic dock icon (Calendar-style) ──────────────────────────────────────
async function buildDockIcon(): Promise<Electron.NativeImage | null> {
  const now  = new Date();
  const day  = now.getDate();
  const wds  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const wd   = wds[now.getDay()];

  // Render at 2× for retina sharpness
  const SIZE = 512;
  const R    = Math.round(SIZE * 0.22); // border-radius
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${SIZE}px;height:${SIZE}px;overflow:hidden;background:transparent}
    .icon{
      width:${SIZE}px;height:${SIZE}px;
      background:#ffffff;
      border-radius:${R}px;
      overflow:hidden;
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;
      gap:${Math.round(SIZE*0.01)}px;
    }
    .wd{
      color:#0a84ff;
      font-size:${Math.round(SIZE*0.115)}px;
      font-weight:700;
      letter-spacing:${Math.round(SIZE*0.008)}px;
      text-transform:uppercase;
    }
    .day{
      color:#1a1a1a;
      font-size:${Math.round(SIZE*0.50)}px;
      font-weight:800;
      line-height:1;
      letter-spacing:-${Math.round(SIZE*0.008)}px;
    }
  </style></head><body>
    <div class="icon">
      <div class="wd">${wd}</div>
      <div class="day">${day}</div>
    </div>
  </body></html>`;

  const win = new BrowserWindow({
    width: SIZE, height: SIZE,
    show: false, frame: false,
    transparent: true,
    webPreferences: { offscreen: false },
  });

  await new Promise<void>(resolve => {
    win.webContents.once('did-finish-load', () => setTimeout(resolve, 60));
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  });

  const img = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
  win.destroy();
  if (img.isEmpty()) return null;
  return img;
}

function scheduleMidnightIconUpdate() {
  const now = new Date();
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5).getTime() - now.getTime();
  setTimeout(async () => {
    if (process.platform === 'darwin') {
      try { const ic = await buildDockIcon(); if (ic) app.dock?.setIcon(ic); } catch { /* ignore */ }
    }
    scheduleMidnightIconUpdate();
  }, msUntilMidnight);
}

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
// Timer de fallback do update — cancelado se o app realmente fechar
let updateFallbackTimer: ReturnType<typeof setTimeout> | null = null;

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

app.whenReady().then(async () => {
  createWindow();

  // Set dynamic Calendar-style dock icon on macOS
  if (process.platform === 'darwin') {
    try {
      const icon = await buildDockIcon();
      if (icon) app.dock?.setIcon(icon);
    } catch { /* ignore */ }
    scheduleMidnightIconUpdate();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Se o app vai fechar (quitAndInstall funcionou), cancela o timer de fallback
app.on('before-quit', () => {
  if (updateFallbackTimer) {
    clearTimeout(updateFallbackTimer);
    updateFallbackTimer = null;
  }
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

  let threw = false;
  try {
    autoUpdater.quitAndInstall(false, true);
  } catch {
    threw = true;
  }

  if (threw) {
    // Falha síncrona — abre GitHub como fallback
    shell.openExternal('https://github.com/contatoevostudio-collab/evo-tasks/releases/latest');
    return;
  }

  // No macOS sem notarização, quitAndInstall pode falhar silenciosamente.
  // Se o app ainda estiver rodando após 3s, é porque falhou — abre GitHub.
  // O timer é cancelado em before-quit se o app realmente fechar.
  if (process.platform === 'darwin') {
    updateFallbackTimer = setTimeout(() => {
      shell.openExternal('https://github.com/contatoevostudio-collab/evo-tasks/releases/latest');
    }, 3000);
  }
});

ipcMain.handle('check-for-updates', () => {
  if (!isDev) autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.handle('open-releases-page', () => {
  shell.openExternal('https://github.com/contatoevostudio-collab/evo-tasks/releases/latest');
});
