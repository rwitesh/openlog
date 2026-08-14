export type RootStackParamList = {
  Welcome: undefined;
  Timeline: undefined;
  Memory: { monthTs: number };
  Day: { dayTs: number };
  Compose: { entryId?: string } | undefined;
  Settings: undefined;
};
