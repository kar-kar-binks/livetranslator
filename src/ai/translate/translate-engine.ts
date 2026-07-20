import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { app } from 'electron';
import { modelPath, pythonBin } from '../paths';

interface PendingRequest {
  resolve: (translation: string) => void;
  reject: (err: Error) => void;
}

/**
 * Manages the long-lived `translate_server.py` sidecar process (CTranslate2 +
 * NLLB-200 distilled). We keep exactly one instance alive for the app's
 * lifetime since model load takes several seconds; individual translation
 * requests are then sub-100ms round trips over stdio.
 */
export class TranslateEngine {
  private child: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<string, PendingRequest>();
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private lastError: string | null = null;

  async start(): Promise<void> {
    if (this.child) return;

    const script = app.isPackaged
      ? path.join(process.resourcesPath, 'ai', 'translate_server.py')
      : path.resolve(app.getAppPath(), 'src', 'ai', 'translate', 'translate_server.py');

    const portablePython = pythonBin();
    const interpreter = existsSync(portablePython) ? portablePython : 'python3';

    this.readyPromise = new Promise((resolve) => (this.readyResolve = resolve));

    this.child = spawn(interpreter, [script], {
      env: {
        ...process.env,
        LIVETRANSLATE_NLLB_DIR: modelPath('nllb', 'ct2-600M'),
        LIVETRANSLATE_NLLB_TOKENIZER_DIR: modelPath('nllb', 'tokenizer'),
        LIVETRANSLATE_DEVICE: 'cpu',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const rl = readline.createInterface({ input: this.child.stdout });
    rl.on('line', (line) => this.handleLine(line));

    this.child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      this.lastError = text;
      // eslint-disable-next-line no-console
      console.log(`[translate-engine] ${text.trim()}`);
    });

    this.child.on('exit', (code) => {
      this.lastError = `translate_server exited with code ${code}`;
      for (const [, req] of this.pending) req.reject(new Error(this.lastError!));
      this.pending.clear();
      this.child = null;
    });

    await this.readyPromise;
  }

  private handleLine(line: string): void {
    let msg: { id?: string; event?: string; translation?: string; error?: string };
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (msg.event === 'ready') {
      this.readyResolve?.();
      return;
    }
    if (!msg.id) return;
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    this.pending.delete(msg.id);
    if (msg.error) pending.reject(new Error(msg.error));
    else pending.resolve(msg.translation ?? '');
  }

  async isReady(): Promise<boolean> {
    return this.child !== null && this.readyPromise !== null;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  async translate(text: string, srcNllb: string, tgtNllb: string): Promise<string> {
    if (!this.child) throw new Error('Translation engine is not running');
    const id = randomUUID();
    const request = JSON.stringify({ id, text, src: srcNllb, tgt: tgtNllb }) + '\n';
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child!.stdin.write(request);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('Translation request timed out'));
        }
      }, 15000);
    });
  }

  stop(): void {
    this.child?.kill();
    this.child = null;
  }
}
