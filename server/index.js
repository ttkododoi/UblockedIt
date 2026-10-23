import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { db, DATA_DIR } from './db.js';
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  loadUser,
  requireUser,
  recordLogin,
  publicUser,
} from './auth.js';
import { GAMES, CATEGORIES, EMULATORS, RUNTIMES, gameById } from './catalog.js';
import {
  inspectApk,
  compatibilityReport,
  storeApk,
  apkPath,
  APK_DIR,
} from './apk.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 4173);
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '2mb' }));
app.use(loadUser);

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const bad = (res, code, message) => res.status(code).json({ error: code, message });

const AVATARS = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];

function validateSignup({ username, email, password }) {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(String(username || '')))
    return 'Username must be 3–20 characters: letters, numbers or underscore.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || ''))) return 'That email address does not look valid.';
  if (String(password || '').length < 8) return 'Password must be at least 8 characters.';
  return null;
}

function bridgeConfig() {
  const cfgPath = path.join(DATA_DIR, 'runtime.json');
  let cfg = {};
  try {
    cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  } catch {
    /* none saved */
  }
  return {
    bridgeUrl: process.env.APK_BRIDGE_URL || cfg.bridgeUrl || '',
    bridgeToken: process.env.APK_BRIDGE_TOKEN || cfg.bridgeToken || '',
    appetizeToken: process.env.APPETIZE_TOKEN || cfg.appetizeToken || '',
    appetizeKey: process.env.APPETIZE_PUBLIC_KEY || cfg.appetizeKey || '',
    appetizeDevice: process.env.APPETIZE_DEVICE || cfg.appetizeDevice || 'pixel4',
  };
}

