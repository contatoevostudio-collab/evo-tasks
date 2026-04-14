import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (cb: (info: unknown) => void) => {
    ipcRenderer.on('update-available', (_event, info) => cb(info));
  },
  onUpdateDownloaded: (cb: (info: unknown) => void) => {
    ipcRenderer.on('update-downloaded', (_event, info) => cb(info));
  },
  onUpdateError: (cb: (msg: string) => void) => {
    ipcRenderer.on('update-error', (_event, msg) => cb(msg));
  },
  openReleasesPage: () => ipcRenderer.invoke('open-releases-page'),
});
