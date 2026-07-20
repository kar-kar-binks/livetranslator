import { PCM_WORKLET_SOURCE } from './pcm-worklet';

/**
 * Captures microphone audio, downsamples it to 16kHz mono PCM16 (the format
 * whisper.cpp expects), and streams it to the main process over IPC in small
 * chunks. There is a single mic input for the whole conversation — the main
 * process pipeline determines per-utterance whether it was the local user or
 * the other party speaking by comparing Whisper's detected language against
 * the configured outgoing language (see PipelineManager.handleUtterance).
 */
export class AudioCaptureService {
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private targetSampleRate = 16000;
  private analyser: AnalyserNode | null = null;

  async start(deviceId: string | null, noiseSuppression: boolean): Promise<void> {
    await this.stop();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ?? undefined,
        echoCancellation: true,
        noiseSuppression,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    this.ctx = new AudioContext();
    const blob = new Blob([PCM_WORKLET_SOURCE], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    await this.ctx.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.workletNode = new AudioWorkletNode(this.ctx, 'pcm-capture-processor');

    this.workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
      const resampled = this.resample(event.data, this.ctx!.sampleRate, this.targetSampleRate);
      const pcm16 = this.floatToPcm16(resampled);
      void window.liveTranslate.invoke('pipeline:push-audio-chunk', {
        pcm: pcm16.buffer.slice(0) as ArrayBuffer,
        sampleRate: this.targetSampleRate,
      });
    };

    this.source.connect(this.analyser);
    this.source.connect(this.workletNode);
  }

  /** Returns a 0..1 level for VU-meter style UI feedback. */
  getLevel(): number {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    let sumSquares = 0;
    for (const v of data) {
      const centered = (v - 128) / 128;
      sumSquares += centered * centered;
    }
    return Math.min(1, Math.sqrt(sumSquares / data.length) * 4);
  }

  async stop(): Promise<void> {
    this.workletNode?.disconnect();
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.ctx && this.ctx.state !== 'closed') await this.ctx.close();
    this.ctx = null;
    this.source = null;
    this.workletNode = null;
    this.stream = null;
    this.analyser = null;
  }

  private floatToPcm16(input: Float32Array): Int16Array {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  private resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const outLength = Math.round(input.length / ratio);
    const output = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const srcIndex = i * ratio;
      const lower = Math.floor(srcIndex);
      const upper = Math.min(input.length - 1, lower + 1);
      const weight = srcIndex - lower;
      output[i] = input[lower] * (1 - weight) + input[upper] * weight;
    }
    return output;
  }
}
