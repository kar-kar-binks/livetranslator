import { create } from 'zustand';
import type { AppSettings, EngineStatus, TranscriptSegment } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/types';

export type ConnectionState = 'idle' | 'listening' | 'paused';

interface AppState {
  settings: AppSettings;
  segments: TranscriptSegment[];
  engineStatus: EngineStatus | null;
  connection: ConnectionState;
  muted: boolean;
  floatingSubtitlesVisible: boolean;
  searchQuery: string;
  autoScroll: boolean;

  setSettings: (settings: AppSettings) => void;
  upsertSegment: (segment: TranscriptSegment) => void;
  removeSegment: (id: string) => void;
  clearSegments: () => void;
  setEngineStatus: (status: EngineStatus) => void;
  setConnection: (state: ConnectionState) => void;
  toggleMuted: () => void;
  toggleFloatingSubtitles: () => void;
  setSearchQuery: (q: string) => void;
  setAutoScroll: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  settings: DEFAULT_SETTINGS,
  segments: [],
  engineStatus: null,
  connection: 'idle',
  muted: false,
  floatingSubtitlesVisible: false,
  searchQuery: '',
  autoScroll: true,

  setSettings: (settings) => set({ settings }),
  upsertSegment: (segment) =>
    set((state) => {
      const idx = state.segments.findIndex((s) => s.id === segment.id);
      if (idx >= 0) {
        const next = state.segments.slice();
        next[idx] = segment;
        return { segments: next };
      }
      return { segments: [...state.segments, segment] };
    }),
  removeSegment: (id) => set((state) => ({ segments: state.segments.filter((s) => s.id !== id) })),
  clearSegments: () => set({ segments: [] }),
  setEngineStatus: (engineStatus) => set({ engineStatus }),
  setConnection: (connection) => set({ connection }),
  toggleMuted: () => set((state) => ({ muted: !state.muted })),
  toggleFloatingSubtitles: () =>
    set((state) => ({ floatingSubtitlesVisible: !state.floatingSubtitlesVisible })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setAutoScroll: (autoScroll) => set({ autoScroll }),
}));
