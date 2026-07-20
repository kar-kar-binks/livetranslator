import { useEffect, useState } from 'react';
import TopBar from './components/TopBar';
import TranscriptPanel from './components/TranscriptPanel';
import ControlBar from './components/ControlBar';
import SettingsPanel from './components/SettingsPanel';
import { usePipelineSync } from './hooks/usePipelineSync';
import { useConversation } from './hooks/useConversation';
import { useTheme } from './hooks/useTheme';
import { useAppStore } from './store/useAppStore';

export default function App() {
  usePipelineSync();
  useTheme();
  const { toggleListening } = useConversation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const muted = useAppStore((s) => s.muted);
  const toggleMuted = useAppStore((s) => s.toggleMuted);

  useEffect(() => {
    const offs = [
      window.liveTranslate.onMenu('menu:open-settings', () => setSettingsOpen(true)),
      window.liveTranslate.onMenu('menu:toggle-listening', () => void toggleListening()),
      window.liveTranslate.onMenu('menu:toggle-mute', () => toggleMuted()),
      window.liveTranslate.onMenu(
        'menu:swap-languages',
        () => void window.liveTranslate.invoke('pipeline:swap-languages'),
      ),
      window.liveTranslate.onMenu(
        'menu:toggle-floating-subtitles',
        () => void window.liveTranslate.invoke('window:toggle-floating-subtitles'),
      ),
      window.liveTranslate.onMenu('menu:clear-transcript', () => {
        void window.liveTranslate.invoke('transcript:clear');
        useAppStore.getState().clearSegments();
      }),
      window.liveTranslate.onMenu(
        'menu:export-transcript',
        () => void window.liveTranslate.invoke('transcript:export', { format: 'txt' }),
      ),
    ];
    return () => offs.forEach((off) => off());
  }, [toggleListening, toggleMuted]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-light dark:bg-surface-dark">
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />
      <TranscriptPanel />
      <ControlBar />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {muted && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
          Microphone muted
        </div>
      )}
    </div>
  );
}
