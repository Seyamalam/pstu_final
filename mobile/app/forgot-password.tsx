import * as Network from 'expo-network';
import { Link, router } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from 'panelui-native/components/button';
import { Input } from 'panelui-native/components/input';
import { Text } from 'panelui-native/primitives/text';
import { useCSSVariable } from 'uniwind';

import { AuthShell } from '@/components/auth-shell';
import { authClient } from '@/lib/auth-client';
import {
  PASSWORD_RESET_SENT_COPY,
  isOffline,
  normalizeRecoveryEmail,
} from '@/lib/auth-recovery-state';
import { SITE_URL } from '@/lib/config';

export default function ForgotPasswordScreen() {
  const foreground = useCSSVariable('--color-muted-foreground') as string | undefined;
  const network = Network.useNetworkState();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (submitting) return;
    const normalizedEmail = normalizeRecoveryEmail(email);
    if (!normalizedEmail) {
      setError('Enter a valid email address.');
      return;
    }
    if (isOffline(network)) {
      setError("You're offline. Reconnect and try again.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const result = await authClient.requestPasswordReset({
        email: normalizedEmail,
        redirectTo: `${SITE_URL}/reset-password`,
      });
      if (result.error) {
        setError('Password reset is unavailable right now.');
        return;
      }
      setSent(true);
    } catch {
      setError('Password reset is unavailable right now.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="ACCOUNT ACCESS"
      title="Reset your password."
      footer={(
        <Link href="/sign-in" asChild>
          <Button size="sm" variant="ghost">Back to sign in</Button>
        </Link>
      )}
    >
      {sent ? (
        <View className="gap-5">
          <View className="gap-1">
            <Text size="2xl" weight="bold">Check your email</Text>
            <Text muted size="sm">{PASSWORD_RESET_SENT_COPY}</Text>
          </View>
          <Button fullWidth size="lg" onPress={() => router.replace('/sign-in')}>
            Sign in
          </Button>
        </View>
      ) : (
        <>
          <View className="gap-1">
            <Text size="2xl" weight="bold">Reset password</Text>
            <Text muted size="sm">Enter your account email.</Text>
          </View>
          <Input
            label="Email"
            size="lg"
            variant="filled"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="send"
            placeholder="you@example.com"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
            }}
            onSubmitEditing={submit}
            accessibilityLabel="Email"
            startContent={<Mail size={18} color={foreground} />}
            interactiveContent={false}
            disabled={submitting}
            avoidKeyboard
          />
          {error ? (
            <View className="rounded-xl bg-destructive/10 px-3 py-2.5">
              <Text className="text-destructive" size="sm">{error}</Text>
            </View>
          ) : null}
          <Button fullWidth size="lg" loading={submitting} onPress={submit}>
            Send reset link
          </Button>
        </>
      )}
    </AuthShell>
  );
}
