export type RootStackParamList = {
  Welcome: undefined;
  Timeline: undefined;
  Memory: { monthTs: number };
  Day: { dayTs: number };
  Compose: { entryId?: string; mode?: "view" | "edit" } | undefined;
  Settings: undefined;
  Appearance: undefined;
};
