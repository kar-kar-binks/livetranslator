import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AudioCaptureService } from '../services/audioCapture';

/**
 * Drives the "listen" lifecycle: starts/stops mic capture, toggles the
 * main-process pipeline, and exposes a live input level for the VU
 * indicator in the UI. There's a single continuous capture session — the
 * main process auto-classifies each utterance as the local user or the
 * other party (see PipelineManager), so no separate "reply" control is
 * needed here.
 */
export function useConversation() {
  const settings = useAppStore((s) => s.settings);
  const connection = useAppStore((s) => s.connection);
  const setConnection = useAppStore((s) => s.setConnection);
  const muted = useAppStore((s) => s.muted);

  const [level, setLevel] = useState(0);
  const captureRef = useRef<AudioCaptureService | null>(null);
  const rafRef = useRef<number | null>(null);

  const pollLevel = useCallback(() => {
    if (captureRef.current) setLevel(captureRef.current.getLevel());
    rafRef.current = requestAnimationFrame(pollLevel);
  }, []);

  const startListening = useCallback(async () => {
    if (!captureRef.current) captureRef.current = new AudioCaptureService();
    await captureRef.current.start(settings.microphoneId, settings.noiseSuppression);
    await window.liveTranslate.invoke('pipeline:start-listening');
    setConnection('listening');
    rafRef.current = requestAnimationFrame(pollLevel);
  }, [settings.microphoneId, settings.noiseSuppression, setConnection, pollLevel]);

  const stopListening = useCallback(async () => {
    await captureRef.current?.stop();
    await window.liveTranslate.invoke('pipeline:stop-listening');
    setConnection('idle');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setLevel(0);
  }, [setConnection]);

  const toggleListening = useCallback(async () => {
    if (connection === 'listening') await stopListening();
    else await startListening();
  }, [connection, startListening, stopListening]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      void captureRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (muted) void captureRef.current?.stop();
  }, [muted]);

  return { connection, level, startListening, stopListening, toggleListening };
}
