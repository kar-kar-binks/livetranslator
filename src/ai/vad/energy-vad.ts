/**
 * Lightweight streaming voice-activity detector.
 *
 * Combines short-term RMS energy with a zero-crossing-rate check so that
 * steady-state fan/road noise (low ZCR, low-moderate energy) doesn't trigger
 * speech detection while actual speech (higher ZCR variability) does. This
 * runs synchronously on every incoming PCM frame and is cheap enough to use
 * as a gate in front of the (much more expensive) Whisper STT pass, so we
 * only pay STT/translation cost while someone is actually talking.
 *
 * A frame is ~20-30ms of 16kHz mono PCM16, matching the chunk size the
 * renderer's AudioWorklet emits (see src/renderer/services/audioCapture.ts).
 */
export interface VadOptions {
  /** 0..1, higher = requires louder/more speech-like audio to trigger. */
  sensitivity: number;
  sampleRate: number;
  /** Frames of continuous silence before an utterance is considered ended. */
  hangoverFrames: number;
}

export type VadEvent = 'speech-start' | 'speech-continue' | 'speech-end' | 'silence';

export class EnergyVad {
  private speaking = false;
  private silenceRun = 0;
  private readonly opts: VadOptions;

  constructor(opts: Partial<VadOptions> = {}) {
    this.opts = {
      sensitivity: opts.sensitivity ?? 0.5,
      sampleRate: opts.sampleRate ?? 16000,
      hangoverFrames: opts.hangoverFrames ?? 12, // ~ 12 * 25ms = 300ms of trailing silence
    };
  }

  private energyThreshold(): number {
    // Maps sensitivity 0..1 to an RMS threshold (int16 domain). Higher
    // sensitivity => lower threshold => picks up quieter speech.
    const minThresh = 120;
    const maxThresh = 900;
    return maxThresh - this.opts.sensitivity * (maxThresh - minThresh);
  }

  private static rms(frame: Int16Array): number {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
    return Math.sqrt(sum / frame.length);
  }

  private static zeroCrossingRate(frame: Int16Array): number {
    let crossings = 0;
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i - 1] >= 0 && frame[i] < 0) || (frame[i - 1] < 0 && frame[i] >= 0)) crossings++;
    }
    return crossings / frame.length;
  }

  process(frame: Int16Array): VadEvent {
    const energy = EnergyVad.rms(frame);
    const zcr = EnergyVad.zeroCrossingRate(frame);
    const isLoudEnough = energy > this.energyThreshold();
    const looksLikeSpeech = zcr > 0.02 && zcr < 0.35;
    const isSpeech = isLoudEnough && looksLikeSpeech;

    if (isSpeech) {
      this.silenceRun = 0;
      const wasSpeaking = this.speaking;
      this.speaking = true;
      return wasSpeaking ? 'speech-continue' : 'speech-start';
    }

    if (this.speaking) {
      this.silenceRun++;
      if (this.silenceRun >= this.opts.hangoverFrames) {
        this.speaking = false;
        this.silenceRun = 0;
        return 'speech-end';
      }
      return 'speech-continue';
    }

    return 'silence';
  }

  reset(): void {
    this.speaking = false;
    this.silenceRun = 0;
  }
}
