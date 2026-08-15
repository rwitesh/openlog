import { RecordingPresets } from "expo-audio";

/** Seconds to skip when using playback skip controls. */
export const PLAYBACK_SKIP_SECONDS = 10;

/** Polling interval for recording state updates (ms). */
export const RECORDING_POLL_MS = 100;

/** Polling interval for playback progress updates (ms). */
export const PLAYBACK_POLL_MS = 100;

/** Bars in timeline playback waveform. */
export const WAVEFORM_BAR_COUNT = 24;

/** Bars shown while recording (fewer = less visual noise). */
export const LIVE_WAVEFORM_BAR_COUNT = 18;

/** Recording preset with metering enabled for live level visualization. */
export const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};
