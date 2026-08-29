import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react-native';
import { Button } from 'panelui-native/components/button';
import { Input } from 'panelui-native/components/input';
import { Text } from 'panelui-native/primitives/text';
import { useCSSVariable } from 'uniwind';

import { AuthShell } from '@/components/auth-shell';
import { authClient } from '@/lib/auth-client';

export default function SignInScreen() {
  const foreground = useCSSVariable('--color-muted-foreground') as string | undefined;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit() {
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must have at least 8 characters.');
      return;
    }
    setSubmitting(true);
    const result = await authClient.signIn.email({ email: normalizedEmail, password });
    setSubmitting(false);
    if (result.error) {
      setError('Email or password is incorrect.');
      return;
    }
    router.replace('/');
  }

  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title="Your money, ready when you are."
      footer={(
        <View className="flex-row items-center justify-center gap-1">
          <Text muted size="sm">New here?</Text>
          <Link href="/sign-up" asChild>
            <Button size="sm" variant="ghost">Create account</Button>
          </Link>
        </View>
      )}
    >
      <View className="gap-1">
        <Text size="2xl" weight="bold">Sign in</Text>
        <Text muted size="sm">Use your email and password.</Text>
      </View>
      <Input
        label="Email"
        size="lg"
        variant="filled"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        accessibilityLabel="Email"
        startContent={<Mail size={18} color={foreground} />}
        interactiveContent={false}
        disabled={submitting}
        avoidKeyboard
      />
      <Input
        label="Password"
        size="lg"
        variant="filled"
        autoComplete="current-password"
        placeholder="8+ characters"
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={setPassword}
        accessibilityLabel="Password"
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
        avoidKeyboard
      />
      <Link href={'/forgot-password' as never} asChild>
        <Button className="min-h-11 self-end" size="sm" variant="ghost">
          Forgot password?
        </Button>
      </Link>
      {error ? (
        <View className="rounded-xl bg-destructive/10 px-3 py-2.5">
          <Text className="text-destructive" size="sm">{error}</Text>
        </View>
      ) : null}
      <Button fullWidth size="lg" loading={submitting} onPress={submit}>Continue</Button>
    </AuthShell>
  );
}
