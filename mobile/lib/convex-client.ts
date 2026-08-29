import { ConvexReactClient } from 'convex/react';

import { CONVEX_URL } from '@/lib/config';

export const convexClient = new ConvexReactClient(CONVEX_URL, {
  unsavedChangesWarning: false,
});