async function fetchWithTimeout(url, opts = {}, ms = 3500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------------------------------------------ */
/* auth                                                                */
/* ------------------------------------------------------------------ */

app.post('/api/auth/signup', (req, res) => {
  const { username, email, password, displayName } = req.body || {};
  const err = validateSignup({ username, email, password });
  if (err) return bad(res, 400, err);

  const exists = db
    .prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?')
    .get(String(username), String(email));
  if (exists) {
    const field = exists.username.toLowerCase() === String(username).toLowerCase() ? 'username' : 'email';
    return bad(res, 409, `That ${field} is already taken. Try another.`);
  }

  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const hue = Math.floor(Math.random() * 360);
  const info = db
    .prepare(
      `INSERT INTO users (username, email, password, display_name, avatar, avatar_hue)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(username),
      String(email),
      hashPassword(String(password)),
      String(displayName || username).slice(0, 40),
      avatar,
      hue
    );

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  createSession(user.id, res);
  recordLogin(user.id, req, 'signup');
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
});

app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) return bad(res, 400, 'Enter your username/email and password.');
  const user = db
    .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
    .get(String(identifier), String(identifier));
  if (!user || !verifyPassword(String(password), user.password)) {
    return bad(res, 401, 'Wrong username or password.');
  }
  createSession(user.id, res);
  recordLogin(user.id, req, 'login');
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
});

app.post('/api/auth/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const favorites = db.prepare('SELECT game_id FROM favorites WHERE user_id = ?').all(user.id).map((r) => r.game_id);
  const plays = db.prepare('SELECT COUNT(*) c, COALESCE(SUM(seconds),0) s FROM play_history WHERE user_id = ?').get(user.id);
  const best = db
    .prepare('SELECT game_id, MAX(score) score FROM scores WHERE user_id = ? GROUP BY game_id')
    .all(user.id);
  const apks = db.prepare('SELECT COUNT(*) c FROM apks WHERE user_id = ?').get(user.id);
  res.json({
    user: publicUser(user),
    favorites,
    stats: {
      plays: plays.c,
      minutes: Math.round(plays.s / 60),
      best: Object.fromEntries(best.map((b) => [b.game_id, b.score])),
      apks: apks.c,
    },
  });
});

app.patch('/api/auth/me', requireUser, (req, res) => {
  const allowed = {
    displayName: 'display_name',
    bio: 'bio',
    avatar: 'avatar',
    avatarHue: 'avatar_hue',
    theme: 'theme',
    accent: 'accent',
    sound: 'sound',
    motion: 'motion',
    email: 'email',
  };
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(allowed)) {
    if (!(key in (req.body || {}))) continue;
    let value = req.body[key];
    if (key === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value))) return bad(res, 400, 'Invalid email.');
      const clash = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(String(value), req.user.id);
      if (clash) return bad(res, 409, 'That email is already in use.');
    }
    if (['sound', 'motion'].includes(key)) value = value ? 1 : 0;
    if (['displayName', 'bio', 'avatar', 'theme', 'accent'].includes(key)) value = String(value).slice(0, 240);
    sets.push(`${column} = ?`);
    values.push(value);
  }
  if (!sets.length) return res.json({ user: publicUser(req.user) });
  values.push(req.user.id);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

app.post('/api/auth/password', requireUser, (req, res) => {
  const { current, next } = req.body || {};
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!verifyPassword(String(current || ''), row.password)) return bad(res, 401, 'Current password is incorrect.');
  if (String(next || '').length < 8) return bad(res, 400, 'New password must be at least 8 characters.');
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(String(next)), req.user.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);
  createSession(req.user.id, res);
  res.json({ ok: true });
});

app.get('/api/auth/activity', requireUser, (req, res) => {
  const events = db
    .prepare('SELECT kind, ip, user_agent, at FROM login_events WHERE user_id = ? ORDER BY id DESC LIMIT 25')
    .all(req.user.id);
  const history = db
    .prepare('SELECT game_id, provider, seconds, played_at FROM play_history WHERE user_id = ? ORDER BY id DESC LIMIT 40')
    .all(req.user.id);
  res.json({ events, history });
});

app.delete('/api/auth/me', requireUser, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  destroySession(req, res);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* catalog                                                             */
/* ------------------------------------------------------------------ */

app.get('/api/catalog', (req, res) => {
  // Every title in the catalog is served from this origin — no third-party embeds.
  res.json({
    games: GAMES,
    categories: CATEGORIES,
    emulators: EMULATORS,
    runtimes: RUNTIMES,
  });
});

app.get('/api/catalog/:id', (req, res) => {
  const game = gameById(req.params.id);
  if (!game) return bad(res, 404, 'Game not found');
  res.json(game);
});

/* ------------------------------------------------------------------ */
/* activity: favorites, playtime, scores                               */
/* ------------------------------------------------------------------ */

app.post('/api/play', (req, res) => {
  const { gameId, provider, seconds } = req.body || {};
  if (!gameId) return bad(res, 400, 'gameId required');
  if (req.user) {
    db.prepare('INSERT INTO play_history (user_id, game_id, provider, seconds) VALUES (?, ?, ?, ?)').run(
      req.user.id,
      String(gameId).slice(0, 80),
      String(provider || 'local').slice(0, 30),
      Math.max(0, Math.min(86400, Number(seconds) || 0))
    );
  }
  res.json({ ok: true });
});

app.get('/api/favorites', requireUser, (req, res) => {
  res.json(db.prepare('SELECT game_id FROM favorites WHERE user_id = ?').all(req.user.id).map((r) => r.game_id));
});

app.post('/api/favorites/:gameId', requireUser, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, game_id) VALUES (?, ?)').run(
    req.user.id,
    String(req.params.gameId).slice(0, 80)
  );
  res.json({ ok: true });
});

app.delete('/api/favorites/:gameId', requireUser, (req, res) => {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND game_id = ?').run(req.user.id, String(req.params.gameId));
  res.json({ ok: true });
});

app.post('/api/scores', (req, res) => {
  const { gameId, score } = req.body || {};
  const value = Math.max(0, Math.min(1e9, Math.floor(Number(score) || 0)));
  if (!gameId) return bad(res, 400, 'gameId required');
  if (req.user) {
    db.prepare('INSERT INTO scores (user_id, game_id, score) VALUES (?, ?, ?)').run(req.user.id, String(gameId), value);
  }
  res.json({ ok: true, score: value });
});

app.get('/api/leaderboard', (req, res) => {
  const gameId = req.query.game ? String(req.query.game) : null;
  const rows = db
    .prepare(
      `SELECT s.game_id, s.score, s.created_at, u.username, u.avatar, u.avatar_hue
       FROM scores s JOIN users u ON u.id = s.user_id
       ${gameId ? 'WHERE s.game_id = ?' : ''}
       ORDER BY s.score DESC LIMIT 60`
    )
    .all(...(gameId ? [gameId] : []));
  res.json(rows);
});

/* ------------------------------------------------------------------ */
/* custom community games                                              */
/* ------------------------------------------------------------------ */

app.post('/api/custom-games', requireUser, (req, res) => {
  const { title, tagline, url, category, emoji, from, to } = req.body || {};
  if (!title || !url) return bad(res, 400, 'Title and URL are required.');
  if (!/^https?:\/\//i.test(String(url))) return bad(res, 400, 'URL must start with http:// or https://');
  const id = 'c-' + crypto.randomBytes(4).toString('hex');
  db.prepare(
    `INSERT INTO custom_games (id, user_id, title, tagline, category, url, emoji, from_color, to_color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    req.user.id,
    String(title).slice(0, 60),
    String(tagline || '').slice(0, 120),
    String(category || 'Arcade'),
    String(url).slice(0, 500),
    String(emoji || '').slice(0, 4),
    String(from || '#7c5cff'),
    String(to || '#00d4ff')
  );
  res.json({ ok: true, id });
});

app.delete('/api/custom-games/:id', requireUser, (req, res) => {
  db.prepare('DELETE FROM custom_games WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* community                                                           */
/* ------------------------------------------------------------------ */

const postView = (row, viewerId) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  tag: row.tag,
  gameId: row.game_id,
  createdAt: row.created_at,
  author: {
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    hue: row.avatar_hue,
  },
  votes: row.votes || 0,
  voted: !!row.voted,
  comments: row.comments || 0,
  mine: viewerId === row.user_id,
});

app.get('/api/community/posts', (req, res) => {
  const tag = req.query.tag && req.query.tag !== 'all' ? String(req.query.tag) : null;
  const sort = req.query.sort === 'top' ? 'top' : 'new';
  const viewer = req.user?.id || 0;
  const rows = db
    .prepare(
      `SELECT p.*, u.username, u.display_name, u.avatar, u.avatar_hue,
        (SELECT COUNT(*) FROM votes v WHERE v.post_id = p.id) AS votes,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments,
        EXISTS(SELECT 1 FROM votes v2 WHERE v2.post_id = p.id AND v2.user_id = ?) AS voted
       FROM posts p JOIN users u ON u.id = p.user_id
       ${tag ? 'WHERE p.tag = ?' : ''}
       ORDER BY ${sort === 'top' ? 'votes DESC, p.created_at DESC' : 'p.created_at DESC'}
       LIMIT 60`
    )
    .all(...(tag ? [viewer, tag] : [viewer]));
  res.json(rows.map((r) => postView(r, viewer)));
});

app.post('/api/community/posts', requireUser, (req, res) => {
  const { title, body, tag, gameId } = req.body || {};
  if (!title || String(title).trim().length < 3) return bad(res, 400, 'Give your post a title (3+ characters).');
  const info = db
    .prepare('INSERT INTO posts (user_id, title, body, tag, game_id) VALUES (?, ?, ?, ?, ?)')
    .run(
      req.user.id,
      String(title).slice(0, 120),
      String(body || '').slice(0, 4000),
      String(tag || 'general').slice(0, 24),
      gameId ? String(gameId).slice(0, 80) : null
    );
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.delete('/api/community/posts/:id', requireUser, (req, res) => {
  db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
});

app.post('/api/community/posts/:id/vote', requireUser, (req, res) => {
  const postId = Number(req.params.id);
  const existing = db.prepare('SELECT 1 FROM votes WHERE post_id = ? AND user_id = ?').get(postId, req.user.id);
  if (existing) db.prepare('DELETE FROM votes WHERE post_id = ? AND user_id = ?').run(postId, req.user.id);
  else db.prepare('INSERT INTO votes (post_id, user_id) VALUES (?, ?)').run(postId, req.user.id);
  const votes = db.prepare('SELECT COUNT(*) c FROM votes WHERE post_id = ?').get(postId).c;
  res.json({ votes, voted: !existing });
});

app.get('/api/community/posts/:id/comments', (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, u.username, u.display_name, u.avatar, u.avatar_hue
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ? ORDER BY c.id ASC LIMIT 200`
    )
    .all(Number(req.params.id));
  res.json(
    rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      author: { username: r.username, displayName: r.display_name, avatar: r.avatar, hue: r.avatar_hue },
      mine: req.user?.id === r.user_id,
    }))
  );
});

app.post('/api/community/posts/:id/comments', requireUser, (req, res) => {
  const body = String(req.body?.body || '').trim();
  if (body.length < 1) return bad(res, 400, 'Write something first.');
  if (!db.prepare('SELECT 1 FROM posts WHERE id = ?').get(Number(req.params.id))) return bad(res, 404, 'Post not found');
  const info = db
    .prepare('INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)')
    .run(Number(req.params.id), req.user.id, body.slice(0, 1200));
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.delete('/api/community/comments/:id', requireUser, (req, res) => {
  db.prepare('DELETE FROM comments WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
});

app.get('/api/community/stats', (req, res) => {
  const members = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  const posts = db.prepare('SELECT COUNT(*) c FROM posts').get().c;
  const comments = db.prepare('SELECT COUNT(*) c FROM comments').get().c;
  const plays = db.prepare('SELECT COALESCE(SUM(seconds),0) s FROM play_history').get().s;
  const top = db
    .prepare(
      `SELECT u.username, u.avatar, u.avatar_hue, COUNT(*) c
       FROM play_history h JOIN users u ON u.id = h.user_id
       GROUP BY u.id ORDER BY c DESC LIMIT 5`
    )
    .all();
  res.json({ members, posts, comments, hoursPlayed: Math.round(plays / 3600), top });
});

/* ------------------------------------------------------------------ */
/* APKs                                                               */
/* ------------------------------------------------------------------ */

const upload = multer({
  dest: path.join(DATA_DIR, 'tmp'),
  limits: { fileSize: 1500 * 1024 * 1024, files: 1 },
});
fs.mkdirSync(path.join(DATA_DIR, 'tmp'), { recursive: true });

app.post('/api/apk', requireUser, upload.single('apk'), (req, res) => {
  if (!req.file) return bad(res, 400, 'No file uploaded.');
  const tmp = req.file.path;
  try {
    if (!/\.(apk|apks|xapk)$/i.test(req.file.originalname || '')) {
      return bad(res, 400, 'That file is not an .apk. Android packages end in .apk.');
    }
    const info = inspectApk(tmp);
    const id = crypto.randomUUID();
    const target = path.join(APK_DIR, `${id}.apk`);
    fs.renameSync(tmp, target);
    const report = compatibilityReport(info);
    db.prepare(
      `INSERT INTO apks (id, user_id, filename, size, sha256, package, label, version, version_code,
        min_sdk, target_sdk, abis, permissions, activities, icon_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      req.user.id,
      String(req.file.originalname).slice(0, 200),
      info.size,
      info.sha256,
      info.package,
      info.label,
      info.version,
      info.versionCode,
      info.minSdk,
      info.targetSdk,
      JSON.stringify(info.abis),
      JSON.stringify(info.permissions),
      JSON.stringify(info.activities),
      info.iconPath
    );
    res.json({
      id,
      filename: req.file.originalname,
      info: { ...info, sha256: info.sha256.slice(0, 16) + '…' },
      report,
    });
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* noop */
    }
    if (String(err.message) === 'not_an_apk') return bad(res, 422, 'That archive is not a valid Android package.');
    console.error('APK inspect failed:', err);
    return bad(res, 422, 'Could not read that package. It may be corrupt or use an unsupported split format.');
  }
});

app.get('/api/apk', requireUser, (req, res) => {
  const rows = db.prepare('SELECT * FROM apks WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(
    rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      size: r.size,
      package: r.package,
      label: r.label,
      version: r.version,
      versionCode: r.version_code,
      minSdk: r.min_sdk,
      targetSdk: r.target_sdk,
      abis: JSON.parse(r.abis || '[]'),
      permissions: JSON.parse(r.permissions || '[]'),
      activities: JSON.parse(r.activities || '[]'),
      createdAt: r.created_at,
      icon: `/api/apk/${r.id}/icon`,
    }))
  );
});

