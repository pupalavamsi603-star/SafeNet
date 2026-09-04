# 📱 SafeNet Android App

The Android app is the same React frontend, packaged with [Capacitor](https://capacitorjs.com)
and pointed at the hosted FastAPI backend. There is no second codebase — every page, the
AI chat, the quiz and the admin dashboard are the ones in `frontend/src`.

## Build the APK

```bash
cd frontend
yarn apk
```

That runs three steps: web build → `cap sync android` → `gradlew assembleRelease`, and drops
the signed APK at `frontend/dist-apk/SafeNet-release.apk`.

| Command | Result |
|---|---|
| `yarn apk` | Signed release APK, using the URL in `frontend/.env.mobile` |
| `yarn apk https://api.example.com` | Same, with a one-off backend URL |
| `yarn apk --debug` | Unsigned debug APK (`SafeNet-debug.apk`) |

### The backend URL is baked in at build time

`REACT_APP_BACKEND_URL` is compiled into the JS bundle, so **changing the backend means
rebuilding the APK**. It lives in `frontend/.env.mobile`:

```
REACT_APP_BACKEND_URL=https://your-backend.onrender.com
```

It must be `https://` — Android blocks cleartext HTTP by default, and the build script
refuses to produce an APK that would silently fail on every request.

## How auth works on mobile

The web app authenticates with httpOnly cookies. That does not survive the trip from a
Capacitor WebView: the app is served from `https://localhost` inside the APK, so every call
to your backend is cross-site and Android drops the cookies.

So the app uses bearer tokens on Android instead:

1. The client sends `X-Client: mobile` on auth requests (`frontend/src/lib/api.js`).
2. The backend sees that header and *additionally* returns `access_token` / `refresh_token`
   in the JSON body (`issue_auth()` in `backend/server.py`).
3. The app stores them and sends `Authorization: Bearer …` on every subsequent request;
   refresh goes out as `X-Refresh-Token`.

**Browsers are completely unaffected** — without `X-Client: mobile` the response body is byte
for byte what it was before, and cookies are still set on both paths. The relevant files are
`frontend/src/lib/nativeAuth.js` (token storage) and the interceptors in `lib/api.js`.

> Requires the backend change to be deployed. An APK pointed at an older backend will fail
> to log in, because the server will not hand over the tokens.

## Signing

`yarn apk` signs with `frontend/android/safenet-release.keystore`, whose passwords are in
`frontend/android/keystore.properties`. **Both are gitignored — back them up somewhere safe.**

If you lose them you can still build and sideload APKs (just regenerate a keystore), but you
could never ship an update to an existing Play Store listing under `com.safenet.app`; Google
identifies an app by its signing key.

Nothing has been published anywhere. To start fresh, delete both files and run:

```bash
keytool -genkeypair -v -keystore safenet-release.keystore -alias safenet -keyalg RSA -keysize 2048 -validity 10000
```

## Installing on a phone

1. Copy `SafeNet-release.apk` to the device (USB, Drive, or `adb install <path>`).
2. Open it. Android will ask to allow installs from that source — this is expected for any
   APK not from the Play Store.

## Native behaviour worth knowing

| Concern | Handling |
|---|---|
| Hardware back button | Navigates back through history, exits at the root (`lib/nativeShell.js`) |
| Certificate download | `<a download>` is inert in a WebView, so the PNG is written to cache and passed to the system share sheet (`lib/nativeFiles.js`) |
| QR scanner | `CAMERA` permission is declared; Android prompts on first use |
| Streaming AI chat | Uses raw `fetch`, which skips the axios interceptors, so it attaches the bearer header itself |
| Icon & splash | Generated SafeNet shield, adaptive icon plus all densities |

## Toolchain

- Node 18+, Yarn
- **JDK 17 or 21** — the Android Gradle Plugin does not support newer JDKs. The build script
  finds Android Studio's bundled `jbr` automatically; override with `JAVA_HOME` if needed.
- Android SDK with platform `android-36`. `frontend/android/local.properties` points at it
  and is gitignored, so each machine sets its own path:
  ```
  sdk.dir=C:/path/to/AndroidSDK
  ```

## Not done

- Not tested on a physical device or emulator — none was attached to the build machine.
  Install it on a phone and check login, the AI chat stream and the certificate download.
- Push notifications, deep links and Play Store packaging (`bundleRelease` → `.aab`) are
  not set up.
