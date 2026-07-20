import path from 'node:path';
import { app } from 'electron';

/**
 * Resolves paths to bundled native binaries and models.
 * In development these live under the repo root; in a packaged app they are
 * copied into `Contents/Resources/{bin,models}` via electron-builder's
 * `extraResources` (see electron-builder.yml).
 */
export function resourcesRoot(): string {
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  return path.resolve(app.getAppPath(), 'resources');
}

export function modelsRoot(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'models');
  }
  return path.resolve(app.getAppPath(), 'models');
}

export function binPath(name: string): string {
  const bin = app.isPackaged
    ? path.join(process.resourcesPath, 'bin', name)
    : path.resolve(app.getAppPath(), 'resources', 'bin', name);
  return bin;
}

export function modelPath(...segments: string[]): string {
  return path.join(modelsRoot(), ...segments);
}

function pythonRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'python')
    : path.resolve(app.getAppPath(), 'resources', 'python');
}

/**
 * Path to the portable, fully self-contained CPython interpreter provisioned
 * by scripts/setup-models.sh (python-build-standalone — NOT a stdlib venv,
 * which is not relocatable and would break once packaged into an .app). This
 * is what makes the packaged app work on any Mac without requiring Python,
 * Homebrew, or anything else pre-installed on that machine.
 */
export function pythonBin(): string {
  return path.join(pythonRoot(), 'bin', 'python3');
}

/**
 * Path to the `piper` CLI installed by `pip install piper-tts` into the same
 * portable Python used for translation. We use the PyPI package rather than
 * Piper's prebuilt native binary because the official macOS release
 * tarballs ship missing shared library dependencies (see
 * scripts/setup-models.sh for details).
 */
export function piperBin(): string {
  return path.join(pythonRoot(), 'bin', 'piper');
}
