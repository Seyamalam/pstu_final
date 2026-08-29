import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Input } from 'panelui-native/components/input';
import { Text } from 'panelui-native/primitives/text';
import { useThemeMode } from 'panelui-native/theme';

import { authClient } from '@/lib/auth-client';

export default function SignInScreen() {
  const { mode } = useThemeMode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    const result = await authClient.signIn.email({ email: email.trim(), password });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message || 'Sign in failed.');
      return;
    }
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 justify-center gap-7 px-5 py-12">
        <View className="gap-1">
          <Image
            source={
              mode === 'dark'
                ? require('../assets/logo-dark.png')
                : require('../assets/logo-light.png')
            }
            style={{ width: 72, height: 72, marginBottom: 8 }}
            resizeMode="contain"
            accessibilityLabel="SheshHisab"
          />
          <Text size="3xl" weight="bold">SheshHisab</Text>
        </View>
        <Card>
          <Card.Header>
            <Card.Title>Sign in</Card.Title>
          </Card.Header>
          <Card.Content className="gap-3">
            <Input
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              accessibilityLabel="Email"
            />
            <Input
              autoComplete="current-password"
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              accessibilityLabel="Password"
              onSubmitEditing={submit}
            />
            {error ? <Text className="text-destructive" size="sm">{error}</Text> : null}
            <Button fullWidth loading={submitting} onPress={submit}>Continue</Button>
          </Card.Content>
        </Card>
        <Link href="/sign-up" asChild>
          <Button variant="ghost">Create account</Button>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
