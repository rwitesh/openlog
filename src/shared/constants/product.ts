import Constants from "expo-constants";

export const APP_NAME: string = (Constants.expoConfig?.name as string) ?? "OpenLog";
export const APP_SLUG = APP_NAME.toLowerCase();
export const DEVELOPER_NAME = "Rwitesh Bera";
export const DEVELOPER_URL = "https://x.com/rwiteshbera";

// Beta switch: false = local-only onboarding with optional login; true restores the Clerk-gated flow.
export const AUTH_REQUIRED_FOR_ONBOARDING = false;
