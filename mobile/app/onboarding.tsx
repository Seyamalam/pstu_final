import { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from 'convex/react';
import { AtSign, Building2, QrCode, ReceiptText, UserRound } from 'lucide-react-native';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Input } from 'panelui-native/components/input';
import { Text } from 'panelui-native/primitives/text';
import { useThemeMode } from 'panelui-native/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';

import { api } from '@/lib/convex-api';

const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;

const benefits = [
  { icon: QrCode, title: 'Scan to pay', detail: 'No account number' },
  { icon: ReceiptText, title: 'Clear receipts', detail: 'Every payment' },
  { icon: Building2, title: 'Team wallets', detail: 'Roles and access' },
] as const;

export default function OnboardingScreen() {
  const ensureCurrent = useMutation(api.users.ensureCurrent);
  const { mode } = useThemeMode();
  const insets = useSafeAreaInsets();
  const muted = useCSSVariable('--color-muted-foreground') as string | undefined;
  const primary = useCSSVariable('--color-primary') as string | undefined;
  const [step, setStep] = useState<0 | 1>(0);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const normalizedName = displayName.trim().replace(/\s+/g, ' ');
    const normalizedHandle = handle.trim().replace(/^@/, '').toLowerCase();
    setError(null);
    if (normalizedName.length < 2 || normalizedName.length > 60) {
      setError('Name must have 2–60 characters.');
      return;
    }
    if (!HANDLE_PATTERN.test(normalizedHandle)) {
      setError('Handle must have 3–24 letters, numbers, or underscores.');
      return;
    }
    setSubmitting(true);
    try {
      await ensureCurrent({ displayName: normalizedName, handle: normalizedHandle });
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create wallet.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 20,
      }}
    >
      <View className="mx-auto w-full max-w-md flex-1 justify-between gap-8">
        <View className="gap-8">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Image
                source={
                  mode === 'dark'
                    ? require('../assets/logo-dark.png')
                    : require('../assets/logo-light.png')
                }
                style={{ width: 42, height: 42 }}
                resizeMode="contain"
                accessibilityLabel="SheshHisab"
              />
              <Text size="lg" weight="bold">SheshHisab</Text>
            </View>
            <Text muted size="xs">{step + 1} / 2</Text>
          </View>

          <View className="flex-row gap-2" accessibilityLabel={`Step ${step + 1} of 2`}>
            <View className="h-1.5 flex-1 rounded-full bg-primary" />
            <View className={`h-1.5 flex-1 rounded-full ${step === 1 ? 'bg-primary' : 'bg-muted'}`} />
          </View>

          {step === 0 ? (
            <View className="gap-6">
              <View className="gap-2">
                <Text size="3xl" weight="bold">Your wallet, minus the friction.</Text>
                <Text muted>Pay, collect and keep হিসাব in one place.</Text>
              </View>
              <View className="gap-3">
                {benefits.map(({ icon: Icon, title, detail }) => (
                  <Card key={title}>
                    <Card.Content className="flex-row items-center gap-4 p-4">
                      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                        <Icon size={21} color={primary} />
                      </View>
                      <View className="flex-1">
                        <Text weight="semibold">{title}</Text>
                        <Text muted size="sm">{detail}</Text>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            </View>
          ) : (
            <View className="gap-5">
              <View className="gap-2">
                <Text size="3xl" weight="bold">Name your wallet.</Text>
                <Text muted>Your handle is how people find you.</Text>
              </View>
              <Card>
                <Card.Content className="gap-4 p-5">
                  <Input
                    label="Display name"
                    size="lg"
                    variant="filled"
                    placeholder="Your name"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoComplete="name"
                    startContent={<UserRound size={18} color={muted} />}
                    interactiveContent={false}
                    disabled={submitting}
                  />
                  <Input
                    label="Handle"
                    description="Letters, numbers and underscore"
                    size="lg"
                    variant="filled"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="your_handle"
                    value={handle}
                    onChangeText={(value) => setHandle(value.toLowerCase())}
                    onSubmitEditing={submit}
                    startContent={<AtSign size={18} color={muted} />}
                    interactiveContent={false}
                    disabled={submitting}
                  />
                  {error ? (
                    <View className="rounded-xl bg-destructive/10 px-3 py-2.5">
                      <Text className="text-destructive" size="sm">{error}</Text>
                    </View>
                  ) : null}
                </Card.Content>
              </Card>
            </View>
          )}
        </View>

        <View className="gap-2">
          <Button
            fullWidth
            size="lg"
            loading={submitting}
            onPress={() => step === 0 ? setStep(1) : void submit()}
          >
            {step === 0 ? 'Continue' : 'Open wallet'}
          </Button>
          {step === 1 ? (
            <Button variant="ghost" fullWidth disabled={submitting} onPress={() => setStep(0)}>
              Back
            </Button>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
