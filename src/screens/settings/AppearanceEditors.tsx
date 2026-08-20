import {
  AccentSection,
  BackgroundSection,
  LiveThemePreview,
  SettingsEditorScreen,
  ThemeSection,
  TimelineSection,
  TypographySection,
} from "@/modules/settings";

/** One route per appearance editor; each pairs the live preview with one concern. */

export function ThemeSettingsScreen() {
  return (
    <SettingsEditorScreen preview={<LiveThemePreview />}>
      <ThemeSection />
    </SettingsEditorScreen>
  );
}

export function AccentSettingsScreen() {
  return (
    <SettingsEditorScreen preview={<LiveThemePreview />}>
      <AccentSection />
    </SettingsEditorScreen>
  );
}

export function TypographySettingsScreen() {
  return (
    <SettingsEditorScreen preview={<LiveThemePreview />}>
      <TypographySection />
    </SettingsEditorScreen>
  );
}

export function TimelineSettingsScreen() {
  return (
    <SettingsEditorScreen preview={<LiveThemePreview />}>
      <TimelineSection />
    </SettingsEditorScreen>
  );
}

export function BackgroundSettingsScreen() {
  return (
    <SettingsEditorScreen preview={<LiveThemePreview />}>
      <BackgroundSection />
    </SettingsEditorScreen>
  );
}
