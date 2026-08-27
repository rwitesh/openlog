const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// EXPO_PUBLIC_* vars are inlined at bundle time, so a shipped build always has
// the key. A missing key means the developer's machine lacks .env; fail fast
// there instead of letting Clerk throw its own error later.
if (__DEV__ && !key) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env");
}

export const clerkPublishableKey = key ?? "";
