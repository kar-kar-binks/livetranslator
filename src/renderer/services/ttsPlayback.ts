/** Plays raw PCM16 audio buffers received from the main process (Piper TTS output). */
export function playPcm16(pcm: ArrayBuffer, sampleRate: number): Promise<void> {
  const ctx = new AudioContext({ sampleRate });
  const samples = new Int16Array(pcm);
  const floatSamples = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) floatSamples[i] = samples[i] / 0x8000;

  const buffer = ctx.createBuffer(1, floatSamples.length, sampleRate);
  buffer.copyToChannel(floatSamples, 0);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();

  return new Promise((resolve) => {
    source.onended = () => {
      void ctx.close();
      resolve();
    };
  });
}
