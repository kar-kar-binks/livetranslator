import { randomUUID } from 'node:crypto';
import type { BrowserWindow } from 'electron';
import { EnergyVad } from '../ai/vad/energy-vad';
import { WhisperEngine, type WhisperModelId } from '../ai/whisper/whisper-engine';
import { TranslateEngine } from '../ai/translate/translate-engine';
import { PiperEngine } from '../ai/tts/piper-engine';
import { getLanguage, LANGUAGES } from '@shared/languages';
import type { AppSettings, EngineStatus, ModelStatus, TranscriptSegment } from '@shared/types';
import { SettingsStore } from './settings-store';

const FILLER_PATTERN = /^[([].*[)\]]$/;

/** True for empty text or whisper.cpp's bracketed non-speech placeholders (e.g. "[BLANK_AUDIO]", "(silence)"). */
function isNonSpeechFiller(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length === 0 || FILLER_PATTERN.test(trimmed);
}

function isKnownLanguage(code: string): boolean {
  return LANGUAGES.some((l) => l.code === code);
}

/** Resolves "auto" (not a real translation/TTS target) to a concrete fallback language. */
function concreteLanguage(code: string, fallback = 'es'): string {
  return code === 'auto' ? fallback : code;
}

const FRAME_SAMPLES = 480; // 30ms @ 16kHz

/**
 * Orchestrates the full conversation pipeline:
 *   PCM frames -> VAD -> (utterance boundary) -> Whisper STT (auto language
 *   detect) -> classify speaker -> NLLB translate -> transcript event
 * and, on demand, translated text -> Piper TTS -> PCM for playback.
 *
 * There's only one microphone, so there's no reliable way to know in advance
 * whether a given utterance is the far-end caller or the local user talking
 * back. Rather than requiring a manual "reply" button, every utterance is
 * transcribed with Whisper's dedicated language-ID pass (a proper
 * audio-classification pass over the encoder output, not just a decode
 * confidence proxy — empirically far more reliable), and the detected
 * language is compared against the configured outgoing/incoming languages to
 * classify who's talking. If the detected language matches neither
 * configured language (most likely noise or a garbled short clip), we keep
 * whoever spoke last rather than defaulting blindly, since consecutive
 * utterances from the same speaker are far more common in a real
 * conversation than a hard flip every time detection is uncertain.
 */
export class PipelineManager {
  private vad = new EnergyVad();
  private buffer: number[] = [];
  private leftover: number[] = [];

  private whisper = new WhisperEngine();
  private translate = new TranslateEngine();
  private piper = new PiperEngine();

  private segments = new Map<string, TranscriptSegment>();
  private listening = false;
  private lastDirection: TranscriptSegment['direction'] = 'incoming';

  constructor(
    private win: BrowserWindow,
    private settings: SettingsStore,
  ) {}

  async initModels(): Promise<void> {
    const s = this.settings.get();
    this.whisper.setModel(s.sttModel as WhisperModelId);
    this.applyVadSensitivity(s.vadSensitivity);
    try {
      await this.translate.start();
    } catch (err) {
      this.emitError('translate', (err as Error).message, true);
    }
    this.broadcastStatus();
  }

  applyVadSensitivity(sensitivity: number): void {
    this.vad = new EnergyVad({ sensitivity });
  }

  startListening(): void {
    this.listening = true;
  }

  stopListening(): void {
    this.listening = false;
    this.buffer = [];
    this.vad.reset();
    this.lastDirection = 'incoming';
  }

  clear(): void {
    this.segments.clear();
  }

  getSegment(id: string): TranscriptSegment | undefined {
    return this.segments.get(id);
  }

  getAllSegments(): TranscriptSegment[] {
    return Array.from(this.segments.values()).sort((a, b) => a.startedAt - b.startedAt);
  }

  /** Feeds a chunk of PCM16 mono 16kHz audio from the microphone. */
  async pushAudioChunk(pcm: Int16Array): Promise<void> {
    if (!this.listening) return;
    const combined = this.leftover.length ? Int16Array.from([...this.leftover, ...pcm]) : pcm;
    let offset = 0;
    while (offset + FRAME_SAMPLES <= combined.length) {
      const frame = combined.subarray(offset, offset + FRAME_SAMPLES) as Int16Array;
      await this.processFrame(frame);
      offset += FRAME_SAMPLES;
    }
    this.leftover = Array.from(combined.subarray(offset));
  }

  private async processFrame(frame: Int16Array): Promise<void> {
    const event = this.vad.process(frame);

    if (event === 'speech-start') {
      this.buffer.length = 0;
      this.buffer.push(...frame);
    } else if (event === 'speech-continue') {
      this.buffer.push(...frame);
    } else if (event === 'speech-end') {
      this.buffer.push(...frame);
      const utterance = Int16Array.from(this.buffer);
      this.buffer.length = 0;
      if (utterance.length > 16000 * 0.3) {
        // ignore utterances shorter than ~300ms (likely noise clicks)
        void this.handleUtterance(utterance);
      }
    }
  }

