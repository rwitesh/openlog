import PostHog from "posthog-react-native";
import { IS_EXPO_GO } from "@/shared/utils";

const projectToken = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

if (__DEV__ && !IS_EXPO_GO && !projectToken) {
  throw new Error("Missing EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN in environment");
}

if (__DEV__ && !IS_EXPO_GO && !host) {
  throw new Error("Missing EXPO_PUBLIC_POSTHOG_HOST in environment");
}

export const posthog =
  !IS_EXPO_GO && projectToken && host
    ? new PostHog(projectToken, {
        host,
        captureAppLifecycleEvents: true,
      })
    : null;
