# UblockedIt

A premium hub for unblocked games, emulator stations, retro runtimes and a real
Android APK runner. Built as a single Node server + React app with no external
backend, no accounts provider and no tracking.

```
┌──────────── browser ────────────┐        ┌──── node server ────┐
│ React 19 + Vite + framer-motion │  ⇄     │ Express 5 · SQLite  │
│ games · emulators · labs · APK  │  /api  │ auth · catalog ·    │
└─────────────────────────────────┘        │ community · APK     │
                                           └─────────┬───────────┘
                                                     │ signed URL + adb
                                           ┌─────────▼───────────┐
                                           │ Android bridge      │
                                           │ phone / emulator    │
                                           └─────────────────────┘
```

## What's inside

| Area | Details |
| --- | --- |
| **Games** | 57 curated titles. 5 open-source games are vendored and served locally (2048, Hextris, Clumsy Bird, Neon Serpent, Vector Breakout); the rest use the official CrazyGames embed player or Poki at launch. |
| **Emulators** | 30 stations via EmulatorJS: NES, SNES, N64, GB/GBC/GBA, NDS, PS1, PSP, Genesis, Master System, Game Gear, Arcade, Atari 2600/7800/Lynx, PC Engine, Neo Geo Pocket, WonderSwan, Virtual Boy, C64, Amiga, ZX Spectrum, MSX, ColecoVision, Intellivision, Vectrex, 3DO, Saturn, Dreamcast. |
| **Labs** | Flash via Ruffle, MS-DOS via js-dos 8, Scratch via TurboWarp. |
| **APK runner** | Upload → binary `AndroidManifest.xml` + `resources.arsc` inspection (package, version, SDK levels, permissions, ABIs, dex, icon) → install on a real Android target → H.264 screen streaming with touch input. |
| **Community** | Threads, votes, comments, tags, leaderboard, member stats, community-submitted games. |
| **Accounts** | scrypt-hashed passwords, httpOnly session cookies, per-user library, playtime, scores, theme, avatar, login history. |
| **Design** | 8 themes (6 dark, 2 light), 8 accents, spring animations, pointer-tracked glow, magnetic buttons, command palette (⌘K), WebAudio UI sounds, reduced-motion mode, fully responsive. |

## Run it

```bash
npm install
npm run dev          # vite on :5173 + api on :4173
# or
npm run build && npm start   # single server on :4173, serves dist + api + games
```

Requirements: Node 22+ (uses the built-in `node:sqlite`).

### Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | API/production port (default `4173`) |
| `APK_BRIDGE_URL` | URL of the Android bridge (`http://127.0.0.1:8099`) |
| `APK_BRIDGE_TOKEN` | Shared secret for the bridge |
| `APPETIZE_PUBLIC_KEY` | Optional managed cloud device key |
| `APPETIZE_TOKEN` | Optional Appetize API token for automatic uploads |
| `SIGNING_SECRET` | HMAC secret for APK download links (set in production) |
| `DATA_DIR` | Where SQLite + uploads live (default `./data`) |

## APK runner — how it actually works

Browsers cannot execute Android bytecode. The runner therefore ships a complete
pipeline with two honest runtime paths:

1. **Self-hosted bridge** (`runtime/bridge/bridge.mjs`, zero dependencies).
   Point it at an adb-visible phone or emulator. It installs the uploaded APK
   (`adb install -r -g`), launches the main activity, then streams
   `adb exec-out screenrecord --output-format=h264` into the browser, decoded
   with jmuxer/MSE. Taps and hardware keys are forwarded via `input tap` /
   `keyevent`. Falls back to JPEG screencaps automatically.

   ```bash
   adb devices
   APK_BRIDGE_TOKEN=change-me node runtime/bridge/bridge.mjs
   APK_BRIDGE_URL=http://127.0.0.1:8099 APK_BRIDGE_TOKEN=change-me npm start
   ```

2. **Cloud device** — paste an Appetize public key in the setup panel (or set
   `APPETIZE_PUBLIC_KEY`) and the APK opens on a managed Android device.

If neither is configured, the UI explains the requirement up-front and offers a
signed download of the inspected package — never a dead screen.

The inspector is a real parser written for this project:
`server/apk.js` decodes the Android binary XML chunk format, the string pool,
`resources.arsc` type chunks (to resolve `@0x7f…` icon references), native ABI
folders, dex count and permissions — then produces a compatibility report.

## Project layout

```
server/
  index.js      express app, all API routes, seeding
  db.js         node:sqlite schema
  auth.js       scrypt hashing, sessions, cookies
  catalog.js    games, emulators, labs metadata
  apk.js        APK binary parser + inspector
runtime/bridge/ adb streaming bridge + README
public/
  games/        vendored open-source games (MIT/GPL — see their LICENSE files)
  builtin/      two original canvas arcade games
src/
  pages/ components/ lib/  React app
```

## Legal

The hub links to third-party games through their official players; those games
belong to their respective creators. Vendored games keep their original licences
(2048 — MIT, Hextris & Clumsy Bird — GPL-3.0). No ROMs or copyrighted APKs are
bundled — you supply your own files.
