import { Image, View } from 'react-native';
import { Loader } from 'panelui-native/components/loader';
import { Skeleton } from 'panelui-native/components/skeleton';
import { Text } from 'panelui-native/primitives/text';
import { useThemeMode } from 'panelui-native/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  const { mode } = useThemeMode();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-background px-5"
      style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }}
    >
      <View className="mx-auto w-full max-w-2xl flex-1 justify-center gap-6">
        <View className="items-center gap-3">
          <Image
            source={
              mode === 'dark'
                ? require('../assets/logo-dark.png')
                : require('../assets/logo-light.png')
            }
            style={{ width: 52, height: 52 }}
            resizeMode="contain"
            accessibilityLabel="SheshHisab"
          />
          <Loader
            variant="pulse-dots"
            color="--color-primary"
            size="sm"
            speed={1.2}
            label={label}
          />
          <Text muted size="sm">{label}</Text>
        </View>
        <View className="gap-3" accessibilityElementsHidden>
          <Skeleton className="h-24 w-full rounded-2xl" />
          <View className="flex-row gap-3">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
          </View>
        </View>
      </View>
    </View>
  );
}
