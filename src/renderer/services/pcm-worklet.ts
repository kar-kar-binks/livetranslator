/**
 * AudioWorklet processor source, registered at runtime via a Blob URL (see
 * audioCapture.ts). Runs on the audio rendering thread: downmixes to mono
 * and forwards raw Float32 frames to the main thread for resampling/encoding,
 * batched into ~30ms chunks to keep postMessage overhead low.
 */
export const PCM_WORKLET_SOURCE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.chunkSize = Math.round(sampleRate * 0.03); // ~30ms
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this.buffer.push(channel[i]);
    }

    while (this.buffer.length >= this.chunkSize) {
      const frame = this.buffer.splice(0, this.chunkSize);
      this.port.postMessage(new Float32Array(frame));
    }

    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;
