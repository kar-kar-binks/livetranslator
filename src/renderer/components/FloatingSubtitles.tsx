import { useEffect, useState } from 'react';
import type { TranscriptSegment } from '@shared/types';

/**
 * Minimal always-on-top subtitle overlay shown in a separate transparent
 * BrowserWindow (see window:toggle-floating-subtitles). Renders only the
 * latest translated line, large and legible, for glanceable reading while
 * a call is on speakerphone.
 */
export default function FloatingSubtitles() {
  const [latest, setLatest] = useState<TranscriptSegment | null>(null);

  useEffect(() => {
    return window.liveTranslate.on('transcript:segment', (segment) => {
      if (segment.translatedText || segment.sourceText) setLatest(segment);
    });
  }, []);

  return (
    <div className="drag-region flex h-screen w-screen items-center justify-center bg-black/70 px-8 backdrop-blur-md">
      <p className="animate-fade-in text-center text-2xl font-semibold leading-snug text-white">
        {latest?.translatedText || latest?.sourceText || 'Waiting for speech…'}
      </p>
    </div>
  );
}
