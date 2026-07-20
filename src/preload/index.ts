import { contextBridge, ipcRenderer } from 'electron';
import type { IpcEventChannel, IpcInvokeChannel, IpcInvokeMap, IpcEventMap } from '@shared/ipc';

function invoke<C extends IpcInvokeChannel>(
  channel: C,
  ...args: IpcInvokeMap[C]['args']
): Promise<IpcInvokeMap[C]['result']> {
  return ipcRenderer.invoke(channel, ...args);
}

function on<C extends IpcEventChannel>(
  channel: C,
  handler: (payload: IpcEventMap[C]) => void,
): () => void {
  const listener = (_e: Electron.IpcRendererEvent, payload: IpcEventMap[C]) => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

type MenuChannel =
  | 'menu:open-settings'
  | 'menu:export-transcript'
  | 'menu:clear-transcript'
  | 'menu:toggle-floating-subtitles'
  | 'menu:toggle-always-on-top'
  | 'menu:toggle-listening'
  | 'menu:speak-translation'
  | 'menu:swap-languages'
  | 'menu:toggle-mute';

function onMenu(channel: MenuChannel, handler: () => void): () => void {
  const listener = () => handler();
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

function onTtsPlayback(
  handler: (payload: { pcm: ArrayBuffer; sampleRate: number }) => void,
): () => void {
  const listener = (
    _e: Electron.IpcRendererEvent,
    payload: { pcm: ArrayBuffer; sampleRate: number },
  ) => handler(payload);
  ipcRenderer.on('tts:playback', listener);
  return () => ipcRenderer.removeListener('tts:playback', listener);
}

const api = {
  invoke,
  on,
  onMenu,
  onTtsPlayback,
};

export type LiveTranslateApi = typeof api;

contextBridge.exposeInMainWorld('liveTranslate', api);
