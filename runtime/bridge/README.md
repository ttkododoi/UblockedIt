# UblockedIt Android bridge

This is the real runtime behind the APK runner. It installs your APK on a real
Android device (a phone over USB, or a local emulator) and streams its screen
back into the browser as H.264, with touch input forwarded as adb events.

```
phone/emulator  ──adb──▶  bridge.mjs  ──HTTP/H.264──▶  UblockedIt (browser)
```

## 1. Get an Android target

**Option A — physical phone (recommended, fastest):**

1. Settings → About phone → tap *Build number* 7× to unlock Developer options.
2. Enable *USB debugging*, plug it in, accept the RSA prompt.
3. `adb devices` should list it.

**Option B — emulator:**

```bash
# macOS/Linux, Android SDK installed
emulator -avd Pixel_7_API_34 -no-audio -gpu swiftshader_indirect
```

Any AVD works. Use an x86_64 image for speed, and enable *USB debugging* inside it.

## 2. Start the bridge

```bash
APK_BRIDGE_TOKEN=change-me PORT=8099 node runtime/bridge/bridge.mjs
```

Expose it to the UblockedIt server:

```bash
# on the UblockedIt server
APK_BRIDGE_URL=http://127.0.0.1:8099 \
APK_BRIDGE_TOKEN=change-me \
npm start
```

…or save it from the UI: **APK Runner → Runtime setup → Self-hosted bridge**.
(The in-app form writes `data/runtime.json`.)

## 3. Use it

Open **APK Runner**, upload an APK, press **Launch on device**. The runner
installs with `adb install -r -g`, launches the main activity, and streams the
device screen into the player. Tap/click maps to `input tap`, the toolbar maps
to back/home/rotate.

## Notes

- The bridge is intentionally tiny: Node core only, no dependencies.
- `/stream` uses `adb exec-out screenrecord --output-format=h264`; browsers
  decode it with jmuxer over MSE.
- Some DRM/anti-tamper apps will refuse to run on a debuggable/emulated device.
- `adb install` failure details are returned to the UI — check the console log
  for split-APK bundles (use a merged/base APK).
- Only expose the bridge on a network you trust. The token is a shared secret,
  not per-user auth.
