// One-time native shell setup for the Android (Capacitor) build.
// Everything here is a no-op in a browser, so index.js can call it unconditionally.

import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { isNative } from "./nativeAuth";

export function initNativeShell() {
  if (!isNative()) return;

  // Lets CSS target the app without checking Capacitor at every call site.
  document.documentElement.classList.add("is-native");

  // Android's hardware back button otherwise closes the app from any screen.
  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });

  // Android 15+ forces edge-to-edge and ignores setBackgroundColor, which is why
  // the status bar showed a grey scrim over the navy. Draw under a transparent
  // bar instead and let the page supply the colour; index.css adds the inset.
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

  // SplashScreen.hide() is called by SplashGate once the animation is on screen.
}
