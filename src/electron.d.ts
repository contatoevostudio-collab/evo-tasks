interface ElectronAPI {
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateAvailable: (cb: (info: unknown) => void) => void;
  onUpdateDownloaded: (cb: (info: unknown) => void) => void;
  onUpdateError?: (cb: (msg: string) => void) => void;
  openReleasesPage?: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
