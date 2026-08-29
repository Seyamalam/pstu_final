import { View } from 'react-native';
import { Button } from 'panelui-native/components/button';
import { Text } from 'panelui-native/primitives/text';

export type RecipientShortcut = {
  id: string;
  handle: string;
  displayName: string;
};

function uniqueRecipients(recipients: readonly RecipientShortcut[]) {
  const seen = new Set<string>();
  return recipients.filter((recipient) => {
    if (seen.has(recipient.handle)) return false;
    seen.add(recipient.handle);
    return true;
  });
}

export function RecipientShortcuts({
  favorites,
  recent,
  onSelect,
}: {
  favorites: readonly RecipientShortcut[];
  recent: readonly RecipientShortcut[];
  onSelect: (recipient: RecipientShortcut) => void;
}) {
  const favoriteHandles = new Set(favorites.map((recipient) => recipient.handle));
  const remainingRecent = uniqueRecipients(recent)
    .filter((recipient) => !favoriteHandles.has(recipient.handle))
    .slice(0, 4);
  if (!favorites.length && !remainingRecent.length) return null;

  return (
    <View className="gap-3">
      {favorites.length ? (
        <View className="gap-2">
          <Text size="sm" weight="semibold">Favorites</Text>
          <View className="flex-row flex-wrap gap-2">
            {favorites.slice(0, 6).map((recipient) => (
              <Button
                key={recipient.id}
                size="sm"
                variant="outline"
                className="min-h-12"
                onPress={() => onSelect(recipient)}
              >
                {recipient.displayName}
              </Button>
            ))}
          </View>
        </View>
      ) : null}
      {remainingRecent.length ? (
        <View className="gap-2">
          <Text size="sm" weight="semibold">Recent</Text>
          <View className="flex-row flex-wrap gap-2">
            {remainingRecent.map((recipient) => (
              <Button
                key={recipient.id}
                size="sm"
                variant="ghost"
                className="min-h-12"
                onPress={() => onSelect(recipient)}
              >
                {recipient.displayName}
              </Button>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
