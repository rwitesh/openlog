# OpenLog Build & Execution Guide

Practical, command-focused guide for local testing, unlimited builds, EAS cloud releases, and unified Expo fingerprinting.

---

## 1. Quick Command Cheat Sheet

| What you want to do | Command | Notes |
|---|---|---|
| **Daily live dev (Expo Go)** | `npm start` | Fast, free, live reload |
| **Native live dev on emulator/device** | `npm run android` | Runs dev build on connected device |
| **Build & install APK to phone directly** | `npm run android:release` | **One-step**: builds locally & pushes via ADB |
| **Build APK locally only** | `npm run build:apk:local` | Unlimited, free, saves to `dist/openlog-release.apk` |
| **Push already built APK to phone** | `npm run android:install` | Runs `adb install -r` |
| **Check native fingerprint hash** | `npm run fingerprint` | Shows current native layer hash |
| **EAS local build** | `npm run eas:local` | Uses your machine with EAS pipeline |
| **EAS cloud development APK** | `npm run eas:dev` | Signed APK built in EAS cloud |
| **EAS cloud production AAB** | `npm run eas:prod` | Google Play ready App Bundle |
| **Typecheck project** | `npm run typecheck` | Validates TypeScript across all files |
| **Lint & Format** | `npm run lint:fix` | Biome autofix for styles & lints |

---

## 2. Unified Fingerprint (Local & Cloud)

OpenLog uses the standard Expo fingerprint policy in `app.json`:
```json
"runtimeVersion": {
  "policy": "fingerprint"
}
```

### How it works:
- **Same Fingerprint Everywhere**: Expo calculates the **exact same deterministic hash** on your local machine and on EAS cloud.
- **Automatic Sync**: 
  - When you change native code (Android configs, permissions, native npm modules), the fingerprint hash automatically updates.
  - When you only change JS/UI code, the fingerprint remains identical.
- **View current hash**:
  ```bash
  npm run fingerprint
  ```

---

## 3. Local Testing & Unlimited Free Builds

No EAS cloud credits or build queues are used. Build as many times as you want.

### Workflow A: One-Shot Build + Direct ADB Push (Recommended)
Connect phone via USB (with USB Debugging enabled) or start an Android Emulator, then run:
```bash
npm run android:release
```
*Compiles the release APK and immediately installs/updates it on your device.*

### Workflow B: Build APK Only
```bash
npm run build:apk:local
```
*Outputs to `dist/openlog-release.apk` for manual sharing or sideloading.*

### Workflow C: Push Existing APK via ADB
```bash
npm run android:install
```

### Workflow D: EAS Local Build Pipeline
```bash
npm run eas:local
```

---

## 4. EAS Cloud Builds

Requires logging into your Expo account once:
```bash
npx eas-cli@latest login
```

### Build Development APK (Cloud)
```bash
npm run eas:dev
```
*Download link and QR code will appear in terminal once built.*

### Build Play Store Production AAB (Cloud)
```bash
npm run eas:prod
```

### Publish Over-The-Air (OTA) Update
Publishes an instant JS update matching the current fingerprint:
```bash
npx eas-cli@latest update --branch development --message "Your update description"
```

---

## 5. Development & Code Quality

```bash
# Start Metro bundler for Expo Go
npm start

# Type checking
npm run typecheck

# Linting and formatting
npm run lint
npm run lint:fix
npm run format
```

---

## 6. Quick Troubleshooting

- **Device not found with ADB**:
  ```bash
  adb devices
  ```
  Ensure USB debugging is enabled and your device is listed as `device` (not `unauthorized`).

- **Android environment variables**:
  ```bash
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  ```

