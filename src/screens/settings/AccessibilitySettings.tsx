import {
  AccessibilitySection,
  LiveThemePreview,
  SettingsEditorScreen,
} from "@/modules/settings";

/** Accessibility category — text sizing, contrast, and motion, previewed live. */
export function AccessibilitySettingsScreen() {
  return (
    <SettingsEditorScreen preview={<LiveThemePreview />}>
      <AccessibilitySection />
    </SettingsEditorScreen>
  );
}
