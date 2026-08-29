import { Redirect } from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';

import { LoadingState } from '@/components/loading-state';
import { api } from '@/lib/convex-api';

export default function Index() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.viewer.get, isAuthenticated ? {} : 'skip');

  if (isLoading || (isAuthenticated && viewer === undefined)) {
    return <LoadingState />;
  }
  if (!isAuthenticated) return <Redirect href="/sign-in" />;
  if (!viewer) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/home" />;
}

