import { ActivityIndicator, View } from 'react-native';
import { Text } from 'panelui-native/primitives/text';
import { useCSSVariable } from 'uniwind';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  const primary = useCSSVariable('--color-primary') as string | undefined;
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
      <ActivityIndicator color={primary} />
      <Text muted size="sm">
        {label}
      </Text>
    </View>
  );
}

