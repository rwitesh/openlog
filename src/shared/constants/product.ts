import Constants from "expo-constants";

export const APP_NAME: string = (Constants.expoConfig?.name as string) ?? "OpenLog";
export const APP_SLUG = APP_NAME.toLowerCase();
export const WEBSITE_URL = "https://rwitesh.github.io/openlog/";
export const PRIVACY_POLICY_URL = "https://rwitesh.github.io/openlog/privacy-policy.html";
export const TERMS_URL = "https://rwitesh.github.io/openlog/terms.html";

// Beta switch: false = local-only onboarding with optional login; true restores the Clerk-gated flow.
export const AUTH_REQUIRED_FOR_ONBOARDING = false;
