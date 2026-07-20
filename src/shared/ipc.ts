import type { AppSettings, AudioDeviceInfo, EngineStatus, TranscriptSegment } from './types';

/** Renderer -> Main invoke channels (request/response). */
export interface IpcInvokeMap {
  'settings:get': { args: []; result: AppSettings };
  'settings:set': { args: [Partial<AppSettings>]; result: AppSettings };
  'audio:list-devices': { args: []; result: AudioDeviceInfo[] };
  'pipeline:start-listening': { args: []; result: { ok: boolean } };
  'pipeline:stop-listening': { args: []; result: { ok: boolean } };
  'pipeline:push-audio-chunk': {
    args: [{ pcm: ArrayBuffer; sampleRate: number }];
    result: { ok: boolean };
  };
  'pipeline:speak-translation': { args: [{ segmentId: string }]; result: { ok: boolean } };
  'pipeline:swap-languages': { args: []; result: AppSettings };
  'transcript:clear': { args: []; result: { ok: boolean } };
  'transcript:export': {
    args: [{ format: 'txt' | 'json' | 'srt' }];
    result: { path: string | null };
  };
  'models:status': { args: []; result: EngineStatus };
  'window:set-always-on-top': { args: [boolean]; result: { ok: boolean } };
  'window:toggle-floating-subtitles': { args: []; result: { ok: boolean } };
}

/** Main -> Renderer event channels (fire and forget). */
export interface IpcEventMap {
  'transcript:segment': TranscriptSegment;
  'transcript:remove': { id: string };
  'engine:status': EngineStatus;
  'pipeline:error': { stage: string; message: string; recoverable: boolean };
  'audio:devices-changed': AudioDeviceInfo[];
  'settings:changed': AppSettings;
}

export type IpcInvokeChannel = keyof IpcInvokeMap;
export type IpcEventChannel = keyof IpcEventMap;
