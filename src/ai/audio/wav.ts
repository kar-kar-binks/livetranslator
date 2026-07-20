import { promises as fs } from 'node:fs';

/** Writes mono 16-bit PCM samples to a canonical WAV (RIFF) file. */
export async function writeWavFile(
  filePath: string,
  pcm16: Int16Array,
  sampleRate: number,
): Promise<void> {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm16.length * bytesPerSample;

  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < pcm16.length; i++) {
    buffer.writeInt16LE(pcm16[i], 44 + i * 2);
  }

  await fs.writeFile(filePath, buffer);
}

/** Reads a canonical 16-bit PCM WAV file back into samples (used for TTS playback staging). */
export async function readWavFile(
  filePath: string,
): Promise<{ pcm16: Int16Array; sampleRate: number }> {
  const buffer = await fs.readFile(filePath);
  const sampleRate = buffer.readUInt32LE(24);
  const dataChunkOffset = findDataChunk(buffer);
  const dataSize = buffer.readUInt32LE(dataChunkOffset + 4);
  const dataStart = dataChunkOffset + 8;
  const pcm16 = new Int16Array(dataSize / 2);
  for (let i = 0; i < pcm16.length; i++) {
    pcm16[i] = buffer.readInt16LE(dataStart + i * 2);
  }
  return { pcm16, sampleRate };
}

function findDataChunk(buffer: Buffer): number {
  let offset = 12;
  while (offset < buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === 'data') return offset;
    offset += 8 + chunkSize;
  }
  throw new Error('No data chunk found in WAV file');
}
