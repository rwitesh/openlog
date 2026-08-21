# Building Monolog (Android & iOS)

How to run the app in development, create installable builds, and handle signing.

## Quick reference

> Use **`npm run`** before script names (not `npm` alone).

| Goal | Command |
|------|---------|
| Daily development | `npm start` → Expo Go |
| Debug on Android device/emulator | `npm run android` |
| Install release APK via USB | `npm run android:install` |
| Build + install release APK | `npm run android:release` |
| Debug on iOS Simulator (Mac) | `npm run ios` |
| **Android APK** (cloud, signed by EAS) | `npm run build:apk` |
| **Android APK** (local, no EAS quota) | `npm run build:apk:local` |
| **Android AAB** (Play Store, cloud) | `npx eas-cli@latest build -p android --profile production` |
| **iOS** (cloud, device / TestFlight) | `npx eas-cli@latest build -p ios --profile production` |
| **iOS Simulator** (cloud) | `npx eas-cli@latest build -p ios --profile preview` |

---

## Minimum OS versions (2020+ phones)

Configured in **`app.json`** — applies to EAS and local builds after `prebuild`.

| Platform | Setting | Value | Meaning |
|----------|---------|-------|---------|
| Android | `expo-build-properties` → `minSdkVersion` | **29** | Android 10+ (typical on 2020 phones) |
| Android | `expo-build-properties` → `buildArchs` | **arm64-v8a** | 64-bit phones only (smaller APK) |
| iOS | `ios.deploymentTarget` | **15.0** | iPhone 6s and newer dropped; all 2020 iPhone models supported |

```json
// app.json (excerpt)
"ios": {
  "deploymentTarget": "15.0"
},
"plugins": [
  [
    "expo-build-properties",
    {
      "android": {
        "minSdkVersion": 29,
        "buildArchs": ["arm64-v8a"]
      }
    }
  ]
]
```

To support older devices, lower `minSdkVersion` (e.g. `24`) or add `"armeabi-v7a"` to `buildArchs`. For older iPhones, lower `deploymentTarget` (e.g. `"14.0"`).

---

## Development (no build needed)

```bash
npm start
```

Scan the QR code with **Expo Go** on your phone. Free and unlimited — good for everyday work.

Limitation: Expo Go cannot replace a full release build for store submission or some native-only distribution flows.

---

## EAS Build (cloud)

