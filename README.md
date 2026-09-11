# OpenLog

A private personal timeline for your life, on iOS and Android.

## What it is

OpenLog is one quiet place for everything on your mind: notes, moments, plans, goals, to-dos, photos, and voice notes. You capture it in a distraction-free composer, and it joins a living, day-by-day timeline you can search and revisit anytime.

## What it believes

Your attention is the scarcest thing you own, so OpenLog spends it carefully. There are no streaks, no badges, no notification guilt, and no algorithmic feed. Writing about your life should feel like thinking, not performing.

Your timeline belongs to you. It stays on your device, works offline, is gated by your biometrics, and can be exported or backed up whenever you want. It is never shared, never sold, and never used for telemetry.

## Start developing

OpenLog uses an installed Expo development build. Expo Go is not part of the development or release workflow.

For Android, install Android Studio (or connect a USB-debuggable Android device), use JDK 17, ensure `adb` is on your `PATH`, and copy `.env.example` to `.env` with the required values.

```bash
pnpm install
pnpm android
```

This builds, installs, and launches the Android development app, then starts Metro. If more than one device is connected, use `pnpm android:device` to choose one.

After the development app is installed, start daily JavaScript/TypeScript work with:

```bash
pnpm start
```

Rebuild with `pnpm android` whenever you change a native dependency, Expo config plugin, permission, `app.json`, or Android native code. Otherwise, Fast Refresh connects the installed app to Metro on port 8081.

## Development commands

| Command | Purpose |
|---|---|
| `pnpm start` | Start Metro for the installed development client |
| `pnpm start:clear` | Clear Metro’s cache and start the development client |
| `pnpm android` | Build, install, and launch the Android development app |
| `pnpm android:device` | Select a connected Android device, then build and launch |
| `pnpm android:clean` | Clear native build caches, then rebuild and launch |
| `pnpm android:metro` | Start Metro and launch on the connected Android device |
| `pnpm adb:devices` | List connected Android devices |
| `pnpm adb:reverse` | Forward device port 8081 to local Metro over USB |
| `pnpm adb:logs` | Show React Native and Expo Android logs |
| `pnpm eas:dev` | Build an installable Android development client with EAS |
| `pnpm eas:prod` | Build the production Android App Bundle with EAS |

For a USB-connected physical device, run `pnpm adb:reverse` before `pnpm start`. If Metro has stale code, use `pnpm start:clear`; if native Java/Kotlin changes are stale, use `pnpm android:clean`.

## Verify before a build

```bash
pnpm test
pnpm typecheck
pnpm exec biome check src scripts
pnpm dlx expo-doctor
```

Do not run `npx expo start --go`; it bypasses the native development client and cannot represent OpenLog’s native module behavior.

## License

© Rwitesh Bera. All rights reserved.

*This document reflects OpenLog as it is today and is subject to change as the product's needs and goals evolve.*
