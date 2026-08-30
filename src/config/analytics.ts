import { posthog } from "@/config/posthog";

type AnalyticsProperties = Record<string, string | number | boolean | null>;

export const analytics = {
  capture(event: string, properties?: AnalyticsProperties) {
    posthog?.capture(event, properties);
  },
  screen(name?: string) {
    if (name) posthog?.screen(name);
  },
};
