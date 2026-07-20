# Contributing to LiveTranslate

Thanks for considering a contribution! LiveTranslate is a fully offline,
real-time speech translation app for macOS, and we'd love your help making it
better.

## Getting started

1. Fork and clone the repo.
2. Install dependencies: `npm install`
3. Provision local AI models (one-time, requires internet the first time
   only): `npm run setup:models`
4. Start the dev app: `npm run electron:dev`

See the [README](README.md#development) for the full development guide and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pipeline fits
together.

## Development workflow

- Branch from `main`: `git checkout -b feat/your-feature`
- Write code following the existing TypeScript/React patterns — strict mode
  is on, keep it that way.
- Run `npm run lint` and `npm run typecheck` before opening a PR.
- Add or update tests under `**/__tests__` when you change pipeline or utility
  logic (`npm test`).
- Commit using [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, …) — this is enforced by
  commitlint via a Husky hook.

## Pull requests

- Keep PRs focused on a single change; large unrelated diffs are hard to
  review.
- Describe **why** the change is needed, not just what changed.
- Link any related issue.
- A maintainer will review within a few days — thank you for your patience.

## Reporting bugs / requesting features

Please use the issue templates — they help us get the information we need to
act quickly. Bug reports should include your macOS version, chip
(Intel/Apple Silicon), and the app version.

## Areas we especially welcome help with

- Additional Piper TTS voices wired into `src/shared/languages.ts`
- Performance profiling on Intel Macs
- Accessibility improvements (VoiceOver support, contrast, keyboard nav)
- Translations of the UI itself (i18n)

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By
participating, you agree to uphold it.
