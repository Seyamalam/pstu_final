import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { Card } from 'panelui-native/components/card';
import { Text } from 'panelui-native/primitives/text';

export function SuccessState({ title, detail }: { title: string; detail?: string }) {
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}>
      <Card className="border-primary/20">
        <Card.Header>
          <Text size="2xl" weight="bold">{title}</Text>
          {detail ? <Text muted>{detail}</Text> : null}
        </Card.Header>
      </Card>
    </Animated.View>
  );
}
