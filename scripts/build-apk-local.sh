#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${JAVA_HOME:-}" && -d "/opt/homebrew/opt/openjdk@17" ]]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
elif [[ -z "${JAVA_HOME:-}" && -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]]; then
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
fi

if [[ -z "${ANDROID_HOME:-}" && -d "${HOME}/Library/Android/sdk" ]]; then
  export ANDROID_HOME="${HOME}/Library/Android/sdk"
fi

# adb lives in platform-tools, not on PATH by default
export PATH="${ANDROID_HOME:-${HOME}/Library/Android/sdk}/platform-tools:${PATH}"

if [[ -z "${JAVA_HOME:-}" ]]; then
  echo "JAVA_HOME is not set. Install Android Studio or export JAVA_HOME." >&2
  exit 1
fi

if [[ -z "${ANDROID_HOME:-}" ]]; then
  echo "ANDROID_HOME is not set. Install the Android SDK or export ANDROID_HOME." >&2
  exit 1
fi

echo "Using JAVA_HOME=$JAVA_HOME"
echo "Using ANDROID_HOME=$ANDROID_HOME"

echo "Building dev APK"

# Exported so Metro inlines EXPO_PUBLIC_* into the bundle
set -a
[[ -f ".env" ]] && source ".env"
set +a

export NODE_ENV=production

# Phone ABIs only — arm64 for 2020+ devices (see app.json expo-build-properties).
# Override: APK_ARCH=armeabi-v7a,arm64-v8a npm run build:apk:local
ARCHS="${APK_ARCH:-arm64-v8a}"

npx expo prebuild --platform android --clean --no-install

ANDROID_DIR="$ROOT/android"
GRADLE_PROPS="$ANDROID_DIR/gradle.properties"

if grep -q '^reactNativeArchitectures=' "$GRADLE_PROPS"; then
  sed -i '' "s/^reactNativeArchitectures=.*/reactNativeArchitectures=${ARCHS}/" "$GRADLE_PROPS"
else
  echo "reactNativeArchitectures=${ARCHS}" >> "$GRADLE_PROPS"
fi

echo "Building for: $ARCHS"

cd "$ANDROID_DIR"
./gradlew assembleRelease

APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
DIST="$ROOT/dist"
DIST_APK="$DIST/openlog-dev.apk"

if [[ -f "$APK" ]]; then
  mkdir -p "$DIST"
  cp "$APK" "$DIST_APK"
  SIZE="$(du -h "$DIST_APK" | cut -f1)"
  echo ""
  echo "APK ready ($SIZE):"
  echo "  $APK"
  echo "  $DIST_APK"
  if adb get-state &>/dev/null; then
    adb install -r "$DIST_APK"
  else
    echo "No device connected — install manually: adb install -r $DIST_APK"
  fi
else
  echo "Build finished but APK not found at $APK" >&2
  exit 1
fi
