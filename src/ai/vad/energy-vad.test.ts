import { describe, expect, it } from 'vitest';
import { EnergyVad } from './energy-vad';

function silentFrame(): Int16Array {
  return new Int16Array(480);
}

function loudSpeechLikeFrame(): Int16Array {
  const frame = new Int16Array(480);
  for (let i = 0; i < frame.length; i++) {
    // A mid-frequency tone gives a moderate zero-crossing rate, mimicking speech.
    frame[i] = Math.round(20000 * Math.sin((i / frame.length) * Math.PI * 12));
  }
  return frame;
}

describe('EnergyVad', () => {
  it('stays silent on silent frames', () => {
    const vad = new EnergyVad({ sensitivity: 0.5 });
    expect(vad.process(silentFrame())).toBe('silence');
    expect(vad.process(silentFrame())).toBe('silence');
  });

  it('detects speech-start then speech-continue on sustained loud audio', () => {
    const vad = new EnergyVad({ sensitivity: 0.5 });
    expect(vad.process(loudSpeechLikeFrame())).toBe('speech-start');
    expect(vad.process(loudSpeechLikeFrame())).toBe('speech-continue');
  });

  it('emits speech-end after the hangover window of silence following speech', () => {
    const vad = new EnergyVad({ sensitivity: 0.5, hangoverFrames: 2 });
    vad.process(loudSpeechLikeFrame());
    expect(vad.process(silentFrame())).toBe('speech-continue');
    expect(vad.process(silentFrame())).toBe('speech-end');
  });

  it('resets internal state', () => {
    const vad = new EnergyVad({ sensitivity: 0.5 });
    vad.process(loudSpeechLikeFrame());
    vad.reset();
    expect(vad.process(silentFrame())).toBe('silence');
  });
});
