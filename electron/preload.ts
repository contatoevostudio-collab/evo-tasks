import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  appVersion: ipcRenderer.sendSync('get-app-version') as string,
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

  // Pomodoro
  pomodoroStart: (config: { work: number; shortBreak: number }) => ipcRenderer.invoke('pomodoro-start', config),
  pomodoroPause: () => ipcRenderer.invoke('pomodoro-pause'),
  pomodoroStop: () => ipcRenderer.invoke('pomodoro-stop'),
  pomodoroGetState: () => ipcRenderer.invoke('pomodoro-get-state'),
  onPomodoroTick: (cb: (state: unknown) => void) => {
    ipcRenderer.on('pomodoro-tick', (_event, state) => cb(state));
  },
});
