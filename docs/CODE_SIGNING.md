# Code Signing & Notarization (macOS)

Unsigned/ad-hoc builds run fine locally (`npm run dist:mac`) but macOS
Gatekeeper will warn users who download a DMG that isn't signed and notarized
by Apple. To publish signed releases:

## 1. Get an Apple Developer ID certificate

You need a paid Apple Developer Program membership. In Xcode or the Apple
Developer portal, create a **Developer ID Application** certificate and
export it (with its private key) as a `.p12` file.

## 2. Configure secrets

In your GitHub repo settings → Secrets and variables → Actions, add:

| Secret                        | Value                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `MAC_CERTIFICATE_P12_BASE64`  | `base64 -i DeveloperIDApplication.p12` output                                        |
| `MAC_CERTIFICATE_PASSWORD`    | The password you set exporting the `.p12`                                            |
| `APPLE_ID`                    | Your Apple ID email                                                                  |
| `APPLE_APP_SPECIFIC_PASSWORD` | An [app-specific password](https://support.apple.com/en-us/102654) for that Apple ID |
| `APPLE_TEAM_ID`               | Your 10-character Apple Developer Team ID                                            |

These are already wired into [`.github/workflows/release.yml`](../.github/workflows/release.yml)
and picked up automatically by `electron-builder` (via `@electron/notarize`)
when present.

## 3. Local signed builds (optional)

```bash
export CSC_LINK=/path/to/DeveloperIDApplication.p12
export CSC_KEY_PASSWORD=your-p12-password
export APPLE_ID=you@example.com
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=ABCDE12345
npm run dist:mac
```

## 4. Without signing

Running `npm run dist:mac` without any of the above produces an ad-hoc signed
build. Users can still open it via right-click → Open, or by running:

```bash
xattr -cr /Applications/LiveTranslate.app
```

This is fine for local development and testing but not recommended for
public distribution.
