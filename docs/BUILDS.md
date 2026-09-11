# Native Development and Metro

OpenLog uses an installed native development build. Expo Go is not part of the development or release workflow.

## First run on Android

Prerequisites:

- Android Studio with an SDK and emulator, or a USB-connected Android device with USB debugging enabled
- JDK 17 (Android Studio's bundled JDK is suitable)
- `adb` available on `PATH`
- Project environment values copied from `.env.example` into `.env`

Install dependencies and build, install, and launch the debug app:

```bash
npm ci
npm run android
```

`npm run android` compiles the native debug app, installs it, starts Metro, and launches OpenLog. Use `npm run android:device` when more than one emulator/device is available and you want an interactive device choice.

## Daily development

After the native app has been installed once, JavaScript and TypeScript changes only need Metro:

```bash
npm start
```

Open the installed OpenLog development app if it does not launch automatically. Fast Refresh connects to Metro on port 8081.

Rebuild the native app with `npm run android` after changing any native dependency, Expo config plugin, permission, `app.json`, or Android native code.

## Commands

| Command | Purpose |
|---|---|
| `npm start` | Start Metro for the installed development client |
| `npm run start:clear` | Clear Metro's cache and start the development client server |
| `npm run android` | Build/install the Android debug app and start Metro |
| `npm run android:device` | Select a connected device, then build/install and start Metro |
| `npm run android:clean` | Clear native build caches, rebuild/install, and start Metro |
| `npm run android:metro` | Start Metro and request launch on the connected Android device |
| `npm run adb:devices` | List attached Android devices and authorization state |
| `npm run adb:reverse` | Forward device port 8081 to local Metro over USB |
| `npm run adb:logs` | Show React Native and Expo Android logs |
| `npm run eas:dev` | Build an installable Android development client with EAS |
| `npm run eas:prod` | Build the production Android App Bundle with EAS |

## Debugging

With Metro focused, press `j` to open React Native DevTools. Press `r` to reload the app.

For a physical Android device connected over USB:

```bash
npm run adb:devices
npm run adb:reverse
npm start
```

If the device is `unauthorized`, unlock it and accept the USB debugging prompt. If Metro behaves as though it has stale code, use `npm run start:clear`. If Java/Kotlin or native dependency compilation is stale, use `npm run android:clean`.

## EAS development builds

The `development` profile in `eas.json` has `developmentClient: true` and produces an internal APK:

```bash
npm run eas:dev
```

Install the APK from the EAS build page, then run `npm start` locally to serve the JavaScript bundle. A cloud-built client and local Metro must be on a reachable network; USB users can use `npm run adb:reverse`.

## Production builds

```bash
npm run eas:prod
```

This produces an Android App Bundle. Production builds do not connect to Metro.

## Verification before a build

```bash
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

Do not use `npx expo start --go` for this project. It bypasses OpenLog's native development client and cannot represent the app's native module behavior.
