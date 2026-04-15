import { app, BrowserWindow, ipcMain, shell, dialog, nativeImage } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';

// ─── Dynamic dock icon (Calendar-style) ──────────────────────────────────────
// Usa <canvas> com desenho explícito do squircle para garantir alpha correto.
// app.dock.setIcon() NÃO aplica squircle automaticamente — precisamos fazer isso.
async function buildDockIcon(): Promise<Electron.NativeImage | null> {
  const now = new Date();
  const day = now.getDate();
  const wds = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const wd  = wds[now.getDay()];

  // Canvas 512×512 (2× retina) — marcado como scaleFactor:2 para que o macOS
  // exiba no tamanho lógico correto (256pt), igual aos ícones padrão do dock.
  const S = 512;
  const R = Math.round(S * 0.224); // squircle radius padrão Apple (~22.4%)

  // Posições alinhadas ao layout do Calendar da Apple:
  // weekday ocupa o terço superior, número ocupa os dois terços inferiores
  const wdSize  = Math.round(S * 0.108); // ~55px
  const wdY     = Math.round(S * 0.345); // baseline do weekday
  const daySize = Math.round(S * 0.46);  // ~236px
  const dayY    = Math.round(S * 0.635); // middle do número

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:transparent;overflow:hidden">
  <canvas id="c" width="${S}" height="${S}" style="display:block"></canvas>
  <script>
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const S = ${S}, R = ${R};

    // Squircle path
    ctx.beginPath();
    ctx.moveTo(R, 0);
    ctx.lineTo(S - R, 0);
    ctx.arcTo(S, 0, S, R, R);
    ctx.lineTo(S, S - R);
    ctx.arcTo(S, S, S - R, S, R);
    ctx.lineTo(R, S);
    ctx.arcTo(0, S, 0, S - R, R);
    ctx.lineTo(0, R);
    ctx.arcTo(0, 0, R, 0, R);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Weekday
    ctx.fillStyle = '#0a84ff';
    ctx.font = '700 ${wdSize}px -apple-system, "SF Pro Display", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('${wd}', S / 2, ${wdY});

    // Day number
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '900 ${daySize}px -apple-system, "SF Pro Display", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('${day}', S / 2, ${dayY});

    window.__png = c.toDataURL('image/png');
  <\/script>
  </body></html>`;

  const win = new BrowserWindow({
    width: S, height: S,
    show: false, frame: false,
    transparent: true,
    webPreferences: { offscreen: false },
  });

  await new Promise<void>(resolve => {
    win.webContents.once('did-finish-load', () => setTimeout(resolve, 80));
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  });

  const dataURL: string = await win.webContents.executeJavaScript('window.__png');
  win.destroy();

  if (!dataURL || !dataURL.startsWith('data:image/png')) return null;

  // Declara como 2× para que o macOS exiba no tamanho lógico correto (256pt)
  const img = nativeImage.createEmpty();
  img.addRepresentation({ scaleFactor: 2.0, dataURL });
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
