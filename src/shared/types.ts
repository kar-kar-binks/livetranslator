/** Direction of a piece of speech relative to the local user. */
export type SpeechDirection = 'incoming' | 'outgoing';

/** Lifecycle stage of a single utterance as it moves through the pipeline. */
export type UtteranceStatus = 'listening' | 'transcribing' | 'translating' | 'done' | 'error';

export interface TranscriptSegment {
  id: string;
  direction: SpeechDirection;
  status: UtteranceStatus;
  /** Text in the original spoken language, filled incrementally. */
  sourceText: string;
  /** Text translated into the target language, filled once translation completes. */
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  /** Whisper's detected language code, if auto-detect was used. */
  detectedLanguage: string | null;
  isPartial: boolean;
  startedAt: number;
  updatedAt: number;
  error?: string;
}

export type ModelStage = 'vad' | 'stt' | 'translate' | 'tts';

export interface ModelStatus {
  stage: ModelStage;
  name: string;
  ready: boolean;
  loading: boolean;
  error: string | null;
  device: 'cpu' | 'metal' | 'ane';
}

export interface EngineStatus {
  models: ModelStatus[];
  cpuUsage: number;
  memoryUsageMb: number;
  micActive: boolean;
  speakerActive: boolean;
}

export type LatencyMode = 'fastest' | 'balanced' | 'accurate';
export type ComputeDevice = 'auto' | 'cpu' | 'metal';

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface AppSettings {
  incomingLanguage: string;
  outgoingLanguage: string;
  autoDetectIncoming: boolean;
  microphoneId: string | null;
  speakerId: string | null;
  sttModel: 'whisper-tiny' | 'whisper-base' | 'whisper-small' | 'whisper-medium';
  latencyMode: LatencyMode;
  computeDevice: ComputeDevice;
  noiseSuppression: boolean;
  vadSensitivity: number; // 0..1
  ttsSpeed: number; // 0.5..2.0
  theme: 'light' | 'dark' | 'system';
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  alwaysOnTop: boolean;
  transparencyMode: boolean;
  launchAtLogin: boolean;
  pushToTalk: boolean;
  /** Automatically play the translated speech as soon as an outgoing utterance finishes translating. */
  autoSpeakOutgoing: boolean;
  hotkeys: {
    toggleListening: string;
    speakTranslation: string;
    mute: string;
    swapLanguages: string;
    floatingSubtitles: string;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  incomingLanguage: 'es',
  outgoingLanguage: 'en',
  autoDetectIncoming: true,
  microphoneId: null,
  speakerId: null,
  sttModel: 'whisper-base',
  latencyMode: 'balanced',
  computeDevice: 'auto',
  noiseSuppression: true,
  vadSensitivity: 0.5,
  ttsSpeed: 1.0,
  theme: 'system',
  fontSize: 'md',
  alwaysOnTop: false,
  transparencyMode: false,
  launchAtLogin: false,
  pushToTalk: false,
  autoSpeakOutgoing: true,
  hotkeys: {
    toggleListening: 'CommandOrControl+Shift+L',
    speakTranslation: 'CommandOrControl+Shift+Return',
    mute: 'CommandOrControl+Shift+M',
    swapLanguages: 'CommandOrControl+Shift+S',
    floatingSubtitles: 'CommandOrControl+Shift+F',
  },
};

export interface PipelineErrorPayload {
  stage: ModelStage | 'audio' | 'device';
  message: string;
  recoverable: boolean;
}
