# Post-Launch Analytics & Monitoring Guide

What you get after users start installing OpenLog, what's free, what needs code, and what it costs.

---

## TL;DR

| Question | Answer |
|---|---|
| Does Google give me usage data for free? | **Yes, two layers:** Google Play Console (zero code, install/crash basics) and Firebase Analytics (free, needs SDK wiring) |
| Active users, retention, engagement | Firebase Analytics (GA4) — free, unlimited users |
| Crash logs | Play Console & App Store Connect (free, zero code) or Crashlytics (free, richer) |
| Do I need to build anything? | No backend, no database. Events go straight from the app to Google |
| Cost | $0 up to ~1B events/month. Realistically $0 forever for an app this size |

---

## Layer 1: Zero code — store dashboards (available the day you ship)

These work the moment your app is live. Sign in, look at charts. Nothing to install.

### Google Play Console (Android) — console.cloud.google.com → Play Console

- **Installs / uninstalls** by device, country, Android version
- **Crashes & ANRs** (Vitals): stack traces, affected users, crash rate vs Android-wide average
- **Ratings & reviews**
- **Pre-launch report**: auto-runs your app on real devices and reports crashes/perf issues on every upload

### App Store Connect (iOS) — appstoreconnect.apple.com

- Downloads, sales, conversion funnel (impressions → downloads)
- **Crashes** (organized by cluster, with symbolicated traces)
- Ratings, reviews, retention estimates per app version

**This answers "how many people downloaded it and is it crashing" with no work.**
It does **not** answer "what do they do inside the app" — that's Layer 2.

---

## Layer 2: Firebase Analytics (GA4) — the actual answer to "active users & engagement"

Free, no event volume cap that will ever matter, no user cap. This is Google's product for exactly your question: DAU/MAU, retention curves, screen views, custom events, funnels, demographics (approximate), device/OS breakdown.

What you get out of the box (still zero custom events):

- `app_open`, `screen_view` (with React Navigation integration), `first_open`, session count/duration
- Active users (1/7/30-day), churn & retention cohorts
- Country, device model, OS version, app version distribution
- Realtime view (who's using the app *right now*)

Then you log your own events for the things that matter to a journaling app:

```
entry_created        (type: text | audio | photo)
audio_recorded       (duration_seconds)
photo_attached
search_performed
backup_triggered     (kind: manual | auto)
day_streak           — or compute streaks server-side later
```

> Log **counts and coarse metadata only**. Never send entry content, titles, or audio transcripts to analytics — it's a journaling app; treat payload privacy as a feature.

### Crashlytics (same Firebase project, free)

Real-time crash reporting with stack traces, breadcrumbs (last events before crash), and it's the industry default. Play Console crashes are the free fallback; Crashlytics is the upgrade. Sentry is the other good option (free tier: 5k errors/mo, also catches JS errors well).

---

## How to wire Firebase into this repo (Expo SDK 57)

OpenLog uses prebuild + EAS builds (`android/`, `ios/` committed), so use **React Native Firebase** — the JS-only Firebase SDK doesn't support Analytics on native. One-time setup:

1. **Create project** at console.firebase.google.com (one project for both platforms).
2. **Register an Android app** using the `android.package` value from `app.json`, and an iOS app using the bundle ID.
3. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) into the repo root.
4. Install + enable the config plugin:

   ```bash
   npm install @react-native-firebase/app @react-native-firebase/analytics
   ```

   ```json
   // app.json → expo.plugins
   "plugins": ["@react-native-firebase/app"]
   ```

5. Rebuild native (config changes require a new binary — OTA updates can't add the native module):

   ```bash
   npx expo prebuild --clean
   eas build --profile production --platform all
   ```

6. Log events where things happen:

   ```ts
   import analytics from '@react-native-firebase/analytics';

   await analytics().logEvent('entry_created', { type: 'audio', duration_seconds: 42 });
   ```

7. **Debugging**: Firebase Analytics has ~1hr batching and buffers events. Enable debug view via `adb shell setprop debug.firebase.analytics.app com.your.package` and watch the DebugView in the console.

### Screen-view tracking

With React Navigation, wrap your navigator once:

```ts
import analytics from '@react-native-firebase/analytics';

navigationRef.addListener('state', () => {
  const route = navigationRef.getCurrentRoute();
  if (route) analytics().logScreenView({ screen_name: route.name, screen_class: route.name });
});
```

---

## Layer 3 (optional, paid): EAS Observe — Expo's own metrics

Expo's `expo-observe` gives launch times, TTR/TTI, per-route performance, and error reporting — performance-focused rather than product analytics. Useful if you care about *how fast* the app feels, not *what users do*. Paid EAS service; check current pricing at expo.dev/pricing. Skip until Layer 2 tells you growth justifies it.

---

## What you must NOT skip (compliance, 30 minutes)

Analytics flips your store data-disclosure forms — do this before the release with Firebase enabled, not after:

1. **Play Console → Data safety form**: declare you collect *App activity (app interactions)* and *App info & performance (crash logs, diagnostics)*. Firebase Analytics without ads is "first-party analytics" — fine for most declarations.
2. **App Store Connect → App Privacy labels**: same categories.
3. **EU users (DMA)**: Google requires a consent banner for Analytics in the EEA for new apps. In Firebase console → Analytics → set audience location handling / link a consent management platform if you ship to EU.
4. Firebase Analytics does **not** require Apple's App Tracking Transparency prompt (no cross-app tracking), so iOS users won't see an extra popup.

---

## Rollout order (lazy path)

1. **Ship with nothing** — store dashboards already answer downloads + crashes.
2. **Before first public release**: wire Firebase Analytics + Crashlytics (one EAS build, ~an hour). Update the two privacy forms same day.
3. Log only the ~6 events listed above. Add more only when a product decision needs a number you can't see.
4. EAS Observe / Sentry JS layer — only when scale or slow-launch complaints justify it.

Skipped: A/B testing, funnels config, Amplitude/Mixpanel/PostHog comparison, server-side analytics — add when DAU makes manual decisions expensive.
