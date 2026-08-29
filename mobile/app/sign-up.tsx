import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react-native';
import { Button } from 'panelui-native/components/button';
import { Input } from 'panelui-native/components/input';
import { Text } from 'panelui-native/primitives/text';
import { useCSSVariable } from 'uniwind';

import { AuthShell } from '@/components/auth-shell';
import { authClient } from '@/lib/auth-client';

export default function SignUpScreen() {
  const foreground = useCSSVariable('--color-muted-foreground') as string | undefined;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit() {
    setError(null);
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedName.length < 2 || normalizedName.length > 60) {
      setError('Name must have 2–60 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError('Password must have 8–128 characters.');
      return;
    }
    setSubmitting(true);
    const result = await authClient.signUp.email({
      name: normalizedName,
      email: normalizedEmail,
      password,
    });
    setSubmitting(false);
    if (result.error) {
      setError(
        result.error.code === 'USER_ALREADY_EXISTS'
          ? 'An account already exists for this email.'
          : 'Could not create the account. Check your details.',
      );
      return;
    }
  }

  return (
    <AuthShell
      eyebrow="NEW WALLET"
      title="Start clean. Stay in control."
      footer={(
        <View className="flex-row items-center justify-center gap-1">
          <Text muted size="sm">Already registered?</Text>
          <Link href="/sign-in" asChild>
            <Button size="sm" variant="ghost">Sign in</Button>
          </Link>
        </View>
      )}
    >
      <View className="gap-1">
        <Text size="2xl" weight="bold">Create account</Text>
        <Text muted size="sm">Your wallet handle comes next.</Text>
      </View>
      <Input
        label="Name"
        size="lg"
        variant="filled"
        placeholder="Your name"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        startContent={<UserRound size={18} color={foreground} />}
        interactiveContent={false}
        disabled={submitting}
      />
      <Input
        label="Email"
        size="lg"
        variant="filled"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        startContent={<Mail size={18} color={foreground} />}
        interactiveContent={false}
        disabled={submitting}
      />
      <Input
        label="Password"
        size="lg"
        variant="filled"
        placeholder="8+ characters"
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        secureTextEntry={!showPassword}
        onSubmitEditing={submit}
        startContent={<LockKeyhole size={18} color={foreground} />}
        endContent={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            hitSlop={10}
            onPress={() => setShowPassword((value) => !value)}
          >
            {showPassword
              ? <EyeOff size={18} color={foreground} />
              : <Eye size={18} color={foreground} />}
          </Pressable>
        )}
        disabled={submitting}
      />
      {error ? (
        <View className="rounded-xl bg-destructive/10 px-3 py-2.5">
          <Text className="text-destructive" size="sm">{error}</Text>
        </View>
      ) : null}
      <Button fullWidth size="lg" loading={submitting} onPress={submit}>Create account</Button>
    </AuthShell>
  );
}
