import { useEffect, useState } from 'react';
import { View } from 'react-native';
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

export default function SettingsScreen() {
  const { mode, toggleMode } = useThemeMode();
  const [biometrics, setBiometrics] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);

  useEffect(() => {
    getBiometricPaymentsEnabled().then(setBiometrics);
  }, []);

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
    <Page title="Settings">
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
      <Button variant="ghost" fullWidth onPress={signOut}>Sign out</Button>
    </Page>
  );
}
