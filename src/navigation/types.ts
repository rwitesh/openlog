export type RootStackParamList = {
  Welcome: undefined;
  Timeline: undefined;
  Day: { dayTs: number };
  Tag: { tagId: string };
  Compose:
    | { entryId?: string; mode?: "view" | "edit"; initialDate?: number; initialTagId?: string }
    | undefined;
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
};
