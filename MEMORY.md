# Project environment

- Workspace: `/Users/seyam/Work/pstu_final`
- Web: `sheshhisab/`, Next.js 16.3.3, Bun 1.4, App Router.
- Backend: `sheshhisab/convex/`, shared by web and mobile, Better Auth.
- Mobile: `mobile/`, managed Expo SDK 57, React Native 0.86.3, npm, Expo Router, PanelUI and Uniwind.
- Mobile app ID: `com.sheshhisab.wallet` on Android and iOS.
- Mobile scheme: `sheshhisab`.
- Metro port: `8081`.
- Required mobile env: `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_SITE_URL`.
- Start Metro: `cd mobile && npm start`.
- Run Android: `cd mobile && npm run android` for Expo Go, or `npx expo run:android` for native capabilities.
- Android toolchain: `adb`, emulator, Android SDK, and Java 17 are available.
- No checked-in `android/` or `ios/` directories. Expo prebuild generates them.
- QA: Vitest for web/backend and mobile. No Detox, Maestro, or Playwright config.
- Web checks: `bun run lint && bun run typecheck && bun run test && bun run build` from `sheshhisab/`.
- Mobile checks: `npm run typecheck && npm test && npx expo install --check && npx expo-doctor` from `mobile/`.
- Native push and full biometric validation require a development build.
