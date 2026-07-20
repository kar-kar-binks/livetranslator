import { describe, expect, it, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeWavFile, readWavFile } from './wav';

describe('wav read/write round trip', () => {
  const files: string[] = [];

  afterEach(async () => {
    await Promise.all(files.splice(0).map((f) => fs.rm(f, { force: true })));
  });

  it('preserves PCM samples and sample rate', async () => {
    const filePath = path.join(os.tmpdir(), `livetranslate-test-${Date.now()}.wav`);
    files.push(filePath);

    const samples = new Int16Array([0, 1000, -1000, 32767, -32768, 42]);
    await writeWavFile(filePath, samples, 16000);

    const { pcm16, sampleRate } = await readWavFile(filePath);
    expect(sampleRate).toBe(16000);
    expect(Array.from(pcm16)).toEqual(Array.from(samples));
  });
});
