import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from 'convex/react';
import { Button } from 'panelui-native/components/button';
import { Input } from 'panelui-native/components/input';
import { Text } from 'panelui-native/primitives/text';

import { Page } from '@/components/page';
import { api } from '@/lib/convex-api';

export default function OnboardingScreen() {
  const ensureCurrent = useMutation(api.users.ensureCurrent);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await ensureCurrent({ displayName, handle });
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create wallet.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page>
      <View className="gap-4">
        <Input placeholder="Display name" value={displayName} onChangeText={setDisplayName} />
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Handle"
          value={handle}
          onChangeText={(value) => setHandle(value.toLowerCase())}
          onSubmitEditing={submit}
        />
        <Text muted size="sm">Letters, numbers and underscore.</Text>
        {error ? <Text className="text-destructive" size="sm">{error}</Text> : null}
        <Button fullWidth loading={submitting} onPress={submit}>Open wallet</Button>
      </View>
    </Page>
  );
}

