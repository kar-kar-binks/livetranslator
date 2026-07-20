import { ArrowLeftRight, Cpu, Mic, Settings, Volume2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import LanguageSelector from './LanguageSelector';

interface Props {
  onOpenSettings: () => void;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
    />
  );
}

export default function TopBar({ onOpenSettings }: Props) {
  const settings = useAppStore((s) => s.settings);
  const engineStatus = useAppStore((s) => s.engineStatus);
  const connection = useAppStore((s) => s.connection);

  const modelsReady = engineStatus?.models.every((m) => m.ready) ?? false;

  const setIncoming = (code: string) =>
    void window.liveTranslate.invoke('settings:set', {
      incomingLanguage: code,
      autoDetectIncoming: code === 'auto',
    });
  const setOutgoing = (code: string) =>
    void window.liveTranslate.invoke('settings:set', { outgoingLanguage: code });
  const swap = () => void window.liveTranslate.invoke('pipeline:swap-languages');

  return (
    <header className="drag-region flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/70 bg-white/70 px-4 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-900/60">
      <div className="flex items-center gap-3 pl-16">
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <StatusDot ok={connection === 'listening'} />
          {connection === 'listening' ? 'Listening' : connection === 'paused' ? 'Paused' : 'Idle'}
        </div>
      </div>

      <div className="no-drag flex items-center gap-2">
        <LanguageSelector value={settings.incomingLanguage} onChange={setIncoming} />
        <button
          onClick={swap}
          title="Swap languages"
          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <ArrowLeftRight size={15} />
        </button>
        <LanguageSelector value={settings.outgoingLanguage} onChange={setOutgoing} excludeAuto />
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 text-xs text-zinc-400 sm:flex">
          <div className="flex items-center gap-1" title="Microphone">
            <Mic size={13} />
            <StatusDot ok={connection === 'listening'} />
          </div>
          <div className="flex items-center gap-1" title="Speaker">
            <Volume2 size={13} />
            <StatusDot ok={engineStatus?.speakerActive ?? false} />
          </div>
          <div className="flex items-center gap-1" title="Models">
            <Cpu size={13} />
            <StatusDot ok={modelsReady} />
          </div>
          {engineStatus && <span className="tabular-nums">{engineStatus.memoryUsageMb} MB</span>}
        </div>
        <button
          onClick={onOpenSettings}
          className="no-drag rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
