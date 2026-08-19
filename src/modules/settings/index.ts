/* Generic building blocks shared by every settings editor. */
export * from "./core/SettingsRow";
export * from "./core/SettingsSheet";
export * from "./core/SettingsGroup";
export * from "./core/SegmentedRow";
export * from "./core/ToggleRow";

/* Feature editors — one per settings row, rendered inside the shared sheet. */
export * from "./components/ProfileSection";
export * from "./components/ThemeSection";
export * from "./components/AccentSection";
export * from "./components/TypographySection";
export * from "./components/TimelineSection";
export * from "./components/BackgroundSection";
export * from "./components/AccessibilitySection";
export * from "./components/PrivacySection";
export * from "./components/DataSection";

/* Shared behavior. */
export * from "./utils/confirm";
