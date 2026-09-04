// Native Google Sign-In for the Android build.
//
// The Google Identity Services *web* SDK cannot work inside the APK: the WebView's
// origin is https://localhost (Error 400: origin_mismatch), and Google deliberately
// refuses OAuth in embedded WebViews — the flow escapes to Chrome and the credential
// never comes back. Android has to use the platform account picker instead.
//
// The ID token is requested with the existing *web* client ID as the server client,
// so its `aud` is still REACT_APP_GOOGLE_CLIENT_ID and the backend's audience check
// in /api/auth/google passes unchanged.

import { isNative } from "./nativeAuth";

const WEB_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

let initPromise = null;

async function ensureInit() {
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  if (!initPromise) {
    initPromise = SocialLogin.initialize({
      google: { webClientId: WEB_CLIENT_ID },
    }).catch((e) => {
      initPromise = null; // let a later attempt retry
      throw e;
    });
  }
  await initPromise;
  return SocialLogin;
}

export const canUseNativeGoogle = () => isNative() && Boolean(WEB_CLIENT_ID);

/**
 * Opens the Android account picker and resolves the Google ID token, which is the
 * same `credential` string the web flow posts to /api/auth/google.
 */
export async function nativeGoogleSignIn() {
  const SocialLogin = await ensureInit();
  const res = await SocialLogin.login({ provider: "google", options: {} });
  const token =
    res?.result?.idToken ||
    res?.result?.credential?.idToken ||
    res?.idToken;
  if (!token) throw new Error("Google did not return an ID token");
  return token;
}
