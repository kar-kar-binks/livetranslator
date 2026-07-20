import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { playPcm16 } from '../services/ttsPlayback';
import { getLanguage } from '@shared/languages';

/** Subscribes to main-process IPC events for the lifetime of the app shell. */
export function usePipelineSync(): void {
  const upsertSegment = useAppStore((s) => s.upsertSegment);
  const removeSegment = useAppStore((s) => s.removeSegment);
  const setEngineStatus = useAppStore((s) => s.setEngineStatus);
  const setSettings = useAppStore((s) => s.setSettings);
  const spokenSegmentIds = useRef(new Set<string>());

  useEffect(() => {
    const offSegment = window.liveTranslate.on('transcript:segment', (segment) => {
      upsertSegment(segment);

      const { autoSpeakOutgoing } = useAppStore.getState().settings;
      const targetLang = getLanguage(segment.targetLanguage);
      const canAutoSpeak =
        autoSpeakOutgoing &&
        segment.direction === 'outgoing' &&
        segment.status === 'done' &&
        !!segment.translatedText &&
        !!targetLang.piperVoice &&
        !spokenSegmentIds.current.has(segment.id);

      if (canAutoSpeak) {
        spokenSegmentIds.current.add(segment.id);
        void window.liveTranslate.invoke('pipeline:speak-translation', { segmentId: segment.id });
      }
    });
    const offRemove = window.liveTranslate.on('transcript:remove', ({ id }) => removeSegment(id));
    const offStatus = window.liveTranslate.on('engine:status', (status) => setEngineStatus(status));
    const offSettings = window.liveTranslate.on('settings:changed', (settings) =>
      setSettings(settings),
    );
    const offTts = window.liveTranslate.onTtsPlayback(({ pcm, sampleRate }) => {
      void playPcm16(pcm, sampleRate);
    });
    const offError = window.liveTranslate.on('pipeline:error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[pipeline error]', err);
    });

    void window.liveTranslate.invoke('settings:get').then(setSettings);

    const interval = setInterval(() => {
      void window.liveTranslate.invoke('models:status').then(setEngineStatus);
    }, 3000);

    return () => {
      offSegment();
      offRemove();
      offStatus();
      offSettings();
      offTts();
      offError();
      clearInterval(interval);
    };
  }, [upsertSegment, removeSegment, setEngineStatus, setSettings]);
}
