import type { PropsWithChildren } from 'react';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

export function ContentHandoff({ children }: PropsWithChildren) {
  return (
    <Animated.View
      className="gap-5"
      entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
    >
      {children}
    </Animated.View>
  );
}