app.get('/api/apk/:id/icon', requireUser, (req, res) => {
  const row = db.prepare('SELECT * FROM apks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return bad(res, 404, 'Not found');
  try {
    const info = inspectApk(apkPath(row.id));
    if (!info.icon) return res.status(204).end();
    const [meta, base64] = info.icon.split(',');
    const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'image/png';
    res.type(mime).send(Buffer.from(base64, 'base64'));
  } catch {
    res.status(204).end();
  }
});

app.get('/api/apk/:id/download', requireUser, (req, res) => {
  const row = db.prepare('SELECT * FROM apks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return bad(res, 404, 'Not found');
  res.download(apkPath(row.id), row.filename || 'app.apk');
});

/** The bridge fetches the APK using this short-lived signed URL. */
function signedApkUrl(id, userId) {
  const exp = Date.now() + 10 * 60 * 1000;
  const sig = crypto
    .createHmac('sha256', process.env.SIGNING_SECRET || 'ublockedit-dev-secret')
    .update(`${id}.${userId}.${exp}`)
    .digest('hex');
  return `/api/apk/${id}/raw?exp=${exp}&sig=${sig}`;
}

app.get('/api/apk/:id/raw', (req, res) => {
  const row = db.prepare('SELECT * FROM apks WHERE id = ?').get(req.params.id);
  if (!row) return bad(res, 404, 'Not found');
  const exp = Number(req.query.exp || 0);
  const sig = String(req.query.sig || '');
  const expect = crypto
    .createHmac('sha256', process.env.SIGNING_SECRET || 'ublockedit-dev-secret')
    .update(`${row.id}.${row.user_id}.${exp}`)
    .digest('hex');
  const valid = exp > Date.now() && sig.length === expect.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect));
  if (!valid) return bad(res, 403, 'Link expired — relaunch the runtime.');
  res.type('application/vnd.android.package-archive');
  fs.createReadStream(apkPath(row.id)).pipe(res);
});

