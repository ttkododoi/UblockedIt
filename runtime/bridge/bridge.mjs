#!/usr/bin/env node
/**
 * UblockedIt · Android bridge
 * ---------------------------
 * Turns any adb-connected Android device (or local emulator) into a
 * streaming target for the UblockedIt APK runner.
 *
 *   node runtime/bridge/bridge.mjs
 *   APK_BRIDGE_TOKEN=secret PORT=8099 node runtime/bridge/bridge.mjs
 *
 * Requirements: `adb` on PATH + a device visible to `adb devices`.
 * Start an emulator with:  emulator -avd Pixel_7_API_34 -no-audio -gpu swiftshader_indirect
 *
 * Endpoints (all JSON unless noted):
 *   GET  /health
 *   POST /sessions                 { apkUrl, package, activity }
 *   POST /sessions/:id/touch       { x, y, type: 'tap'|'swipe', to?:{x,y}, duration? }
 *   POST /sessions/:id/key         { code }        e.g. 4 = back, 3 = home
 *   POST /sessions/:id/text        { text }
 *   GET  /sessions/:id/frame.jpg   single screenshot
 *   GET  /sessions/:id/stream      chunked raw H.264 (annex-b) for jmuxer
 *   DELETE /sessions/:id
 */
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 8099);
const TOKEN = process.env.APK_BRIDGE_TOKEN || '';
const VERSION = '1.0.0';
const sessions = new Map();

const adb = (args, timeout = 30000) =>
  execFileSync('adb', args, { encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024 }).trim();

function devices() {
  try {
    const out = adb(['devices', '-l']);
    return out
      .split('\n')
      .slice(1)
      .filter(Boolean)
      .map((line) => {
        const [id, state] = line.split(/\s+/);
        const model = (line.match(/model:(\S+)/) || [])[1] || 'android';
        const device = (line.match(/device:(\S+)/) || [])[1] || '';
        return { id, state, model, device };
      })
      .filter((d) => d.state === 'device');
  } catch {
    return [];
  }
}

function json(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
  });
  res.end(payload);
}

function readBody(req, limit = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('body_too_large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function authorized(req) {
  if (!TOKEN) return true;
  const header = req.headers.authorization || '';
  return header === `Bearer ${TOKEN}`;
}

async function downloadApk(url, dest) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed: ${res.status}`);
  const file = fs.createWriteStream(dest);
  for await (const chunk of res.body) {
    if (!file.write(chunk)) await new Promise((r) => file.once('drain', r));
  }
  await new Promise((r) => file.end(r));
  return fs.statSync(dest).size;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'OPTIONS') {
    return json(res, 204, {});
  }
  if (url.pathname === '/health') {
    return json(res, 200, { ok: true, version: VERSION, devices: devices(), sessions: sessions.size });
  }
  if (!authorized(req)) return json(res, 401, { error: 'unauthorized' });

  try {
    // POST /sessions
    if (req.method === 'POST' && url.pathname === '/sessions') {
      const body = await readBody(req);
      const devs = devices();
      if (!devs.length) return json(res, 409, { error: 'no_device', message: 'No adb device connected.' });

      const id = crypto.randomUUID();
      const file = path.join(os.tmpdir(), `ubid-${id}.apk`);
      const size = await downloadApk(body.apkUrl, file);
      let installLog = '';
      try {
        installLog = adb(['install', '-r', '-g', file], 600000);
      } catch (e) {
        installLog = String(e.stderr || e.message);
      }
      fs.unlink(file, () => {});
      if (/Failure/i.test(installLog)) {
        return json(res, 422, { error: 'install_failed', log: installLog.slice(-1200) });
      }

      const pkg = body.package || adb(['shell', 'pm', 'list', 'packages', '-3']).split('\n').pop();
      const activity = body.activity || null;
      try {
        if (activity) adb(['shell', 'am', 'start', '-n', `${pkg}/${activity}`]);
        else adb(['shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1']);
      } catch (e) {
        /* app may still launch */
      }
      adb(['shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0']);
      adb(['shell', 'settings', 'put', 'system', 'user_rotation', '0']);

      const session = { id, package: pkg, activity, device: devs[0].id, size, createdAt: new Date().toISOString() };
      sessions.set(id, session);
      return json(res, 200, session);
    }

    const sessionMatch = parts[0] === 'sessions' && parts[1];
    if (sessionMatch) {
      const id = parts[1];
      const session = sessions.get(id);
      if (!session) return json(res, 404, { error: 'unknown_session' });
      const action = parts[2];

      if (req.method === 'POST' && action === 'touch') {
        const body = await readBody(req);
        const x = Math.round(body.x || 0);
        const y = Math.round(body.y || 0);
        if (body.type === 'swipe' && body.to) {
          adb(['shell', 'input', 'swipe', String(x), String(y), String(Math.round(body.to.x)), String(Math.round(body.to.y)), String(body.duration || 250)]);
        } else if (body.type === 'longpress') {
          adb(['shell', 'input', 'swipe', String(x), String(y), String(x), String(y), String(body.duration || 700)]);
        } else {
          adb(['shell', 'input', 'tap', String(x), String(y)]);
        }
        return json(res, 200, { ok: true });
      }

      if (req.method === 'POST' && action === 'key') {
        const body = await readBody(req);
        adb(['shell', 'input', 'keyevent', String(body.code || 4)]);
        return json(res, 200, { ok: true });
      }

      if (req.method === 'POST' && action === 'text') {
        const body = await readBody(req);
        adb(['shell', 'input', 'text', String(body.text || '').replace(/\s/g, '%s')]);
        return json(res, 200, { ok: true });
      }

      if (req.method === 'GET' && action === 'frame.jpg') {
        const png = execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 40 * 1024 * 1024 });
        res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
        return res.end(png);
      }

      if (req.method === 'GET' && action === 'stream') {
        res.writeHead(200, {
          'content-type': 'video/h264',
          'cache-control': 'no-store',
          'access-control-allow-origin': '*',
          connection: 'keep-alive',
        });
        const proc = spawn('adb', [
          'exec-out',
          'screenrecord',
          '--output-format=h264',
          '--bit-rate=6000000',
          '--size=720x1280',
          '--time-limit=180',
          '-',
        ]);
        proc.stdout.pipe(res);
        proc.stderr.on('data', (d) => process.stderr.write(`[screenrecord] ${d}`));
        const stop = () => {
          try {
            proc.kill('SIGKILL');
          } catch {}
        };
        req.on('close', stop);
        res.on('close', stop);
        proc.on('exit', () => res.end());
        return;
      }

      if (req.method === 'DELETE') {
        sessions.delete(id);
        return json(res, 200, { ok: true });
      }

      if (req.method === 'GET' && action === 'info') {
        return json(res, 200, session);
      }
    }

    json(res, 404, { error: 'not_found' });
  } catch (err) {
    console.error(err);
    json(res, 500, { error: 'bridge_error', message: String(err.message || err) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const devs = devices();
  console.log(`\n  UblockedIt Android bridge v${VERSION} → http://0.0.0.0:${PORT}`);
  console.log(`  adb devices: ${devs.length ? devs.map((d) => `${d.model} (${d.id})`).join(', ') : 'none found'}`);
  if (!TOKEN) console.log('  ⚠ no APK_BRIDGE_TOKEN set — anyone reaching this port can control the device');
  console.log('');
});
