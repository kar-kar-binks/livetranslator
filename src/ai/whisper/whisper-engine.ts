import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { binPath, modelPath } from '../paths';
import { writeWavFile } from '../audio/wav';

export interface WhisperResult {
  text: string;
  detectedLanguage: string | null;
  /** Mean per-token decode probability (0..1) — how confident the model was in this transcription. */
  confidence: number;
}

export type WhisperModelId = 'whisper-tiny' | 'whisper-base' | 'whisper-small' | 'whisper-medium';

const MODEL_FILES: Record<WhisperModelId, string> = {
  'whisper-tiny': 'ggml-tiny.bin',
  'whisper-base': 'ggml-base.bin',
  'whisper-small': 'ggml-small.bin',
  'whisper-medium': 'ggml-medium-q5_0.bin',
};

interface WhisperJsonToken {
  text: string;
  p: number;
}

interface WhisperJsonOutput {
  result?: { language?: string };
  transcription?: { text: string; tokens?: WhisperJsonToken[] }[];
}

/**
 * Wraps the `whisper-cli` binary from whisper.cpp (built with WHISPER_METAL=1
 * on Apple Silicon for GPU-accelerated inference). Each call transcribes one
 * VAD-bounded utterance: we write 16kHz mono PCM to a scratch WAV file and
 * invoke the CLI in single-shot, non-streaming mode, which keeps latency low
 * for short (2-8s) utterances typical of conversational turns.
 *
 * Uses `--output-json-full` (rather than plain `--output-json`) to get
 * per-token decode probabilities, which PipelineManager uses to pick between
 * two forced-language transcriptions rather than trusting Whisper's
 * single-pass free-form language auto-detection — that's notoriously
 * unreliable on short (a few words) utterances, which is most of what a
 * live conversation looks like.
 */
export class WhisperEngine {
  private modelId: WhisperModelId;
  private useMetal: boolean;

  constructor(modelId: WhisperModelId = 'whisper-base', useMetal = true) {
    this.modelId = modelId;
    this.useMetal = useMetal;
  }

  setModel(modelId: WhisperModelId): void {
    this.modelId = modelId;
  }

  private get modelFile(): string {
    return modelPath('whisper', MODEL_FILES[this.modelId]);
  }

  async isReady(): Promise<boolean> {
    try {
      await fs.access(this.modelFile);
      await fs.access(binPath('whisper-cli'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * @param pcm16 mono 16-bit PCM samples at 16kHz
   * @param languageHint ISO-639-1 code, or null/undefined for auto-detect
   */
  async transcribe(pcm16: Int16Array, languageHint?: string | null): Promise<WhisperResult> {
    const scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), 'livetranslate-'));
    const wavPath = path.join(scratchDir, `${randomUUID()}.wav`);
    const outputBase = wavPath.replace(/\.wav$/, '');
    const jsonPath = `${outputBase}.json`;

    try {
      await writeWavFile(wavPath, pcm16, 16000);

      const args = [
        '-m',
        this.modelFile,
        '-f',
        wavPath,
        '--output-json-full',
        '--output-file',
        outputBase,
        '--no-prints',
        '--no-timestamps',
        '--language',
        languageHint && languageHint !== 'auto' ? languageHint : 'auto',
        '--threads',
        String(Math.max(2, Math.min(8, os.cpus().length - 1))),
      ];
      if (this.useMetal) args.push('--flash-attn');

      await this.runCli(args);

      const raw = await fs.readFile(jsonPath, 'utf8');
      const parsed = JSON.parse(raw) as WhisperJsonOutput;
      const segments = parsed.transcription ?? [];
      const text = segments
        .map((t) => t.text)
        .join(' ')
        .trim();

      const tokens = segments.flatMap((s) => s.tokens ?? []);
      const confidence = tokens.length
        ? tokens.reduce((sum, t) => sum + t.p, 0) / tokens.length
        : 0;

      const detectedLanguage = parsed.result?.language ?? null;
      return { text, detectedLanguage, confidence };
    } finally {
      await fs.rm(scratchDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private runCli(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(binPath('whisper-cli'), args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', (d) => (stderr += d.toString()));
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`whisper-cli exited with code ${code}: ${stderr.slice(-500)}`));
      });
    });
  }
}
