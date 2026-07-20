import { dialog, BrowserWindow } from 'electron';
import { promises as fs } from 'node:fs';
import type { TranscriptSegment } from '@shared/types';

function toTxt(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => {
      const who = s.direction === 'incoming' ? 'Them' : 'You';
      const time = new Date(s.startedAt).toLocaleTimeString();
      return `[${time}] ${who} (${s.sourceLanguage}): ${s.sourceText}\n[${time}] Translation (${s.targetLanguage}): ${s.translatedText}\n`;
    })
    .join('\n');
}

function toSrt(segments: TranscriptSegment[]): string {
  const fmt = (ms: number) => {
    const d = new Date(ms);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(
      d.getUTCSeconds(),
    ).padStart(2, '0')},${String(d.getUTCMilliseconds()).padStart(3, '0')}`;
  };
  return segments
    .map((s, i) => {
      const start = fmt(s.startedAt);
      const end = fmt(s.updatedAt || s.startedAt + 2000);
      const who = s.direction === 'incoming' ? 'Them' : 'You';
      return `${i + 1}\n${start} --> ${end}\n${who}: ${s.translatedText || s.sourceText}\n`;
    })
    .join('\n');
}

export async function exportTranscript(
  win: BrowserWindow,
  segments: TranscriptSegment[],
  format: 'txt' | 'json' | 'srt',
): Promise<string | null> {
  const ext = format;
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export Transcript',
    defaultPath: `livetranslate-transcript-${Date.now()}.${ext}`,
    filters: [{ name: format.toUpperCase(), extensions: [ext] }],
  });
  if (canceled || !filePath) return null;

  let content: string;
  if (format === 'json') content = JSON.stringify(segments, null, 2);
  else if (format === 'srt') content = toSrt(segments);
  else content = toTxt(segments);

  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}
