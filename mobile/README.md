# SheshHisab mobile

Expo SDK 57 client for the shared Convex wallet backend.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `EXPO_PUBLIC_CONVEX_URL` to the Convex deployment URL.
3. Set `EXPO_PUBLIC_SITE_URL` to the deployed Next.js origin that serves Better Auth.
4. Confirm `google-services.json` is present for Android push registration.
5. Run `bun install` and `bun start`.

The Better Auth server must include `expo()` from `@better-auth/expo` and trust
`sheshhisab://`. Face ID requires a development build because its permission
string is native configuration.

`bun run android` uses `scripts/run-android.sh`, which locates Java 17 and the
standard macOS Android SDK before running the native build. Rebuild after adding
the Firebase file so Android can register for remote notifications.

## Checks

```sh
bun run typecheck
bun run test
bunx expo-doctor
bunx expo install --check
bun run export
```

## Local release APK

Production uses the release keystore stored in EAS credentials, but the complete
build runs on the local machine:

```sh
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
ANDROID_HOME="$HOME/Library/Android/sdk" \
bunx eas-cli@latest build \
  --platform android \
  --profile production \
  --local \
  --non-interactive \
  --output /tmp/SheshHisab-v1.0.0.apk
```

The production profile explicitly uses Android's APK build type. No GitHub
Actions workflow is required.
