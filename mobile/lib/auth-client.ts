import { expoClient } from '@better-auth/expo/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { APP_SCHEME, SITE_URL } from '@/lib/config';

export const authClient = createAuthClient({
  baseURL: SITE_URL,
  plugins: [
    convexClient(),
    expoClient({
      scheme: APP_SCHEME,
      storagePrefix: APP_SCHEME,
      storage: SecureStore,
    }),
  ],
});

