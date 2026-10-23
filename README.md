# UblockedIt

A game hub that behaves like a product: **sixteen self-hosted games**, **thirty emulator cores**, a **Flash/DOS/Scratch lab**, a **real Android APK runner**, accounts with synced libraries and scores, and a community feed.

Everything playable is served from this origin. There are no CrazyGames/Poki embeds, no advertising, no cross-site trackers and no emoji.

---

## Design

- **White by default.** The design system in `src/styles.css` is built on Apple's principles: system font stack (`-apple-system`), generous whitespace, hairline `1px` borders, a single accent colour, pill buttons, and motion that only ever touches `transform` and `opacity`.
- **Eight themes** (`src/lib/themes.ts`): White, Fog, Sand, Mint, Sky, Lilac, Graphite, Midnight — all defined as CSS custom properties, so switching is instant and never re-renders the tree. Seven accent colours can be layered on top.
- **Contrast checked.** Body text uses `--ink` (#1d1d1f), secondary `--ink-2` (#6e6e73) and tertiary `--ink-3` (#86868b) on white — all above 4.5:1 at their intended sizes. No muted-on-muted text.
- **No emoji anywhere.** Icons are `lucide-react` SVGs; emulator categories map to icon keys (`cart`, `handheld`, `disc`, `arcade`, `computer`, `vector`); avatars are coloured initials derived from a hue value.

## Performance

- CSS-only animation; no per-frame pointer listeners, no scroll handlers.
- `backdrop-filter` is limited to the nav, modal scrims and the hero caption.
- Game tiles use `content-visibility: auto` with a reserved intrinsic size, so long grids cost nothing to lay out.
- Covers are 800×500 WebP (q80, 380 KB for all sixteen) with `loading="lazy"` + `decoding="async"`; only the hero image is eager.
- Motion can be disabled globally from the account page or by `prefers-reduced-motion`; `data-motion="off"` collapses every transition.
- Catalogue data is fetched once into `CatalogProvider` and shared; cards are `memo`ised.

## Games (self-hosted)

| Game | URL | Source |
| --- | --- | --- |
| 2048 | `/games/2048/` | MIT, Gabriele Cirulli |
| Hextris | `/games/hextris/` | GPL-3 |
| Tetris | `/games/tetris/` | MIT, Jake Gordon |
| Chess | `/games/chess/` | Apache-2.0, Lars Hartikk |
| Minesweeper | `/games/minesweeper/` | Original |
| Sudoku | `/games/sudoku/` | Original |
| Solitaire | `/games/solitaire/` | Original |
| Connect Four | `/games/connect4/` | Original |
| Pool | `/games/pool/` | Original |
| Serpent (snake) | `/games/snake/` | Original |
| Breakout | `/games/breakout/` | Original |
| Clumsy Bird | `/games/clumsy-bird/` | GPL-3, Ellison Leão |
| Pong | `/games/pong/` | MIT, Jake Gordon |
| Asteroids | `/games/asteroids/` | MIT, Doug McInnes |
| Astray | `/games/astray/` | Public domain, wwwtyro |
| HexGL | `/games/hexgl/` | MIT, BKcore |

Original games post their scores to the parent frame (`{ type: 'ubid:score', game, score }`), which the player forwards to `/api/scores`.

## Emulators

Thirty cores via EmulatorJS (`cdn.emulatorjs.org`, loaded on demand) plus Ruffle for Flash, js-dos for DOS and TurboWarp for Scratch in **Labs**. ROMs are read with the File API and never uploaded.

## APK runner

`POST /api/apk` streams the package in, parses the binary `AndroidManifest.xml` and `resources.arsc` in Node, and returns package name, label, version, min/target SDK, ABIs, permissions, launcher activity, SHA-256 and a compatibility score. Install paths:

1. **Self-hosted bridge** (`runtime/bridge/bridge.mjs`) — `adb install -r -g` on a USB device or local emulator, screen streamed as H.264 with JPEG fallback, taps forwarded as touch events.
2. **Cloud device** — an Appetize.io key, embedded.
3. **Signed download** — HMAC link valid for ten minutes.

## Cookies and consent

| Name | Purpose | Category | Expiry |
| --- | --- | --- | --- |
| `ubid_session` | Signed-in session | Essential | 30 days |
| `ubid_consent` | Your consent record | Essential | 12 months |
| `ubid_theme` | Theme choice | Preferences | 12 months |
| `ubid_accent` | Accent choice | Preferences | 12 months |
| `ubid_motion` | Motion on/off | Preferences | 12 months |
| `ubid_sound` | UI sound on/off | Preferences | 12 months |
| `ubid_last_user` | Prefills the login form | Preferences | 180 days |

The banner appears until a choice is stored. `Customise` opens a preferences dialog with three rows (necessary always on). Choices can be revisited from the footer ("Cookie settings"), the account page, or `/cookies`.

## Running it

```bash
npm install
npm run dev        # API on :4173, Vite on :5173 (proxies /api, /games, /covers)
npm run build      # production bundle into dist/
npm start          # single server on :4173 serving the SPA, API, games and covers
```

### Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port (default `4173`) |
| `DATA_DIR` | SQLite + uploaded APKs (default `data/`) |
| `SIGNING_SECRET` | HMAC key for APK download links |
| `APK_BRIDGE_URL` / `APK_BRIDGE_TOKEN` | Default self-hosted bridge |
| `APPETIZE_TOKEN` | Optional cloud device fallback |

### Demo account

`tester` / `newpassword123` — seeded on a fresh database. Delete `data/` to reseed (users, five community threads, leaderboard scores).

## Layout

```
server/        Express API, SQLite schema, catalog, APK inspector
public/games/  sixteen self-hosted games
public/covers/ 800×500 WebP gameplay covers
src/lib/       api client, store (auth/consent/settings), catalog, themes, cookies
src/components/ nav, layout, player, command palette, cookie UI, cards
src/pages/     home, games, detail, emulators, labs, apk, community, auth, account, legal
runtime/bridge self-hosted adb bridge
```
