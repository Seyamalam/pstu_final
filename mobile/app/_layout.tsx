import '../global.css';

import { ConvexBetterAuthProvider, type AuthClient } from '@convex-dev/better-auth/react';
import { useConvexAuth } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, ThemeProvider, type Href } from 'expo-router';
import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PanelUIProvider } from 'panelui-native/provider';
import { useThemeMode } from 'panelui-native/theme';
import { Uniwind, useCSSVariable } from 'uniwind';

import { authClient } from '@/lib/auth-client';
import { convexClient } from '@/lib/convex-client';
import { notificationRoute } from '@/lib/notification-route';
import '@/lib/notifications';

Uniwind.setTheme('grass');

function Navigation() {
  const { isAuthenticated } = useConvexAuth();
  const { mode } = useThemeMode();
  const [background, card, text, border, primary] = useCSSVariable([
    '--color-background',
    '--color-card',
    '--color-foreground',
    '--color-border',
    '--color-primary',
  ]) as (string | undefined)[];
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    dark: mode === 'dark',
    colors: {
      ...base.colors,
      ...(background ? { background } : null),
      ...(card ? { card } : null),
      ...(text ? { text } : null),
      ...(border ? { border } : null),
      ...(primary ? { primary, notification: primary } : null),
    },
  };

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      if (!isAuthenticated) return;
      const data = response.notification.request.content.data;
      router.push(notificationRoute(data) as Href);
      Notifications.clearLastNotificationResponse();
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) open(response);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [isAuthenticated]);

  return (
    <ThemeProvider value={theme}>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: card },
          contentStyle: { backgroundColor: background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="sign-in" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="sign-up" options={{ headerShown: false, animation: 'fade_from_bottom' }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="send" options={{ title: 'Send' }} />
          <Stack.Screen name="add-money" options={{ title: 'Add money' }} />
          <Stack.Screen name="withdraw" options={{ title: 'Withdraw' }} />
          <Stack.Screen name="create-organization" options={{ title: 'New organization' }} />
          <Stack.Screen name="organization-members" options={{ title: 'Members' }} />
          <Stack.Screen name="request-money" options={{ title: 'Request money' }} />
          <Stack.Screen name="request-code" options={{ title: 'Request QR' }} />
          <Stack.Screen name="request/[request-id]" options={{ title: 'Request' }} />
          <Stack.Screen name="scheduled-transfers" options={{ title: 'Scheduled' }} />
          <Stack.Screen name="schedule-transfer" options={{ title: 'Schedule transfer' }} />
          <Stack.Screen name="budgets" options={{ title: 'Budgets' }} />
          <Stack.Screen name="split-bills" options={{ title: 'Split bills' }} />
          <Stack.Screen name="create-split" options={{ title: 'New split' }} />
          <Stack.Screen name="split/[bill-id]" options={{ title: 'Split bill' }} />
          <Stack.Screen name="receipt/[public-id]" options={{ title: 'Receipt' }} />
          <Stack.Screen name="statements" options={{ title: 'Statements' }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PanelUIProvider>
        <ConvexBetterAuthProvider
          client={convexClient}
          // The provider's public type only lists its own plugins. The Expo
          // plugin augments transport and storage without changing this API.
          authClient={authClient as unknown as AuthClient}
        >
          <Navigation />
        </ConvexBetterAuthProvider>
      </PanelUIProvider>
    </SafeAreaProvider>
  );
}
