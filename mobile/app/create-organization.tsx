import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useMutation } from 'convex/react';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Input } from 'panelui-native/components/input';
import { Text } from 'panelui-native/primitives/text';

import { Page } from '@/components/page';
import { api } from '@/lib/convex-api';

export default function CreateOrganizationScreen() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createOrganization = useMutation(api.wallets.createOrganization);
  const switchContext = useMutation(api.wallets.switchContext);
  const suggestedSlug = useMemo(
    () => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24),
    [name],
  );

  async function submit() {
    setError(null);
    const finalSlug = (slug || suggestedSlug).trim().replace(/^@/, '').toLowerCase();
    if (name.trim().length < 2) {
      setError('Enter an organization name.');
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9_]{1,22}[a-z0-9])$/.test(finalSlug)) {
      setError('Use 3–24 letters, numbers, or underscores.');
      return;
    }
    setSubmitting(true);
    try {
      const wallet = await createOrganization({ name: name.trim(), slug: finalSlug });
      await switchContext({ accountId: wallet.accountId });
      router.replace('/(tabs)/home');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create organization.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page>
      <Card>
        <Card.Content className="gap-4 pt-6">
          <Input
            value={name}
            onChangeText={setName}
            maxLength={60}
            placeholder="Organization name"
            accessibilityLabel="Organization name"
            disabled={submitting}
          />
          <Input
            value={slug}
            onChangeText={setSlug}
            maxLength={24}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={suggestedSlug || 'organization_handle'}
            accessibilityLabel="Organization handle"
            disabled={submitting}
          />
          <Text muted size="sm">Members can find this wallet by its handle.</Text>
        </Card.Content>
      </Card>
      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
      <Button disabled={submitting} fullWidth onPress={() => void submit()}>
        {submitting ? 'Creating' : 'Create organization'}
      </Button>
    </Page>
  );
}
