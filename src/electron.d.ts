interface ElectronAPI {
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateAvailable: (cb: (info: unknown) => void) => void;
  onUpdateDownloaded: (cb: (info: unknown) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
