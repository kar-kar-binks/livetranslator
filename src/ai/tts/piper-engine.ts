import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { modelPath, piperBin } from '../paths';
import { readWavFile } from '../audio/wav';

/**
 * Wraps the `piper` CLI from the piper-tts PyPI package
 * (https://github.com/rhasspy/piper), a fast, fully local neural TTS engine
 * with per-language ONNX voice models. Piper decodes on CPU in real time or
 * faster even on M-series laptops, which is why it's used here instead of a
 * heavier model like Coqui XTTS for the "speak translation" hot path where
 * latency matters most. We install it via pip into the bundled portable
 * Python runtime (rather than Piper's prebuilt native binary) because the
 * official macOS release tarballs are missing shared library dependencies —
 * see scripts/setup-models.sh for details.
 */
export class PiperEngine {
  async isVoiceReady(voiceId: string): Promise<boolean> {
    try {
      await fs.access(modelPath('piper', `${voiceId}.onnx`));
      await fs.access(modelPath('piper', `${voiceId}.onnx.json`));
      await fs.access(piperBin());
      return true;
    } catch {
      return false;
    }
  }

  /** Synthesizes speech and returns raw 16-bit PCM samples + sample rate for playback. */
  async synthesize(
    text: string,
    voiceId: string,
    speed = 1.0,
  ): Promise<{ pcm16: Int16Array; sampleRate: number }> {
    const scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), 'livetranslate-tts-'));
    const outPath = path.join(scratchDir, `${randomUUID()}.wav`);

    try {
      await this.runCli(text, voiceId, speed, outPath);
      return await readWavFile(outPath);
    } finally {
      await fs.rm(scratchDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private runCli(text: string, voiceId: string, speed: number, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const lengthScale = (1 / Math.max(0.25, Math.min(3, speed))).toFixed(2);
      const args = [
        '--model',
        modelPath('piper', `${voiceId}.onnx`),
        '--config',
        modelPath('piper', `${voiceId}.onnx.json`),
        '--length_scale',
        lengthScale,
        '--output_file',
        outPath,
      ];
      const child = spawn(piperBin(), args, { stdio: ['pipe', 'ignore', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', (d) => (stderr += d.toString()));
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`piper exited with code ${code}: ${stderr.slice(-500)}`));
      });
      child.stdin.write(text);
      child.stdin.end();
    });
  }
}
