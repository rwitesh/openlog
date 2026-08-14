import { useCallback, useState } from "react";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

import { RECORDING_OPTIONS, RECORDING_POLL_MS } from "./constants";

export function useAudioRecording() {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, RECORDING_POLL_MS);

  const [recordedUri, setRecordedUri] = useState<string | undefined>();
  const [recordedDurationMs, setRecordedDurationMs] = useState<number | undefined>();

  const start = useCallback(async (): Promise<boolean> => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return false;

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    setRecordedUri(undefined);
    setRecordedDurationMs(undefined);

    await recorder.prepareToRecordAsync();
    recorder.record();
    return true;
  }, [recorder]);

  const stop = useCallback(async () => {
    await recorder.stop();
    if (recorder.uri) {
      setRecordedUri(recorder.uri);
      setRecordedDurationMs(Math.round(recorder.currentTime * 1000));
    }
  }, [recorder]);

  const toggle = useCallback(async () => {
    if (recorderState.isRecording) await stop();
    else await start();
  }, [recorderState.isRecording, start, stop]);

  const clear = useCallback(() => {
    setRecordedUri(undefined);
    setRecordedDurationMs(undefined);
  }, []);

  const durationMs = recorderState.isRecording
    ? recorderState.durationMillis
    : recordedDurationMs ?? 0;

  return {
    isRecording: recorderState.isRecording,
    durationMs,
    metering: recorderState.metering,
    recordedUri,
    recordedDurationMs,
    start,
    stop,
    toggle,
    clear,
  };
}
