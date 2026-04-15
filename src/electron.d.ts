interface PomodoroState {
  isRunning: boolean;
  isBreak: boolean;
  remaining: number;
  workDuration: number;
  breakDuration: number;
}

interface ElectronAPI {
  appVersion?: string;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateAvailable: (cb: (info: unknown) => void) => void;
  onUpdateDownloaded: (cb: (info: unknown) => void) => void;
  onUpdateError?: (cb: (msg: string) => void) => void;
  openReleasesPage?: () => Promise<void>;
  // Pomodoro
  pomodoroStart?: (config: { work: number; shortBreak: number }) => Promise<void>;
  pomodoroPause?: () => Promise<void>;
  pomodoroStop?: () => Promise<void>;
  pomodoroGetState?: () => Promise<PomodoroState | null>;
  onPomodoroTick?: (cb: (state: PomodoroState) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
  const __APP_VERSION__: string;
}

export {};
