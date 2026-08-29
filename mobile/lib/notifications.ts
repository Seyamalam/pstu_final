import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ENDPOINT_ID_KEY = 'notification_endpoint_id_v1';

export type NotificationRegistration =
  | { status: 'granted'; token: string }
  | { status: 'denied' | 'unavailable'; message: string };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function configureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('wallet', {
    name: 'Wallet activity',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
  });
}

function projectId() {
  return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
}

export async function notificationPermission() {
  const permission = await Notifications.getPermissionsAsync();
  return permission.status;
}

export async function registerNativeNotifications(): Promise<NotificationRegistration> {
  await configureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') {
    return { status: 'denied', message: 'Notifications are off in device settings.' };
  }

  const easProjectId = projectId();
  if (!easProjectId) {
    return { status: 'unavailable', message: 'Push setup is not available in this build.' };
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId: easProjectId });
    return { status: 'granted', token: token.data };
  } catch {
    return {
      status: 'unavailable',
      message: 'Push setup needs an FCM-enabled development build.',
    };
  }
}

export async function getNotificationEndpointId() {
  return await SecureStore.getItemAsync(ENDPOINT_ID_KEY);
}

export async function setNotificationEndpointId(endpointId: string | null) {
  if (endpointId) {
    await SecureStore.setItemAsync(ENDPOINT_ID_KEY, endpointId, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return;
  }
  await SecureStore.deleteItemAsync(ENDPOINT_ID_KEY);
}
