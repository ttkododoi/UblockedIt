import crypto from 'node:crypto';
import { db } from './db.js';

const SESSION_DAYS = 60;
const COOKIE = 'ubid';

export const publicUser = (u) =>
  u && {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.display_name,
    avatar: u.avatar,
    avatarHue: u.avatar_hue,
    bio: u.bio,
    theme: u.theme,
    accent: u.accent,
    sound: !!u.sound,
    motion: !!u.motion,
    createdAt: u.created_at,
    lastLogin: u.last_login,
    loginCount: u.login_count,
  };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, salt, hash] = String(stored).split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const candidate = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

export function parseCookies(header = '') {
  return Object.fromEntries(
    String(header)
      .split(';')
      .map((part) => part.trim().split('='))
      .filter((pair) => pair.length === 2)
      .map(([k, v]) => [k, decodeURIComponent(v)])
  );
}

export function createSession(userId, res) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expires.toISOString()
  );
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === '1',
    maxAge: SESSION_DAYS * 864e5,
    path: '/',
  });
  return token;
}

export function destroySession(req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie(COOKIE, { path: '/' });
}

export function loadUser(req, res, next) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  req.user = null;
  if (token) {
    const row = db
      .prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > ?`
      )
      .get(token, new Date().toISOString());
    if (row) req.user = row;
  }
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'not_authenticated', message: 'Sign in to continue.' });
  next();
}

export function recordLogin(userId, req, kind) {
  db.prepare('INSERT INTO login_events (user_id, kind, ip, user_agent) VALUES (?, ?, ?, ?)').run(
    userId,
    kind,
    req.ip || '',
    String(req.headers['user-agent'] || '').slice(0, 300)
  );
  db.prepare(
    `UPDATE users SET last_login = datetime('now'), login_count = login_count + 1 WHERE id = ?`
  ).run(userId);
}

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}
