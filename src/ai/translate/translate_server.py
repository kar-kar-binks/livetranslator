#!/usr/bin/env python3
"""
Long-lived local translation sidecar.

Loads a CTranslate2-converted NLLB-200 distilled 600M model once and serves
translation requests over stdin/stdout as newline-delimited JSON, so the
(expensive) model load only happens a single time per app session instead of
per-utterance. The Electron main process spawns this once at startup and
keeps the process alive for the lifetime of the app (see
src/ai/translate/translate-engine.ts).

Protocol (one JSON object per line):
  request:  {"id": "<uuid>", "text": "...", "src": "eng_Latn", "tgt": "spa_Latn"}
  response: {"id": "<uuid>", "translation": "..."}
  error:    {"id": "<uuid>", "error": "..."}

Everything here runs fully offline: the model files under models/nllb are
fetched once by scripts/setup-models.sh and loaded from local disk only.
"""
import json
import sys
import os

MODEL_DIR = os.environ.get("LIVETRANSLATE_NLLB_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "nllb", "ct2-600M"))
TOKENIZER_DIR = os.environ.get("LIVETRANSLATE_NLLB_TOKENIZER_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "nllb", "tokenizer"))
DEVICE = os.environ.get("LIVETRANSLATE_DEVICE", "cpu")  # "cpu" or "cuda"; Apple Silicon uses cpu (int8) here


def log(msg: str) -> None:
    print(f"[translate-server] {msg}", file=sys.stderr, flush=True)


def main() -> None:
    try:
        import ctranslate2
        from transformers import AutoTokenizer
    except ImportError as exc:
        log(f"missing dependency: {exc}. Run scripts/setup-models.sh to provision the Python environment.")
        sys.exit(1)

    if not os.path.isdir(MODEL_DIR):
        log(f"model directory not found at {MODEL_DIR}. Run scripts/setup-models.sh first.")
        sys.exit(1)

    log(f"loading NLLB-200 (ctranslate2, device={DEVICE}) from {MODEL_DIR} ...")
    translator = ctranslate2.Translator(MODEL_DIR, device=DEVICE, compute_type="int8")
    tokenizer = AutoTokenizer.from_pretrained(TOKENIZER_DIR)
    log("ready")
    print(json.dumps({"event": "ready"}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue

        req_id = req.get("id")
        try:
            text = req["text"]
            src = req["src"]
            tgt = req["tgt"]
            if not text.strip():
                print(json.dumps({"id": req_id, "translation": ""}), flush=True)
                continue

            tokenizer.src_lang = src
            source_tokens = tokenizer.convert_ids_to_tokens(tokenizer.encode(text))
            target_prefix = [tgt]

            results = translator.translate_batch(
                [source_tokens],
                target_prefix=[target_prefix],
                beam_size=4,
                max_decoding_length=256,
            )
            output_tokens = results[0].hypotheses[0][1:]  # drop the forced target-lang prefix token
            translation = tokenizer.decode(tokenizer.convert_tokens_to_ids(output_tokens), skip_special_tokens=True)
            print(json.dumps({"id": req_id, "translation": translation}), flush=True)
        except Exception as exc:  # noqa: BLE001 - report all failures back over the protocol
            print(json.dumps({"id": req_id, "error": str(exc)}), flush=True)


if __name__ == "__main__":
    main()
