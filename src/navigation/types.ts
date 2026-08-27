export type RootStackParamList = {
  // auth: true forces the Clerk flow (voluntary login from Profile).
  Welcome: { auth?: boolean } | undefined;
  Timeline: undefined;
  Day: { dayTs: number };
  Compose: { entryId?: string; mode?: "view" | "edit" } | undefined;
  Settings: undefined;
  /* Settings categories — one pushed screen each, kept flat so the hub stays short. */
  SettingsProfile: undefined;
  SettingsAppearance: undefined;
  SettingsAccessibility: undefined;
  SettingsPrivacy: undefined;
  SettingsAbout: undefined;
  /* Appearance editors — pushed screens so each concern gets full room. */
  SettingsTheme: undefined;
  SettingsAccent: undefined;
  SettingsTypography: undefined;
  SettingsTimeline: undefined;
  SettingsBackground: undefined;
};