app.delete('/api/apk/:id', requireUser, (req, res) => {
  const row = db.prepare('SELECT * FROM apks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return bad(res, 404, 'Not found');
  db.prepare('DELETE FROM apks WHERE id = ?').run(row.id);
  try {
    fs.unlinkSync(apkPath(row.id));
  } catch {
    /* noop */
  }
  res.json({ ok: true });
});

app.get('/api/apk/runtime/status', async (req, res) => {
  const cfg = bridgeConfig();
  const out = {
    bridge: { configured: !!cfg.bridgeUrl, url: cfg.bridgeUrl, reachable: false, devices: [] },
    cloud: { configured: !!(cfg.appetizeToken || cfg.appetizeKey), device: cfg.appetizeDevice },
  };
  if (cfg.bridgeUrl) {
    try {
      const r = await fetchWithTimeout(`${cfg.bridgeUrl.replace(/\/$/, '')}/health`, {}, 3000);
      if (r.ok) {
        const data = await r.json();
        out.bridge.reachable = true;
        out.bridge.devices = data.devices || [];
        out.bridge.version = data.version;
      }
    } catch {
      /* offline */
    }
  }
  res.json(out);
});

app.post('/api/apk/runtime/config', requireUser, (req, res) => {
  const cfgPath = path.join(DATA_DIR, 'runtime.json');
  let cfg = {};
  try {
    cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  } catch {
    /* none */
  }
  const { bridgeUrl, bridgeToken, appetizeToken, appetizeKey, appetizeDevice } = req.body || {};
  cfg = {
    ...cfg,
    ...(bridgeUrl !== undefined ? { bridgeUrl: String(bridgeUrl).slice(0, 300) } : {}),
    ...(bridgeToken !== undefined ? { bridgeToken: String(bridgeToken).slice(0, 300) } : {}),
    ...(appetizeToken !== undefined ? { appetizeToken: String(appetizeToken).slice(0, 300) } : {}),
    ...(appetizeKey !== undefined ? { appetizeKey: String(appetizeKey).slice(0, 300) } : {}),
    ...(appetizeDevice !== undefined ? { appetizeDevice: String(appetizeDevice).slice(0, 60) } : {}),
  };
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  res.json({ ok: true });
});

app.post('/api/apk/:id/session', requireUser, async (req, res) => {
  const row = db.prepare('SELECT * FROM apks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return bad(res, 404, 'APK not found');
  const cfg = bridgeConfig();
  const requested = String(req.body?.mode || 'auto');
  const sessionId = crypto.randomUUID();

  // 1) Cloud device farm (fully managed, works everywhere)
  if ((requested === 'cloud' || requested === 'auto') && cfg.appetizeKey) {
    const query = new URLSearchParams({
      device: cfg.appetizeDevice,
      scale: 'auto',
      autoplay: 'true',
      launchUrl: '',
      orientation: 'portrait',
      language: 'en',
      locale: 'en',
    });
    db.prepare(
      'INSERT INTO apk_sessions (id, apk_id, user_id, provider, remote_id, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(sessionId, row.id, req.user.id, 'appetize', cfg.appetizeKey, 'running');
    return res.json({
      mode: 'embed',
      provider: 'appetize',
      sessionId,
      embedUrl: `https://appetize.io/embed/${encodeURIComponent(cfg.appetizeKey)}?${query}`,
    });
  }

  // 2) Self-hosted bridge (adb-connected phone or local emulator)
  if (requested === 'bridge' || requested === 'auto') {
    if (cfg.bridgeUrl) {
      try {
        const r = await fetchWithTimeout(
          `${cfg.bridgeUrl.replace(/\/$/, '')}/sessions`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              ...(cfg.bridgeToken ? { authorization: `Bearer ${cfg.bridgeToken}` } : {}),
            },
            body: JSON.stringify({
              apkUrl: signedApkUrl(row.id, req.user.id),
              package: row.package,
              label: row.label,
              activity: JSON.parse(row.activities || '[]').find((a) => /Main|Launcher/i.test(a)) || null,
            }),
          },
          15000
        );
        if (r.ok) {
          const data = await r.json();
          db.prepare(
            'INSERT INTO apk_sessions (id, apk_id, user_id, provider, remote_id, status) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(sessionId, row.id, req.user.id, 'bridge', data.id || null, 'running');
          return res.json({
            mode: 'bridge',
            provider: 'bridge',
            sessionId,
            bridgeUrl: cfg.bridgeUrl,
            bridgeToken: cfg.bridgeToken,
            remote: data,
          });
        }
        const errText = await r.text().catch(() => '');
        console.error('bridge refused session', r.status, errText.slice(0, 300));
      } catch (e) {
        console.error('bridge unreachable', e.message);
      }
    }
  }

  // 3) Local sandbox — we start a session the browser can poll while a
  //    runtime attaches. Keeps the UX honest instead of a dead screen.
  db.prepare(
    'INSERT INTO apk_sessions (id, apk_id, user_id, provider, remote_id, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(sessionId, row.id, req.user.id, 'local', null, 'pending');
  res.json({
    mode: 'setup',
    sessionId,
    apk: {
      id: row.id,
      package: row.package,
      label: row.label,
      version: row.version,
      minSdk: row.min_sdk,
      abis: JSON.parse(row.abis || '[]'),
      downloadUrl: signedApkUrl(row.id, req.user.id),
    },
    requirements: {
      bridgeConfigured: !!cfg.bridgeUrl,
      cloudConfigured: !!cfg.appetizeKey,
    },
  });
});

app.get('/api/runtime/bridge/status', async (req, res) => {
  const cfg = bridgeConfig();
  if (!cfg.bridgeUrl) return res.json({ reachable: false, configured: false });
  try {
    const r = await fetchWithTimeout(`${cfg.bridgeUrl.replace(/\/$/, '')}/health`, {}, 3000);
    const data = await r.json();
    res.json({ reachable: r.ok, configured: true, ...data });
  } catch {
    res.json({ reachable: false, configured: true });
  }
});

/* ------------------------------------------------------------------ */
/* static                                                              */
/* ------------------------------------------------------------------ */

app.use(
  express.static(path.join(ROOT, 'public'), {
    redirect: false,
    setHeaders(res, filePath) {
      if (/\.(html|js|css|wasm|json|bin)$/i.test(filePath)) res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

const DIST = path.join(ROOT, 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, redirect: false }));
}

app.get('/api/health', (req, res) => res.json({ ok: true, version: '1.0.0', uptime: process.uptime() }));

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  const index = path.join(DIST, 'index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  next();
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Unknown API endpoint.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'too_large', message: 'That package is larger than the 1.5 GB limit.' });
  }
  res.status(500).json({ error: 'server_error', message: 'Something went wrong on our side.' });
});

