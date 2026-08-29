import { useMutation } from 'convex/react';
import * as Device from 'expo-device';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Item } from 'panelui-native/components/item';
import { Switch } from 'panelui-native/components/switch';
import { Text } from 'panelui-native/primitives/text';
import { useThemeMode } from 'panelui-native/theme';

import { Page } from '@/components/page';
import { authClient } from '@/lib/auth-client';
import {
  getBiometricPaymentsEnabled,
  setBiometricPaymentsEnabled,
} from '@/lib/biometrics';
import { api, type Id } from '@/lib/convex-api';
import {
  getNotificationEndpointId,
  registerNativeNotifications,
  setNotificationEndpointId,
} from '@/lib/notifications';

export default function SettingsScreen() {
  const { mode, toggleMode } = useThemeMode();
  const [biometrics, setBiometrics] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState(false);
  const [alertsBusy, setAlertsBusy] = useState(false);
  const [alertsMessage, setAlertsMessage] = useState<string | null>(null);
  const registerEndpoint = useMutation(api.notifications.registerEndpoint);
  const unregisterEndpoint = useMutation(api.notifications.unregisterEndpoint);

  useEffect(() => {
    getBiometricPaymentsEnabled().then(setBiometrics);
    getNotificationEndpointId().then((endpointId) => setAlerts(Boolean(endpointId)));
  }, []);

  async function toggleAlerts(enabled: boolean) {
    if (alertsBusy) return;
    setAlertsBusy(true);
    setAlertsMessage(null);
    try {
      if (enabled) {
        const registration = await registerNativeNotifications();
        if (registration.status !== 'granted') {
          setAlertsMessage(registration.message);
          return;
        }
        const endpoint = await registerEndpoint({
          platform: Platform.OS,
          endpoint: registration.token,
          deviceLabel: Device.modelName ?? `${Platform.OS} device`,
        });
        await setNotificationEndpointId(endpoint.id);
        setAlerts(true);
        return;
      }

      const endpointId = await getNotificationEndpointId();
      if (endpointId) {
        await unregisterEndpoint({
          endpointId: endpointId as Id<'notificationEndpoints'>,
        });
      }
      await setNotificationEndpointId(null);
      setAlerts(false);
    } catch {
      setAlertsMessage('Could not update payment alerts.');
    } finally {
      setAlertsBusy(false);
    }
  }

  async function toggleBiometrics(enabled: boolean) {
    setBiometricError(null);
    if (enabled) {
      const [hardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hardware || !enrolled) {
        setBiometricError('Set up device biometrics first.');
        return;
      }
    }
    await setBiometricPaymentsEnabled(enabled);
    setBiometrics(enabled);
  }

  async function signOut() {
    await authClient.signOut();
    router.replace('/sign-in');
  }

  return (
    <Page title="Settings" safeTop>
      <Card className="overflow-hidden">
        <Item>
          <Item.Content>
            <Item.Title>Dark mode</Item.Title>
            <Item.Description>{mode === 'dark' ? 'On' : 'Off'}</Item.Description>
          </Item.Content>
          <Item.Actions>
            <Switch value={mode === 'dark'} onValueChange={toggleMode} accessibilityLabel="Dark mode" />
          </Item.Actions>
        </Item>
        <View className="h-px bg-border" />
        <Item>
          <Item.Content>
            <Item.Title>Payment alerts</Item.Title>
            <Item.Description>{alertsMessage ?? (alerts ? 'On' : 'Off')}</Item.Description>
          </Item.Content>
          <Item.Actions>
            <Switch
              value={alerts}
              disabled={alertsBusy}
              onValueChange={toggleAlerts}
              accessibilityLabel="Payment alerts"
            />
          </Item.Actions>
        </Item>
        <View className="h-px bg-border" />
        <Item>
          <Item.Content>
            <Item.Title>Payment confirmation</Item.Title>
            <Item.Description>Face ID, fingerprint or device passcode</Item.Description>
          </Item.Content>
          <Item.Actions>
            <Switch
              value={biometrics}
              onValueChange={toggleBiometrics}
              accessibilityLabel="Payment confirmation"
            />
          </Item.Actions>
        </Item>
      </Card>
      {biometricError ? <Text className="text-destructive" size="sm">{biometricError}</Text> : null}

      <Button variant="outline" fullWidth onPress={() => router.push('/statements')}>
        Statements
      </Button>
      <Button variant="outline" fullWidth onPress={() => router.push('/scheduled-transfers' as never)}>
        Scheduled transfers
      </Button>
      <Button variant="outline" fullWidth onPress={() => router.push('/budgets' as never)}>
        Budgets
      </Button>
      <Button variant="outline" fullWidth onPress={() => router.push('/split-bills' as never)}>
        Split bills
      </Button>
      <Button variant="ghost" fullWidth onPress={signOut}>Sign out</Button>
    </Page>
  );
}
