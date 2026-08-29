import '../global.css';

import { ConvexBetterAuthProvider, type AuthClient } from '@convex-dev/better-auth/react';
import { useConvexAuth } from 'convex/react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PanelUIProvider } from 'panelui-native/provider';
import { useThemeMode } from 'panelui-native/theme';
import { Uniwind, useCSSVariable } from 'uniwind';

import { authClient } from '@/lib/auth-client';
import { convexClient } from '@/lib/convex-client';

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
          <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="onboarding" options={{ title: 'Your wallet' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="send" options={{ title: 'Send' }} />
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
