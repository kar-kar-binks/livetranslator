import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { AppSettings } from '@shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-zinc-600 dark:text-zinc-300">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 ${
        checked ? 'bg-accent-500' : 'bg-zinc-300 dark:bg-zinc-600'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-150 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

const selectClass =
  'rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800';

export default function SettingsPanel({ open, onClose }: Props) {
  const settings = useAppStore((s) => s.settings);

  const update = (patch: Partial<AppSettings>) =>
    void window.liveTranslate.invoke('settings:set', patch);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-[380px] animate-slide-up overflow-y-auto border-l border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-8">
          <Section title="Recognition">
            <Row label="Speech model">
              <select
                className={selectClass}
                value={settings.sttModel}
                onChange={(e) => update({ sttModel: e.target.value as AppSettings['sttModel'] })}
              >
                <option value="whisper-tiny">Whisper Tiny (fastest)</option>
                <option value="whisper-base">Whisper Base (balanced)</option>
                <option value="whisper-small">Whisper Small</option>
                <option value="whisper-medium">Whisper Medium (best quality)</option>
              </select>
            </Row>
            <Row label="Auto-detect incoming language">
              <Toggle
                checked={settings.autoDetectIncoming}
                onChange={(v) =>
                  update({
                    autoDetectIncoming: v,
                    incomingLanguage: v
                      ? 'auto'
                      : settings.incomingLanguage === 'auto'
                        ? 'es'
                        : settings.incomingLanguage,
                  })
                }
              />
            </Row>
            <Row label="Speak my replies automatically">
              <Toggle
                checked={settings.autoSpeakOutgoing}
                onChange={(v) => update({ autoSpeakOutgoing: v })}
              />
            </Row>
            <Row label="Voice sensitivity">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.vadSensitivity}
                onChange={(e) => update({ vadSensitivity: Number(e.target.value) })}
                className="w-32 accent-accent-500"
              />
            </Row>
            <Row label="Noise suppression">
              <Toggle
                checked={settings.noiseSuppression}
                onChange={(v) => update({ noiseSuppression: v })}
              />
            </Row>
          </Section>

          <Section title="Performance">
            <Row label="Latency mode">
              <select
                className={selectClass}
                value={settings.latencyMode}
                onChange={(e) =>
                  update({ latencyMode: e.target.value as AppSettings['latencyMode'] })
                }
              >
                <option value="fastest">Fastest</option>
                <option value="balanced">Balanced</option>
                <option value="accurate">Most accurate</option>
              </select>
            </Row>
            <Row label="Compute device">
              <select
                className={selectClass}
                value={settings.computeDevice}
                onChange={(e) =>
                  update({ computeDevice: e.target.value as AppSettings['computeDevice'] })
                }
              >
                <option value="auto">Auto</option>
                <option value="metal">Metal (GPU)</option>
                <option value="cpu">CPU only</option>
              </select>
            </Row>
          </Section>

          <Section title="Voice">
            <Row label="Speech speed">
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={settings.ttsSpeed}
                onChange={(e) => update({ ttsSpeed: Number(e.target.value) })}
                className="w-32 accent-accent-500"
              />
            </Row>
          </Section>

          <Section title="Appearance">
            <Row label="Theme">
              <select
                className={selectClass}
                value={settings.theme}
                onChange={(e) => update({ theme: e.target.value as AppSettings['theme'] })}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </Row>
            <Row label="Font size">
              <select
                className={selectClass}
                value={settings.fontSize}
                onChange={(e) => update({ fontSize: e.target.value as AppSettings['fontSize'] })}
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
              </select>
            </Row>
          </Section>

          <Section title="Window">
            <Row label="Always on top">
              <Toggle
                checked={settings.alwaysOnTop}
                onChange={(v) => {
                  update({ alwaysOnTop: v });
                  void window.liveTranslate.invoke('window:set-always-on-top', v);
                }}
              />
            </Row>
            <Row label="Push to talk">
              <Toggle checked={settings.pushToTalk} onChange={(v) => update({ pushToTalk: v })} />
            </Row>
            <Row label="Launch at login">
              <Toggle
                checked={settings.launchAtLogin}
                onChange={(v) => update({ launchAtLogin: v })}
              />
            </Row>
          </Section>

          <Section title="Keyboard Shortcuts">
            {Object.entries(settings.hotkeys).map(([key, value]) => (
              <Row
                key={key}
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
              >
                <kbd className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-800">
                  {value.replace('CommandOrControl', '⌘')}
                </kbd>
              </Row>
            ))}
          </Section>

          <Section title="Export">
            <div className="flex gap-2">
              {(['txt', 'json', 'srt'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => void window.liveTranslate.invoke('transcript:export', { format })}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium uppercase transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {format}
                </button>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
