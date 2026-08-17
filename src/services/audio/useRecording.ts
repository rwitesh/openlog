import { useCallback, useEffect, useRef, useState } from "react";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

import { meteringToLevel, liveWaveformLevels } from "./waveform";
import { RECORDING_OPTIONS, RECORDING_POLL_MS } from "./constants";

const MAX_LIVE_SAMPLES = 48;

export function useRecording() {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, RECORDING_POLL_MS);

  const [recordedUri, setRecordedUri] = useState<string | undefined>();
  const [recordedDurationMs, setRecordedDurationMs] = useState<number | undefined>();
  const [recordedLevels, setRecordedLevels] = useState<number[]>([]);
  const [liveLevels, setLiveLevels] = useState<number[]>([]);
  const samplesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!recorderState.isRecording) return;

    const level = meteringToLevel(recorderState.metering);
    samplesRef.current.push(level);
    if (samplesRef.current.length > MAX_LIVE_SAMPLES) {
      samplesRef.current.shift();
    }
    setLiveLevels([...samplesRef.current]);
  }, [recorderState.isRecording, recorderState.metering]);

  useEffect(() => {
    return () => {
      try {
        if (recorder.getStatus().isRecording) {
          void recorder.stop();
        }
      } catch {
        // Handle might already be disposed
      }
    };
  }, [recorder]);

  const start = useCallback(async (): Promise<boolean> => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return false;

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    setRecordedUri(undefined);
    setRecordedDurationMs(undefined);
    setRecordedLevels([]);
    samplesRef.current = [];
    setLiveLevels([]);

    await recorder.prepareToRecordAsync();
    recorder.record();
    return true;
  }, [recorder]);

  const stop = useCallback(async () => {
    const status = recorder.getStatus();
    const levels = liveWaveformLevels(samplesRef.current);
    await recorder.stop();

    if (recorder.uri) {
      setRecordedUri(recorder.uri);
      setRecordedDurationMs(status.durationMillis);
      setRecordedLevels(levels);
    }
  }, [recorder]);

  const toggle = useCallback(async () => {
    if (recorderState.isRecording) await stop();
    else await start();
  }, [recorderState.isRecording, start, stop]);

  const clear = useCallback(() => {
    setRecordedUri(undefined);
    setRecordedDurationMs(undefined);
    setRecordedLevels([]);
    samplesRef.current = [];
    setLiveLevels([]);
  }, []);

  const durationMs = recorderState.isRecording
    ? recorderState.durationMillis
    : recordedDurationMs ?? 0;

  return {
    isRecording: recorderState.isRecording,
    durationMs,
    liveLevels,
    recordedUri,
    recordedDurationMs,
    recordedLevels,
    toggle,
    clear,
  };
}
