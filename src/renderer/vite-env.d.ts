/// <reference types="vite/client" />

import type { IpcEventChannel, IpcInvokeChannel, IpcInvokeMap, IpcEventMap } from '@shared/ipc';

interface LiveTranslateApi {
  invoke<C extends IpcInvokeChannel>(
    channel: C,
    ...args: IpcInvokeMap[C]['args']
  ): Promise<IpcInvokeMap[C]['result']>;
  on<C extends IpcEventChannel>(channel: C, handler: (payload: IpcEventMap[C]) => void): () => void;
  onMenu(channel: string, handler: () => void): () => void;
  onTtsPlayback(handler: (payload: { pcm: ArrayBuffer; sampleRate: number }) => void): () => void;
}

declare global {
  interface Window {
    liveTranslate: LiveTranslateApi;
  }
}

export {};
