import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button } from 'panelui-native/components/button';
import { Input } from 'panelui-native/components/input';
import { Text } from 'panelui-native/primitives/text';

import { Page } from '@/components/page';
import { authClient } from '@/lib/auth-client';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    const result = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message || 'Account creation failed.');
      return;
    }
    router.replace('/');
  }

  return (
    <Page>
      <View className="gap-4">
        <Input placeholder="Name" value={name} onChangeText={setName} autoComplete="name" />
        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          secureTextEntry
          onSubmitEditing={submit}
        />
        {error ? <Text className="text-destructive" size="sm">{error}</Text> : null}
        <Button fullWidth loading={submitting} onPress={submit}>Create account</Button>
      </View>
    </Page>
  );
}

