import PostHog from "posthog-react-native";
import { IS_EXPO_GO } from "@/shared/utils/appInfo";

const projectToken = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN;

// Set by eas.json build profiles; anything not built as production is development.
const env = process.env.EXPO_PUBLIC_APP_ENV === "production" ? "production" : "development";

const client =
  projectToken && !IS_EXPO_GO
    ? new PostHog(projectToken, {
        host: "https://us.i.posthog.com",
        captureAppLifecycleEvents: true,
      })
    : null;

client?.register({ Environment: env });

export const posthog = client;
