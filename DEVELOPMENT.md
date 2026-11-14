# Developing OpenLog

OpenLog uses Expo with an installed Android development build. Use that build for local work; Expo Go does not include the app’s native modules.

## Setup

Install Node.js, the pnpm version specified in `package.json`, Android Studio, and JDK 17. Start an Android emulator or connect a device with USB debugging enabled. Make sure that `adb` is on your `PATH`.

```bash
pnpm install
cp .env.example .env
pnpm android
```

The last command builds, installs, and launches the development app, then starts Metro. When several devices are connected, use `pnpm android:device` to select one.

The environment template contains `EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN`. Supply a project token to enable analytics, or leave it empty to disable them. Values prefixed with `EXPO_PUBLIC_` are included in the app; do not put secrets there.

## Daily work

Once the development app is installed:

```bash
pnpm start
```

For a USB-connected device, run `pnpm adb:reverse` first to connect port 8081 to Metro. JavaScript and TypeScript changes use Fast Refresh. After you change native dependencies, config plugins, permissions, `app.json`, or native code, rebuild with `pnpm android`.

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
| `pnpm eas:preview`    | Build a standalone Android APK with EAS           |
| `pnpm eas:prod`       | Build a production Android App Bundle with EAS    |

Use `start:clear` for stale Metro code and `android:clean` for stale native builds. For package changes, use `npx expo install` to match the project’s Expo SDK.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm exec biome check src scripts
pnpm expo:doctor
```

Check UI changes in light and dark themes. Validate native behavior on an Android device or emulator. Report anything that you cannot test.

## Android backups

Android Auto Backup stays on, but it must never carry private content off the device. The app owns the backup rules: `plugins/withAndroidBackupRules.js` writes the rule files during prebuild and sets them in the manifest. The rules include shared preferences only, without the encrypted `SecureStore` preferences. Because shared preferences are the only include, Android leaves the database, `media/`, and `drafts/` alone. Do not add an exclude for a domain that the rules do not include, because Android Lint fails the release build with `FullBackupContent`. The `expo-secure-store` plugin runs with `configureAndroidBackup: false`, so no other plugin can replace these rules silently.

## Releases

Android releases are published by GitHub Actions. Merge the version bump and changelog entry to `main`. Then push a matching tag, such as `v1.3.12`. The workflow builds on EAS and submits to Google Play. The full release rules are in [AGENTS.md](AGENTS.md#release).

EAS build profiles live in `eas.json`. For a manual build with `pnpm eas:prod`, verify the resolved release identifiers with `pnpm exec expo config --type public --json` first.
