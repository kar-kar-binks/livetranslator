import { useEffect, useMemo, useRef } from 'react';
import { MessagesSquare } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import TranscriptMessage from './TranscriptMessage';

export default function TranscriptPanel() {
  const segments = useAppStore((s) => s.segments);
  const fontSize = useAppStore((s) => s.settings.fontSize);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const autoScroll = useAppStore((s) => s.autoScroll);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    const q = searchQuery.toLowerCase();
    return segments.filter(
      (s) => s.sourceText.toLowerCase().includes(q) || s.translatedText.toLowerCase().includes(q),
    );
  }, [segments, searchQuery]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filtered.length, autoScroll]);

  const speak = (segmentId: string) =>
    void window.liveTranslate.invoke('pipeline:speak-translation', { segmentId });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-400">
        <MessagesSquare size={40} strokeWidth={1.25} />
        <div className="text-center">
          <p className="font-medium">No conversation yet</p>
          <p className="text-sm">
            Press Listen and start talking — translations appear here in real time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
      {filtered.map((segment) => (
        <TranscriptMessage key={segment.id} segment={segment} fontSize={fontSize} onSpeak={speak} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