  private async handleUtterance(pcm: Int16Array): Promise<void> {
    const settings = this.settings.get();

    const id = randomUUID();
    const now = Date.now();
    let segment: TranscriptSegment = {
      id,
      direction: 'incoming',
      status: 'transcribing',
      sourceText: '',
      translatedText: '',
      sourceLanguage: settings.incomingLanguage,
      targetLanguage: settings.outgoingLanguage,
      detectedLanguage: null,
      isPartial: true,
      startedAt: now,
      updatedAt: now,
    };
    this.segments.set(id, segment);
    this.emitSegment(segment);

    try {
      const outgoingLang = settings.outgoingLanguage; // always concrete, never "auto"
      const incomingLang = concreteLanguage(settings.incomingLanguage);

      const { text, detectedLanguage } = await this.whisper.transcribe(pcm, null);

      if (isNonSpeechFiller(text)) {
        this.segments.delete(id);
        this.win.webContents.send('transcript:remove', { id });
        return;
      }

      let direction: TranscriptSegment['direction'];
      if (detectedLanguage === outgoingLang) direction = 'outgoing';
      else if (detectedLanguage === incomingLang) direction = 'incoming';
      else direction = this.lastDirection; // ambiguous detection — assume same speaker continued
      this.lastDirection = direction;

      const resolvedSourceLang =
        detectedLanguage && isKnownLanguage(detectedLanguage)
          ? detectedLanguage
          : direction === 'outgoing'
            ? outgoingLang
            : incomingLang;
      const resolvedTargetLang = direction === 'outgoing' ? incomingLang : outgoingLang;

      segment = {
        ...segment,
        direction,
        sourceText: text,
        detectedLanguage,
        sourceLanguage: resolvedSourceLang,
        targetLanguage: resolvedTargetLang,
        status: 'translating',
        updatedAt: Date.now(),
      };
      this.segments.set(id, segment);
      this.emitSegment(segment);

      const srcNllb = getLanguage(resolvedSourceLang).nllbCode;
      const tgtNllb = getLanguage(resolvedTargetLang).nllbCode;
      const translated = await this.translate.translate(text, srcNllb, tgtNllb);

      segment = {
        ...segment,
        translatedText: translated,
        status: 'done',
        isPartial: false,
        updatedAt: Date.now(),
      };
      this.segments.set(id, segment);
      this.emitSegment(segment);
    } catch (err) {
      segment = {
        ...segment,
        status: 'error',
        isPartial: false,
        error: (err as Error).message,
        updatedAt: Date.now(),
      };
      this.segments.set(id, segment);
      this.emitSegment(segment);
    }
  }

  /** Synthesizes speech for a completed segment's translated text and returns PCM for playback. */
  async speakSegment(segmentId: string): Promise<{ pcm16: Int16Array; sampleRate: number }> {
    const segment = this.segments.get(segmentId);
    if (!segment) throw new Error('Unknown segment');
    const settings = this.settings.get();
    const lang = getLanguage(segment.targetLanguage);
    if (!lang.piperVoice) throw new Error(`No local TTS voice available for ${lang.label}`);
    return this.piper.synthesize(segment.translatedText, lang.piperVoice, settings.ttsSpeed);
  }

  private emitSegment(segment: TranscriptSegment): void {
    this.win.webContents.send('transcript:segment', segment);
  }

  private emitError(stage: string, message: string, recoverable: boolean): void {
    this.win.webContents.send('pipeline:error', { stage, message, recoverable });
  }

  async broadcastStatus(): Promise<void> {
    const status = await this.getStatus();
    this.win.webContents.send('engine:status', status);
  }

  async getStatus(): Promise<EngineStatus> {
    const s = this.settings.get();
    const models: ModelStatus[] = [
      {
        stage: 'vad',
        name: 'Energy VAD',
        ready: true,
        loading: false,
        error: null,
        device: 'cpu',
      },
      {
        stage: 'stt',
        name: `whisper.cpp (${s.sttModel})`,
        ready: await this.whisper.isReady(),
        loading: false,
        error: null,
        device: s.computeDevice === 'cpu' ? 'cpu' : 'metal',
      },
      {
        stage: 'translate',
        name: 'NLLB-200 distilled 600M (CTranslate2)',
        ready: await this.translate.isReady(),
        loading: false,
        error: this.translate.getLastError(),
        device: 'cpu',
      },
      {
        stage: 'tts',
        name: 'Piper TTS',
        ready: await this.piper.isVoiceReady(
          getLanguage(s.outgoingLanguage).piperVoice ?? 'en_US-lessac-medium',
        ),
        loading: false,
        error: null,
        device: 'cpu',
      },
    ];

    return {
      models,
      cpuUsage: 0,
      memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      micActive: this.listening,
      speakerActive: false,
    };
  }

  applySettings(settings: AppSettings): void {
    this.whisper.setModel(settings.sttModel as WhisperModelId);
    this.applyVadSensitivity(settings.vadSensitivity);
  }

  shutdown(): void {
    this.translate.stop();
  }
}
