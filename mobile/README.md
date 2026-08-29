# SheshHisab mobile

Expo SDK 57 client for the shared Convex wallet backend.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `EXPO_PUBLIC_CONVEX_URL` to the Convex deployment URL.
3. Set `EXPO_PUBLIC_SITE_URL` to the deployed Next.js origin that serves Better Auth.
4. For Android push, set `GOOGLE_SERVICES_JSON` to the absolute path of the
   Firebase `google-services.json` file.
5. Run `npm install` and `npm start`.

The Better Auth server must include `expo()` from `@better-auth/expo` and trust
`sheshhisab://`. Face ID requires a development build because its permission
string is native configuration.

`npm run android` uses `scripts/run-android.sh`, which locates Java 17 and the
standard macOS Android SDK before running the native build. Rebuild after adding
the Firebase file so Android can register for remote notifications.

## Checks

```sh
npm run typecheck
npm test
npx expo install --check
npm run export
```
