# SheshHisab mobile

Expo SDK 57 client for the shared Convex wallet backend.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `EXPO_PUBLIC_CONVEX_URL` to the Convex deployment URL.
3. Set `EXPO_PUBLIC_SITE_URL` to the deployed Next.js origin that serves Better Auth.
4. Run `npm install` and `npm start`.

The Better Auth server must include `expo()` from `@better-auth/expo` and trust
`sheshhisab://`. Face ID requires a development build because its permission
string is native configuration.

## Checks

```sh
npm run typecheck
npm test
npx expo install --check
npm run export
```

