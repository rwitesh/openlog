import PostHog from "posthog-react-native";

const projectToken = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN;

// Set by eas.json build profiles; anything not built as production is development.
const env = process.env.EXPO_PUBLIC_APP_ENV === "production" ? "production" : "development";

// Dev bundles served by Metro never report: their events would pollute the
// project, and their flush failures surface as noise in the dev overlay.
const client =
  projectToken && !__DEV__
    ? new PostHog(projectToken, {
        host: "https://us.i.posthog.com",
        // Interaction autocapture is disabled; analytics and diagnostics are explicit.
        captureAppLifecycleEvents: true,
        enableSessionReplay: false,
        errorTracking: {
          autocapture: { uncaughtExceptions: true, unhandledRejections: true, console: false },
        },
      })
    : null;

client?.register({ Environment: env });

export const posthog = client;
