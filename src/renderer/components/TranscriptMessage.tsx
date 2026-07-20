import { Loader2, Play, User, Users } from 'lucide-react';
import type { TranscriptSegment } from '@shared/types';
import { getLanguage } from '@shared/languages';

interface Props {
  segment: TranscriptSegment;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  onSpeak: (id: string) => void;
}

const FONT_SIZE_MAP: Record<Props['fontSize'], string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

export default function TranscriptMessage({ segment, fontSize, onSpeak }: Props) {
  const isIncoming = segment.direction === 'incoming';
  const time = new Date(segment.startedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const targetLang = getLanguage(segment.targetLanguage);
  const canSpeak = !isIncoming && segment.status === 'done' && !!targetLang.piperVoice;

  return (
    <div className={`flex animate-slide-up gap-3 ${isIncoming ? '' : 'flex-row-reverse'}`}>
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isIncoming
            ? 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300'
            : 'bg-accent-500 text-white'
        }`}
      >
        {isIncoming ? <Users size={14} /> : <User size={14} />}
      </div>

      <div
        className={`flex max-w-[75%] flex-col gap-1 ${isIncoming ? 'items-start' : 'items-end'}`}
      >
        <div className="flex items-center gap-2 px-1 text-[11px] font-medium text-zinc-400">
          <span>{isIncoming ? 'Them' : 'You'}</span>
          <span>{time}</span>
          {segment.status === 'transcribing' && (
            <span className="flex items-center gap-1 text-accent-500">
              <Loader2 size={10} className="animate-spin" /> transcribing
            </span>
          )}
          {segment.status === 'translating' && (
            <span className="flex items-center gap-1 text-accent-500">
              <Loader2 size={10} className="animate-spin" /> translating
            </span>
          )}
          {segment.status === 'error' && <span className="text-red-500">error</span>}
        </div>

        <div
          className={`rounded-2xl px-4 py-3 shadow-soft dark:shadow-soft-dark ${
            isIncoming
              ? 'rounded-tl-sm bg-white dark:bg-zinc-800'
              : 'rounded-tr-sm bg-accent-500 text-white dark:bg-accent-600'
          }`}
        >
          {segment.sourceText && (
            <p
              className={`${FONT_SIZE_MAP[fontSize]} ${isIncoming ? '' : 'text-white/90'} font-normal`}
            >
              {segment.sourceText}
            </p>
          )}
          {segment.translatedText && (
            <p
              className={`${FONT_SIZE_MAP[fontSize]} mt-1.5 border-t pt-1.5 font-medium ${
                isIncoming
                  ? 'border-zinc-100 text-accent-600 dark:border-zinc-700 dark:text-accent-400'
                  : 'border-white/20 text-white'
              }`}
            >
              {segment.translatedText}
            </p>
          )}
          {segment.error && <p className="text-sm text-red-400">{segment.error}</p>}
        </div>

        {canSpeak && (
          <button
            onClick={() => onSpeak(segment.id)}
            className="no-drag flex items-center gap-1.5 rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-accent-600"
          >
            <Play size={11} fill="currentColor" /> Speak Translation
          </button>
        )}
      </div>
    </div>
  );
}
