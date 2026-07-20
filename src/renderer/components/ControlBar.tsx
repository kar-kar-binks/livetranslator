import { Mic, MicOff, Pause, Search, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useConversation } from '../hooks/useConversation';

export default function ControlBar() {
  const { connection, level, toggleListening } = useConversation();
  const muted = useAppStore((s) => s.muted);
  const toggleMuted = useAppStore((s) => s.toggleMuted);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);

  const clearConversation = async () => {
    await window.liveTranslate.invoke('transcript:clear');
    useAppStore.getState().clearSegments();
  };

  const listening = connection === 'listening';

  return (
    <footer className="flex shrink-0 flex-col gap-3 border-t border-zinc-200/70 bg-white/70 px-6 py-4 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-900/60">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
          <Search size={14} className="shrink-0 text-zinc-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
        </div>

        <button
          onClick={() => void toggleMuted()}
          title="Mute microphone"
          className={`rounded-lg p-2 transition ${muted ? 'bg-red-100 text-red-600 dark:bg-red-500/20' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
        >
          {muted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          onClick={() => void clearConversation()}
          title="Clear conversation"
          className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex items-center justify-center">
        <button
          onClick={() => void toggleListening()}
          className={`relative flex h-16 w-64 items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] ${
            listening ? 'bg-red-500 hover:bg-red-600' : 'bg-accent-500 hover:bg-accent-600'
          }`}
        >
          {listening && (
            <span
              className="absolute inset-0 animate-pulse-ring rounded-2xl bg-red-400"
              style={{ opacity: Math.min(0.5, level) }}
            />
          )}
          {listening ? <Pause size={18} /> : <Mic size={18} />}
          {listening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>
    </footer>
  );
}
