const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const siteUrl = process.env.EXPO_PUBLIC_SITE_URL;

function requireHttpsUrl(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error(`${name} must use HTTPS.`);
  }
  return url.origin;
}

export const CONVEX_URL = requireHttpsUrl(convexUrl, 'EXPO_PUBLIC_CONVEX_URL');
export const SITE_URL = requireHttpsUrl(siteUrl, 'EXPO_PUBLIC_SITE_URL');
export const APP_SCHEME = 'sheshhisab';

