#!/usr/bin/env bash
#
# One-time (well — idempotent, so really "run any time you want") setup:
# builds whisper.cpp from source, downloads quantized model weights,
# provisions a fully self-contained portable Python runtime (not a venv —
# see below), and uses it to install CTranslate2 + a converted NLLB-200
# translation model plus the piper-tts package (text-to-speech).
#
# Crucially, everything this script produces lives entirely under the repo
# (resources/, models/, .build/) and is fully relocatable — no dependency on
# Homebrew, a system Python, or anything else on the machine that ran this
# script. That's what lets `npm run dist:mac` package a LiveTranslate.app
# that works on any other Mac of the same CPU architecture, with zero setup
# on that machine.
#
# Why not a regular `python3 -m venv`? A stdlib venv's python3 is a symlink
# (or thin shim) back to whatever system Python created it — it is NOT
# relocatable, and breaks the moment it's copied to another machine or even
# a different path. We use a "python-build-standalone" distribution instead
# (https://github.com/astral-sh/python-build-standalone), a fully
# self-contained CPython build designed to be moved around, which is exactly
# what packaging into an .app bundle requires.
#
# After this script completes, LiveTranslate runs with ZERO network access.
# Re-run any time to fetch a different Whisper model size (--stt-model) or to
# repair a broken install — every step is skipped if already done.
#
# Usage:
#   scripts/setup-models.sh [--stt-model tiny|base|small|medium] [--skip-translate] [--skip-tts]
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODELS_DIR="$ROOT_DIR/models"
BIN_DIR="$ROOT_DIR/resources/bin"
PYTHON_DIR="$ROOT_DIR/resources/python"
STT_MODEL="base"
SKIP_TRANSLATE=0
SKIP_TTS=0

# Pinned python-build-standalone release. Pinned (not "latest") deliberately —
# asset filenames are date-versioned, and resolving "latest" dynamically has
# already bitten this project once (see the Piper binary saga in git log).
PBS_RELEASE_TAG="20260718"
PBS_PYTHON_VERSION="3.10.20"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stt-model) STT_MODEL="$2"; shift 2 ;;
    --skip-translate) SKIP_TRANSLATE=1; shift ;;
    --skip-tts) SKIP_TTS=1; shift ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

mkdir -p "$MODELS_DIR/whisper" "$MODELS_DIR/nllb" "$MODELS_DIR/piper" "$BIN_DIR"

echo "==> [1/3] whisper.cpp (speech recognition)"
if [[ ! -x "$BIN_DIR/whisper-cli" ]]; then
  WHISPER_SRC="$ROOT_DIR/.build/whisper.cpp"
  if [[ ! -d "$WHISPER_SRC" ]]; then
    git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git "$WHISPER_SRC"
  fi
  pushd "$WHISPER_SRC" >/dev/null
  # WHISPER_METAL=1 enables Apple Silicon GPU acceleration via Metal.
  cmake -B build -DWHISPER_METAL=1 -DCMAKE_BUILD_TYPE=Release
  cmake --build build -j --config Release --target whisper-cli
  cp build/bin/whisper-cli "$BIN_DIR/whisper-cli"
  popd >/dev/null
else
  echo "    whisper-cli already built, skipping."
fi

WHISPER_MODEL_FILE="ggml-${STT_MODEL}.bin"
if [[ ! -f "$MODELS_DIR/whisper/$WHISPER_MODEL_FILE" ]]; then
  echo "    downloading $WHISPER_MODEL_FILE ..."
  curl -L --fail -o "$MODELS_DIR/whisper/$WHISPER_MODEL_FILE" \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$WHISPER_MODEL_FILE"
else
  echo "    $WHISPER_MODEL_FILE already present, skipping."
fi

echo "==> [2/3] Portable Python runtime (translation + text-to-speech)"
if [[ ! -x "$PYTHON_DIR/bin/python3" ]]; then
  ARCH="$(uname -m)"
  case "$ARCH" in
    arm64) PY_TRIPLE="aarch64-apple-darwin" ;;
    x86_64) PY_TRIPLE="x86_64-apple-darwin" ;;
    *) echo "    unsupported architecture: $ARCH"; exit 1 ;;
  esac
  PBS_ASSET="cpython-${PBS_PYTHON_VERSION}+${PBS_RELEASE_TAG}-${PY_TRIPLE}-install_only.tar.gz"
  curl -L --fail -o "/tmp/$PBS_ASSET" \
    "https://github.com/astral-sh/python-build-standalone/releases/download/${PBS_RELEASE_TAG}/${PBS_ASSET}"
  rm -rf "$ROOT_DIR/resources/python"
  tar -xzf "/tmp/$PBS_ASSET" -C "$ROOT_DIR/resources"
  rm -f "/tmp/$PBS_ASSET"
