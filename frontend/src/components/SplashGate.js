import { useEffect, useState } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { isNative } from "../lib/nativeAuth";

// Animated launch screen for the APK.
//
// The app tree is deliberately NOT mounted while the logo animates. Mounting it
// concurrently put React, the router and the fonts on the main thread during the
// animation, which dropped frames and let the navbar's first layout pass (and the
// status-bar inset arriving) visibly shift on screen. Mounting during the hold
// phase instead means the animation owns the thread and the app settles behind an
// opaque splash, so the reveal is already stable.
const MOUNT_APP_AT = 1250;
const UNMOUNT_SPLASH_AT = 2400;

export function SplashGate({ children }) {
  const native = isNative();
  const [showApp, setShowApp] = useState(!native);
  const [showSplash, setShowSplash] = useState(native);

  useEffect(() => {
    if (!native) return;
    // Hand off from the native splash only once this one is painted.
    SplashScreen.hide().catch(() => {});

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      setShowApp(true);
      setShowSplash(false);
      return;
    }
    const mount = setTimeout(() => setShowApp(true), MOUNT_APP_AT);
    const clear = setTimeout(() => setShowSplash(false), UNMOUNT_SPLASH_AT);
    return () => {
      clearTimeout(mount);
      clearTimeout(clear);
    };
  }, [native]);

  return (
    <>
      {showSplash && <SplashOverlay />}
      {showApp && children}
    </>
  );
}

function SplashOverlay() {
  return (
    <div className="safenet-splash" role="presentation">
      <div className="safenet-splash__stage">
        <svg className="safenet-splash__mark" viewBox="0 0 100 100" aria-hidden="true">
          {/* Two mirrored halves drawn at once from the apex. A single continuous
              sweep read as a line wandering across the screen rather than a shield
              taking shape; symmetry makes it look assembled. */}
          <path
            className="safenet-splash__ring"
            d="M50 2 L96 17 V50 Q96 79 50 98"
            fill="none" stroke="#38BDF8" strokeWidth="3.4" strokeLinejoin="round"
            strokeLinecap="round" pathLength="1"
          />
          <path
            className="safenet-splash__ring"
            d="M50 2 L4 17 V50 Q4 79 50 98"
            fill="none" stroke="#38BDF8" strokeWidth="3.4" strokeLinejoin="round"
            strokeLinecap="round" pathLength="1"
          />
          <path
            className="safenet-splash__body"
            d="M50 19.7 L78.5 29 V49.5 Q78.5 67.5 50 79.3 Q21.5 67.5 21.5 49.5 V29 Z"
            fill="#38BDF8"
          />
          <path
            className="safenet-splash__check"
            d="M37.2 50.9 L46.8 59.5 L63.9 41.4"
            fill="none" stroke="#0B1120" strokeWidth="7.1"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
        <p className="safenet-splash__word">SafeNet</p>
      </div>
    </div>
  );
}
