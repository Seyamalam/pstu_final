import { useState } from 'react';
import { Linking, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import { router } from 'expo-router';
import { useConvex, useQuery } from 'convex/react';
import { Button } from 'panelui-native/components/button';
import { QRCode } from 'panelui-native/components/qr-code';
import { Text } from 'panelui-native/primitives/text';

import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { api } from '@/lib/convex-api';
import { cameraRecoveryAction, isOffline } from '@/lib/auth-recovery-state';
import { SITE_URL } from '@/lib/config';
import { poishaToTakaInput } from '@/lib/format';
import { parsePaymentCode } from '@/lib/qr';

export default function ScanScreen() {
  const convex = useConvex();
  const mine = useQuery(api.qr.mine, {});
  const [permission, requestPermission] = useCameraPermissions();
  const network = Network.useNetworkState();
  const [mode, setMode] = useState<'scan' | 'mine'>('scan');
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scanned({ data }: BarcodeScanningResult) {
    if (locked) return;
    const code = parsePaymentCode(data, [SITE_URL]);
    if (!code) {
      setError('Invalid payment code.');
      return;
    }
    setLocked(true);
    setError(null);
    if (isOffline(network)) {
      setError("You're offline. Reconnect and scan again.");
      setLocked(false);
      return;
    }
    try {
      const resolved = await convex.query(api.qr.resolvePayee, {
        payload: code.payeePayload,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/send',
        params: {
          recipient: resolved.payee.handle,
          ...(code.amountPoisha ? { amount: poishaToTakaInput(code.amountPoisha) } : {}),
          ...(code.note ? { note: code.note } : {}),
        },
      });
    } catch {
      setError('Payment code unavailable.');
      setLocked(false);
    }
  }

  const recoveryAction = cameraRecoveryAction(permission);

  return (
    <Page title="Scan" safeTop>
      <View className="flex-row gap-2">
        <Button
          className="flex-1"
          variant={mode === 'scan' ? 'primary' : 'outline'}
          onPress={() => setMode('scan')}
        >
          Scan code
        </Button>
        <Button
          className="flex-1"
          variant={mode === 'mine' ? 'primary' : 'outline'}
          onPress={() => setMode('mine')}
        >
          My code
        </Button>
      </View>

      {mode === 'mine' ? (
        mine ? (
          <View className="items-center gap-3 rounded-2xl border border-border bg-card p-6">
            <QRCode value={mine.payload} size="lg" errorCorrection="M">
              <QRCode.Canvas />
              <QRCode.Caption>@{mine.payee.handle}</QRCode.Caption>
            </QRCode>
            <Button size="sm" variant="outline" onPress={() => router.push('/request-code' as never)}>
              Request QR
            </Button>
          </View>
        ) : (
          <MessageCard title="Loading code" />
        )
      ) : recoveryAction === 'checking' ? (
        <MessageCard title="Checking camera" />
      ) : recoveryAction === 'request' ? (
        <MessageCard title="Camera access" detail="Allow camera access to scan a payment code." />
      ) : recoveryAction === 'settings' ? (
        <MessageCard title="Camera access" detail="Enable camera access in Settings." />
      ) : (
        <View className="overflow-hidden rounded-2xl border border-border bg-card" style={{ aspectRatio: 0.82 }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={locked ? undefined : scanned}
          />
        </View>
      )}

      {mode === 'scan' && recoveryAction === 'request' ? (
        <Button fullWidth onPress={requestPermission}>Allow camera</Button>
      ) : null}
      {mode === 'scan' && recoveryAction === 'settings' ? (
        <Button fullWidth variant="outline" onPress={() => Linking.openSettings()}>
          Open Settings
        </Button>
      ) : null}
      {error ? (
        <View className="gap-2">
          <Text className="text-destructive">{error}</Text>
          <Button variant="outline" onPress={() => { setError(null); setLocked(false); }}>Scan again</Button>
        </View>
      ) : null}
    </Page>
  );
}
