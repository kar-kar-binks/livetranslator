import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  Menu,
  Tray,
  nativeImage,
  systemPreferences,
} from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import log from 'electron-log/main';
import { SettingsStore } from './settings-store';
import { PipelineManager } from './pipeline-manager';
import { buildMenu } from './menu';
import { exportTranscript } from './transcript-export';
import type { AppSettings } from '@shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

log.initialize();
Object.assign(console, log.functions);

let mainWindow: BrowserWindow | null = null;
let floatingWindow: BrowserWindow | null = null;
let pipeline: PipelineManager | null = null;
const settingsStore = new SettingsStore();

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 860,
    minHeight: 560,
    title: 'LiveTranslate',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: '#101012',
    show: false,
    // Only matters for unpackaged dev runs (`electron .`) — a packaged .app
    // gets its Dock icon from build/icon.icns via electron-builder instead.
    icon: path.join(__dirname, '../../resources/public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  if (process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  return win;
}

function createFloatingSubtitleWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 720,
    height: 140,
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const query = '#/floating-subtitles';
  if (process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(`${process.env.VITE_DEV_SERVER_URL}${query}`);
  } else {
    void win.loadFile(path.join(__dirname, '../../dist/index.html'), {
      hash: 'floating-subtitles',
    });
  }
  win.hide();
  return win;
}

function registerHotkeys(settings: AppSettings): void {
  globalShortcut.unregisterAll();
  globalShortcut.register(settings.hotkeys.toggleListening, () =>
    mainWindow?.webContents.send('menu:toggle-listening'),
  );
  globalShortcut.register(settings.hotkeys.speakTranslation, () =>
    mainWindow?.webContents.send('menu:speak-translation'),
  );
  globalShortcut.register(settings.hotkeys.mute, () =>
    mainWindow?.webContents.send('menu:toggle-mute'),
  );
  globalShortcut.register(settings.hotkeys.swapLanguages, () =>
    mainWindow?.webContents.send('menu:swap-languages'),
  );
  globalShortcut.register(settings.hotkeys.floatingSubtitles, () =>
    mainWindow?.webContents.send('menu:toggle-floating-subtitles'),
  );
}

function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', () => settingsStore.get());

  ipcMain.handle('settings:set', (_e, patch: Partial<AppSettings>) => {
    const updated = settingsStore.set(patch);
    pipeline?.applySettings(updated);
    registerHotkeys(updated);
    mainWindow?.webContents.send('settings:changed', updated);
    return updated;
  });

  ipcMain.handle('audio:list-devices', () => []);

  ipcMain.handle('pipeline:start-listening', async () => {
    pipeline?.startListening();
    return { ok: true };
  });

  ipcMain.handle('pipeline:stop-listening', async () => {
    pipeline?.stopListening();
    return { ok: true };
  });

  ipcMain.handle(
    'pipeline:push-audio-chunk',
    async (_e, payload: { pcm: ArrayBuffer; sampleRate: number }) => {
      const samples = new Int16Array(payload.pcm);
      await pipeline?.pushAudioChunk(samples);
      return { ok: true };
    },
  );

  ipcMain.handle('pipeline:speak-translation', async (_e, { segmentId }: { segmentId: string }) => {
    if (!pipeline) return { ok: false };
    const { pcm16, sampleRate } = await pipeline.speakSegment(segmentId);
    mainWindow?.webContents.send('tts:playback', {
      pcm: pcm16.buffer.slice(pcm16.byteOffset, pcm16.byteOffset + pcm16.byteLength),
      sampleRate,
    });
    return { ok: true };
  });

  ipcMain.handle('pipeline:swap-languages', () => {
    const s = settingsStore.get();
    const updated = settingsStore.set({
      incomingLanguage: s.outgoingLanguage,
      outgoingLanguage: s.incomingLanguage,
    });
    mainWindow?.webContents.send('settings:changed', updated);
    return updated;
  });

  ipcMain.handle('transcript:clear', () => {
    pipeline?.clear();
    return { ok: true };
  });

  ipcMain.handle(
    'transcript:export',
    async (_e, { format }: { format: 'txt' | 'json' | 'srt' }) => {
      if (!mainWindow || !pipeline) return { path: null };
      const filePath = await exportTranscript(mainWindow, pipeline.getAllSegments(), format);
      return { path: filePath };
    },
  );

  ipcMain.handle('models:status', async () =>
    pipeline
      ? pipeline.getStatus()
      : { models: [], cpuUsage: 0, memoryUsageMb: 0, micActive: false, speakerActive: false },
  );

  ipcMain.handle('window:set-always-on-top', (_e, value: boolean) => {
    mainWindow?.setAlwaysOnTop(value);
    return { ok: true };
  });

  ipcMain.handle('window:toggle-floating-subtitles', () => {
    if (!floatingWindow) floatingWindow = createFloatingSubtitleWindow();
    if (floatingWindow.isVisible()) floatingWindow.hide();
    else floatingWindow.show();
    return { ok: true };
  });
}

async function requestMicPermission(): Promise<void> {
  if (process.platform !== 'darwin') return;
  const status = systemPreferences.getMediaAccessStatus('microphone');
  if (status !== 'granted') {
    await systemPreferences.askForMediaAccess('microphone');
  }
}

app.whenReady().then(async () => {
  app.setAboutPanelOptions({
    applicationName: 'LiveTranslate',
    applicationVersion: app.getVersion(),
    copyright: 'Copyright © 2026 LiveTranslate Contributors',
    iconPath: path.join(__dirname, '../../resources/public/icon.png'),
  });

  await requestMicPermission();

  mainWindow = createMainWindow();
  Menu.setApplicationMenu(buildMenu(mainWindow, settingsStore.get()));

  pipeline = new PipelineManager(mainWindow, settingsStore);
  registerIpcHandlers();
  registerHotkeys(settingsStore.get());

  mainWindow.webContents.on('did-finish-load', () => {
    void pipeline?.initModels();
  });

  const trayIcon = nativeImage.createFromPath(
    path.join(__dirname, '../../resources/public/tray-icon.png'),
  );
  if (!trayIcon.isEmpty()) {
    const tray = new Tray(trayIcon.resize({ width: 18, height: 18 }));
    tray.setToolTip('LiveTranslate');
    tray.on('click', () => mainWindow?.show());
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  pipeline?.shutdown();
});
