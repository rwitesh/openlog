import Constants from "expo-constants";
import PostHog from "posthog-react-native";
import { IS_EXPO_GO } from "@/shared/utils";

const extra = Constants.expoConfig?.extra;
const projectToken = extra?.posthogProjectToken as string | undefined;
const host = extra?.posthogHost as string | undefined;

if (__DEV__ && !IS_EXPO_GO && !projectToken) {
  throw new Error("Missing POSTHOG_PROJECT_TOKEN in environment");
}

if (__DEV__ && !IS_EXPO_GO && !host) {
  throw new Error("Missing POSTHOG_HOST in environment");
}

export const posthog =
  !IS_EXPO_GO && projectToken && host
    ? new PostHog(projectToken, {
        host,
        captureAppLifecycleEvents: true,
      })
    : null;