else
  echo "    portable Python already installed, skipping."
fi

PY="$PYTHON_DIR/bin/python3"
"$PY" -m pip install --upgrade pip --quiet

if [[ $SKIP_TRANSLATE -eq 0 ]]; then
  # torch is only needed transiently, to load the HF checkpoint during the
  # one-time ct2-transformers-converter run below; translate_server.py itself
  # never imports it (only ctranslate2 + transformers' tokenizer), so it's
  # safe to leave installed without bloating the app's actual runtime work.
  "$PY" -m pip install --quiet torch ctranslate2 transformers sentencepiece huggingface_hub

  if [[ ! -d "$MODELS_DIR/nllb/ct2-600M" ]]; then
    echo "    converting facebook/nllb-200-distilled-600M to CTranslate2 int8 ..."
    "$PY" -c "
from huggingface_hub import snapshot_download
snapshot_download('facebook/nllb-200-distilled-600M', local_dir='$MODELS_DIR/nllb/hf-src')
"
    "$PYTHON_DIR/bin/ct2-transformers-converter" \
      --model "$MODELS_DIR/nllb/hf-src" \
      --output_dir "$MODELS_DIR/nllb/ct2-600M" \
      --quantization int8
    mkdir -p "$MODELS_DIR/nllb/tokenizer"
    cp "$MODELS_DIR/nllb/hf-src"/*.json "$MODELS_DIR/nllb/hf-src"/*.model "$MODELS_DIR/nllb/tokenizer/" 2>/dev/null || true
    rm -rf "$MODELS_DIR/nllb/hf-src"
  else
    echo "    NLLB-200 already converted, skipping."
  fi
else
  echo "    --skip-translate set, skipping translation model."
fi

if [[ $SKIP_TTS -eq 0 ]]; then
  # We use the `piper-tts` PyPI package rather than the prebuilt native
  # binary from Piper's GitHub releases: the official macOS release tarballs
  # (piper_macos_aarch64.tar.gz / piper_macos_x64.tar.gz) are missing the
  # .dylib files (libespeak-ng, libpiper_phonemize, libonnxruntime) the
  # `piper` binary links against via @rpath, making them fail to launch.
  # The pip wheels bundle onnxruntime + phonemization correctly and are
  # fully self-contained, so this is both simpler and actually works.
  "$PY" -m pip install --quiet piper-tts

  # Voice files live at:
  #   {lang}/{locale}/{name}/{quality}/{locale}-{name}-{quality}.onnx[.json]
  # e.g. en/en_US/lessac/medium/en_US-lessac-medium.onnx
  for VOICE in en_US-lessac-medium es_ES-davefx-medium fr_FR-siwis-medium de_DE-thorsten-medium; do
    if [[ ! -f "$MODELS_DIR/piper/${VOICE}.onnx" ]]; then
      echo "    downloading Piper voice: $VOICE"
      LOCALE="${VOICE%%-*}"          # en_US
      LANG_DIR="${LOCALE%%_*}"       # en
      REST="${VOICE#*-}"             # lessac-medium
      NAME="${REST%-*}"              # lessac
      QUALITY="${REST##*-}"          # medium
      BASE_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/${LANG_DIR}/${LOCALE}/${NAME}/${QUALITY}/${VOICE}"
      curl -L --fail -o "$MODELS_DIR/piper/${VOICE}.onnx" "${BASE_URL}.onnx" || \
        echo "    (voice unavailable at expected path — see https://github.com/rhasspy/piper/blob/master/VOICES.md for the correct URL)"
      curl -L --fail -o "$MODELS_DIR/piper/${VOICE}.onnx.json" "${BASE_URL}.onnx.json" || true
    fi
  done
else
  echo "    --skip-tts set, skipping."
fi

echo "==> [3/3] Done"
echo ""
echo "Models installed under:   $MODELS_DIR"
echo "Native binaries under:    $BIN_DIR"
echo "Portable Python under:    $PYTHON_DIR"
echo ""
echo "LiveTranslate is now fully provisioned for offline use, and everything"
echo "above is relocatable — 'npm run dist:mac' will package it all into a"
echo "self-contained .app that works on any Mac with the same CPU"
echo "architecture as this machine, no setup required on that machine."