/* ------------------------------------------------------------------ */
/* seed                                                                */
/* ------------------------------------------------------------------ */

function seed() {
  const hasPosts = db.prepare('SELECT COUNT(*) c FROM posts').get().c;
  if (!hasPosts) {
    db.prepare(
      `INSERT OR IGNORE INTO users (username, email, password, display_name, avatar, avatar_hue, bio, theme)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'nova',
      'nova@ublockedit.local',
      hashPassword(crypto.randomBytes(16).toString('hex')),
      'Nova',
      '',
      268,
      'Community host. I run the Friday night HexGL time trials.',
      'white'
    );
    const bot = db.prepare('SELECT id FROM users WHERE username = ?').get('nova');
    const seedPosts = [
      {
        title: 'Weekly challenge: beat 1,024 on 2048',
        body: 'Post a screenshot of your board in the replies. Highest tile wins bragging rights and a custom role. My record is 2,048 and I am still not okay.',
        tag: 'challenges',
        game: '2048',
      },
      {
        title: 'HexGL lap times: post your best Skyway run',
        body: 'I finally got under 1:12 with the airbrake tuck through turn three. Share your ghost-worthy laps and the keys you rebound the airbrake to.',
        tag: 'challenges',
        game: 'hexgl',
      },
      {
        title: 'PS1 emulator tips for slow laptops',
        body: 'Use the DuckStation core and drop internal resolution to 1x, then enable skip-buffer-effects. My 2015 MacBook now runs at a locked 60fps.',
        tag: 'emulators',
        game: null,
      },
      {
        title: 'Found a 1998 Flash game archive — 300 SWFs',
        body: 'Dropped a zip of old Cartoon Network SWFs into Flash Vault. Ruffle handles almost all of them, only two crash. Perfect nostalgia hit.',
        tag: 'general',
        game: null,
      },
      {
        title: 'Best two-player games for one keyboard',
        body: 'Connect Four and Pool are on the hub already. Comment your couch-co-op picks and I will put them in the weekly rotation.',
        tag: 'challenges',
        game: 'pool',
      },
    ];
    for (const p of seedPosts) {
      db.prepare('INSERT INTO posts (user_id, title, body, tag, game_id) VALUES (?, ?, ?, ?, ?)').run(
        bot.id,
        p.title,
        p.body,
        p.tag,
        p.game
      );
    }
    const pids = db.prepare('SELECT id FROM posts').all();
    for (const p of pids.slice(0, 3)) {
      db.prepare('INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)').run(
        p.id,
        bot.id,
        'Pinned for the weekend — reply with your runs!'
      );
    }
  }

  const hasScores = db.prepare('SELECT COUNT(*) c FROM scores').get().c;
  if (!hasScores) {
    const ids = NEW_SEED_SCORES.map((s) => s.user);
    for (const [i, name] of ['nova', 'pixelqueen', 'bytecrash', 'turbofox', 'zerocool'].entries()) {
      db.prepare(
        `INSERT OR IGNORE INTO users (username, email, password, display_name, avatar, avatar_hue)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        name,
        `${name}@ublockedit.local`,
        hashPassword(crypto.randomBytes(12).toString('hex')),
        name,
        ''
        (i * 61) % 360
      );
    }
    for (const s of SEED_SCORES) {
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get(s.user);
      db.prepare('INSERT INTO scores (user_id, game_id, score) VALUES (?, ?, ?)').run(user.id, s.game, s.score);
    }
  }
}

const NEW_SEED_SCORES = [];
const SEED_SCORES = [
  { user: 'nova', game: 'neon-snake', score: 4820 },
  { user: 'pixelqueen', game: 'neon-snake', score: 6120 },
  { user: 'bytecrash', game: 'neon-snake', score: 3340 },
  { user: 'turbofox', game: 'neon-snake', score: 2710 },
  { user: 'zerocool', game: 'neon-snake', score: 1980 },
  { user: 'pixelqueen', game: 'vector-breakout', score: 9840 },
  { user: 'nova', game: 'vector-breakout', score: 7410 },
  { user: 'turbofox', game: 'vector-breakout', score: 5120 },
];

seed();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  UblockedIt running → http://0.0.0.0:${PORT}\n`);
  if (!fs.existsSync(path.join(ROOT, 'dist'))) {
    console.log('  dev mode: Vite serves the UI, this server serves the API + game assets.\n');
  }
});
