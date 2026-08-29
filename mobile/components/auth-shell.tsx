import type { PropsWithChildren, ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { Card } from 'panelui-native/components/card';
import { Text } from 'panelui-native/primitives/text';
import { useThemeMode } from 'panelui-native/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function AuthShell({
  eyebrow,
  title,
  children,
  footer,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  footer?: ReactNode;
}>) {
  const { mode } = useThemeMode();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 20,
        }}
      >
        <View className="mx-auto w-full max-w-md gap-5">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card">
              <Image
                source={
                  mode === 'dark'
                    ? require('../assets/logo-dark.png')
                    : require('../assets/logo-light.png')
                }
                style={{ width: 38, height: 38 }}
                resizeMode="contain"
                accessibilityLabel="SheshHisab"
              />
            </View>
            <View className="flex-1">
              <Text size="lg" weight="bold">SheshHisab</Text>
              <Text muted size="xs">Personal · Organization</Text>
            </View>
            <View className="rounded-full bg-muted px-3 py-1.5">
              <Text size="xs" weight="semibold">BDT</Text>
            </View>
          </View>

          <View className="overflow-hidden rounded-3xl bg-primary px-5 py-6">
            <View className="absolute -right-5 -top-8 h-28 w-28 rounded-full border border-primary-foreground/15" />
            <View className="absolute -bottom-12 right-10 h-24 w-24 rounded-full border border-primary-foreground/10" />
            <Text size="xs" weight="semibold" className="text-primary-foreground/70">
              {eyebrow}
            </Text>
            <Text size="3xl" weight="bold" className="mt-2 max-w-[280px] text-primary-foreground">
              {title}
            </Text>
            <View className="mt-5 flex-row flex-wrap gap-2">
              {['Pay by QR', 'Instant receipt', 'Team wallets'].map((label) => (
                <View
                  key={label}
                  className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5"
                >
                  <Text size="xs" weight="medium" className="text-primary-foreground">
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <Card>
            <Card.Content className="gap-4 p-5">{children}</Card.Content>
          </Card>
          {footer}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
