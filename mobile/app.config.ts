import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON?.trim();
  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  } as ExpoConfig;
};
