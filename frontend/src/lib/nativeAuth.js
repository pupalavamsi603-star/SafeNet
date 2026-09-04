// Token storage for the Android (Capacitor) build.
//
// On the web, auth rides on httpOnly cookies and this module is inert. Inside the
// APK the WebView serves the app from https://localhost, so calls to the hosted API
// are cross-site and the cookies get dropped — there we keep the JWTs ourselves and
// send them as `Authorization: Bearer` / `X-Refresh-Token` instead. The backend
// hands them over only when the request carries `X-Client: mobile`.

const ACCESS_KEY = "safenet-access-token";
const REFRESH_KEY = "safenet-refresh-token";

export const isNative = () =>
  typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;

// localStorage can throw when storage is disabled or full; auth must not hard-fail.
const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const getAccessToken = () => safe(() => localStorage.getItem(ACCESS_KEY));
export const getRefreshToken = () => safe(() => localStorage.getItem(REFRESH_KEY));

export function saveTokens({ access_token, refresh_token } = {}) {
  safe(() => {
    if (access_token) localStorage.setItem(ACCESS_KEY, access_token);
    if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
  });
}

// Headers for calls made with raw fetch instead of the axios client (streaming
// chat). Empty object on the web, where cookies do the work.
export function nativeAuthHeaders() {
  if (!isNative()) return {};
  const access = getAccessToken();
  return { "X-Client": "mobile", ...(access ? { Authorization: `Bearer ${access}` } : {}) };
}

export function clearTokens() {
  safe(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  });
}
