# Developing OpenLog

OpenLog uses Expo with an installed Android development build. Use that build for local work; Expo Go does not include the app’s native modules.

## Setup

Install Node.js, the pnpm version specified in `package.json`, Android Studio, and JDK 17. Start an Android emulator or connect a device with USB debugging enabled, and ensure `adb` is on your `PATH`.

```bash
pnpm install
cp .env.example .env
pnpm android
```

The last command builds, installs, and launches the development app, then starts Metro. Use `pnpm android:device` to select a device when several are connected.

The environment template contains `EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN`. Supply a project token to enable analytics, or leave it empty to disable them. Values prefixed with `EXPO_PUBLIC_` are included in the app; do not put secrets there.

## Daily work

Once the development app is installed:

```bash
pnpm start
```

For a USB-connected device, run `pnpm adb:reverse` first to connect port 8081 to Metro. JavaScript and TypeScript changes use Fast Refresh. Rebuild with `pnpm android` after changing native dependencies, config plugins, permissions, `app.json`, or native code.

## Commands

| Command               | Purpose                                           |
| --------------------- | ------------------------------------------------- |
| `pnpm start`          | Start Metro for the installed development client  |
| `pnpm start:clear`    | Restart Metro with a cleared cache                |
| `pnpm android`        | Build, install, and launch locally                |
| `pnpm android:device` | Select a connected device, then build and launch  |
| `pnpm android:clean`  | Rebuild without native build caches               |
| `pnpm android:metro`  | Start Metro and open the installed app on Android |
| `pnpm adb:devices`    | List connected devices                            |
| `pnpm adb:reverse`    | Connect device port 8081 to local Metro over USB  |
| `pnpm adb:logs`       | Show React Native and Expo logs                   |
| `pnpm expo:doctor`    | Check Expo project health                         |
| `pnpm expo:fix`       | Align dependencies with the installed Expo SDK    |
| `pnpm lint:fix`       | Apply automatic lint fixes                        |
| `pnpm format`         | Format app source                                 |
| `pnpm format:check`   | Check app source formatting                       |
| `pnpm eas:dev`        | Build an Android development APK with EAS         |
| `pnpm eas:prod`       | Build a production Android App Bundle with EAS    |

Use `start:clear` for stale Metro code and `android:clean` for stale native builds. For package changes, use `npx expo install` to match the project’s Expo SDK.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm exec biome check src scripts
pnpm expo:doctor
```

Check UI changes in light and dark themes. Validate native behavior on an Android device or emulator and report anything that could not be tested.

## Production builds

EAS build profiles live in `eas.json`. Before using `pnpm eas:prod`, follow the release versioning and commit rules in [AGENTS.md](AGENTS.md). Verify the resolved release identifiers with `pnpm exec expo config --type public --json` before starting a production build.
