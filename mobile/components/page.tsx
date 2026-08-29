import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'panelui-native/primitives/text';

export function Page({
  title,
  action,
  children,
  scroll = true,
}: PropsWithChildren<{ title?: string; action?: ReactNode; scroll?: boolean }>) {
  const insets = useSafeAreaInsets();
  const content = (
    <View
      className="w-full max-w-2xl self-center gap-5 px-5"
      style={{ paddingTop: title ? 20 : insets.top + 16, paddingBottom: insets.bottom + 28 }}
    >
      {title ? (
        <View className="flex-row items-center justify-between gap-3">
          <Text size="3xl" weight="bold">
            {title}
          </Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );

  if (!scroll) {
    return <View className="flex-1 bg-background">{content}</View>;
  }
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  );
}

