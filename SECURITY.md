# Security Policy

## Supported Versions

Only the latest released version of LiveTranslate receives security fixes.

## Reporting a Vulnerability

Please **do not** open a public issue for security vulnerabilities. Instead,
use GitHub's [private vulnerability reporting](https://github.com/livetranslate/livetranslate/security/advisories/new)
feature. We aim to acknowledge reports within 5 business days.

## Scope notes

LiveTranslate is designed to run entirely offline:

- It makes no network requests at runtime (all AI inference is local).
- The renderer runs with `contextIsolation: true`, `nodeIntegration: false`,
  and a strict Content-Security-Policy.
- `scripts/setup-models.sh` is the only part of the project that touches the
  network — it downloads model weights and native binaries once, from
  Hugging Face and GitHub Releases.

If you find a way for the packaged app to exfiltrate data or execute
untrusted code, we consider that a high-severity report.