[EAS Build](https://docs.expo.dev/build/introduction/) compiles your app on Expo’s servers. You need a free [Expo account](https://expo.dev/signup).

### Setup (once)

```bash
npx eas-cli@latest login
```

`eas.json` is already configured in this repo.

### Android APK (install on any phone)

```bash
npm run build:apk
```

- Profile: `preview` → outputs an **`.apk`** (not Play Store `.aab`)
- First run: link the project and choose **Yes** to generate an Android keystore (EAS stores it)
- When finished: download from [expo.dev/builds](https://expo.dev/builds) or scan the QR code on your phone

### Android Play Store (AAB)

```bash
npx eas-cli@latest build --platform android --profile production
```

Outputs an **`.aab`** for Google Play. Requires a [Google Play Developer](https://play.google.com/console) account ($25 one-time).

### iOS (iPhone / TestFlight / App Store)

```bash
npx eas-cli@latest build --platform ios --profile production
```

Requires:

- A Mac is **not** required for the cloud build
- An [Apple Developer Program](https://developer.apple.com/programs) membership ($99/year)
- EAS will prompt for signing credentials (distribution certificate + provisioning profile) on first build

Install via TestFlight or the build page on [expo.dev/builds](https://expo.dev/builds).

### iOS Simulator (cloud)

For Simulator-only builds, add a simulator profile to `eas.json` (see [Expo docs](https://docs.expo.dev/build-reference/simulators/)), then:

```bash
npx eas-cli@latest build --platform ios --profile preview
```

### EAS pricing (free tier)

| | Free plan |
|--|-----------|
| Cost | $0/month |
| Builds | **15 Android + 15 iOS** per month |
| Queue | Low priority (may wait at peak times) |
| After quota | ~$1/Android build, ~$2/iOS build |

Expo SDK and Expo Go are free. Only **EAS cloud builds** count against this quota.

Check usage: [expo.dev/accounts/settings/billing](https://expo.dev/accounts/settings/billing)

---

## Local builds (no cloud quota)

### Android APK

**Prerequisites (Mac):**

- [Android Studio](https://developer.android.com/studio) installed
- Android SDK (usually `~/Library/Android/sdk`)

```bash
npm run build:apk:local
```

Builds for **arm64 phones only** (2020+), configured in `app.json`. Skips 32-bit ARM and x86 emulator libs (~35–45 MB APK).

Wider phone support (32-bit ARM):

```bash
APK_ARCH=armeabi-v7a,arm64-v8a npm run build:apk:local
```

**Output:**

```
android/app/build/outputs/apk/release/app-release.apk
dist/monolog-release.apk   ← copy for easy sharing
```

First run can take 15–30 minutes (Gradle, NDK, dependencies). Later runs are faster.

The script uses Java from Android Studio automatically when available:

```
/Applications/Android Studio.app/Contents/jbr/Contents/Home
```

### iOS (local, Mac only)

**Prerequisites:**

- Xcode from the Mac App Store
- Apple Developer account (for a real device; Simulator works without paid membership for basic debug)

```bash
npx expo prebuild --platform ios
npm run ios
```

For a **release archive** (App Store / TestFlight without EAS):

1. Open `ios/Monolog.xcworkspace` in Xcode
2. Select **Any iOS Device** or a connected device
3. **Product → Archive**
4. Distribute via Organizer → TestFlight or App Store Connect

See [Expo: local app production (iOS)](https://docs.expo.dev/submit/ios-manual/).

### EAS local build (uses your machine, still needs `eas login`)

Same signing setup as cloud, but compile runs locally — useful for debugging cloud failures:

```bash
npx eas-cli@latest build --platform android --profile preview --local
npx eas-cli@latest build --platform ios --profile production --local
```

---

## Signing

Every installable app must be **signed**. The signature must stay the **same** for all updates to the same store listing.

### Android

| Method | Signature | Play Store | Notes |
|--------|-----------|------------|-------|
| `build:apk:local` | Debug keystore | No | Fine for sideloading and testing |
| `build:apk` (EAS) | Release keystore | Yes | EAS creates and stores the key on first build |
| Local + your own keystore | Release | Yes | You must back up the `.keystore` file forever |

**EAS-managed signing (recommended):** On first `npm run build:apk`, choose **Generate new keystore**.

Download credentials later:

```bash
npx eas-cli@latest credentials -p android
```

**Your own upload keystore (advanced):**

```bash
keytool -genkey -v -keystore credentials/android-upload.keystore \
  -alias monolog-upload -keyalg RSA -keysize 2048 -validity 10000
```

Store passwords in `~/.gradle/gradle.properties` (never commit). Wire into `android/app/build.gradle` after `prebuild`. See [Expo: local Android production](https://docs.expo.dev/guides/local-app-production/).

> **Warning:** If you lose the upload keystore, you cannot publish updates to the same Play Store app.

### iOS

| Method | Signing | App Store |
|--------|---------|-----------|
| `npm run ios` (debug) | Development cert | No |
| EAS cloud build | Distribution cert + provisioning profile | Yes |
| Xcode Archive | Your Apple Developer certs | Yes |

EAS can generate and manage iOS credentials on first build. Download or inspect them with:

```bash
npx eas-cli@latest credentials -p ios
```

Apple requires an active **Apple Developer Program** membership for App Store and TestFlight distribution.

---

## Artifact formats

| Format | Platform | Use |
|--------|----------|-----|
| `.apk` | Android | Direct install on phones (sideload, internal testing) |
| `.aab` | Android | **Google Play Store** (required for new Play uploads) |
| `.ipa` | iOS | TestFlight, App Store, or ad-hoc device install |

---

## Troubleshooting

### `eas: command not found`

Use `npx eas-cli@latest` (scripts in `package.json` already do this).

### Local Android build: `JAVA_HOME` not set

Install Android Studio, or:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

### APK won’t install on Android

Enable **Install unknown apps** for the browser or file manager you use to open the APK.

### `android/` folder missing

It is gitignored and generated by `prebuild`. `build:apk:local` runs `expo prebuild` automatically.

---

## Related links

- [EAS Build setup](https://docs.expo.dev/build/setup/)
- [Android APK on EAS](https://docs.expo.dev/build-reference/apk/)
- [iOS builds on EAS](https://docs.expo.dev/build-reference/ios-builds/)
- [EAS pricing](https://expo.dev/pricing)
- [Local Android production](https://docs.expo.dev/guides/local-app-production/)
- [Submit to app stores](https://docs.expo.dev/deploy/submit-to-app-stores/)
