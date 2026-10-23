/**
 * APK inspection toolkit
 * ----------------------
 * A dependency-light Android binary XML + resources.arsc reader.
 * It extracts the package name, version, SDK levels, permissions, dex/native
 * layout and app icon so the runner can configure itself correctly instead of
 * guessing.
 */
import AdmZip from 'adm-zip';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './db.js';

export const APK_DIR = path.join(DATA_DIR, 'apks');
fs.mkdirSync(APK_DIR, { recursive: true });

const RES_STRING_POOL_TYPE = 0x0001;
const RES_XML_START_ELEMENT_TYPE = 0x0102;
const RES_XML_END_ELEMENT_TYPE = 0x0103;
const RES_TABLE_TYPE = 0x0002;
const RES_TABLE_PACKAGE_TYPE = 0x0200;
const RES_TABLE_TYPE_TYPE = 0x0201;

export function readStringPool(buf, start, headerSize = buf.readUInt16LE(start + 2)) {
  const stringCount = buf.readUInt32LE(start + 8);
  const flags = buf.readUInt32LE(start + 16);
  const stringsStart = buf.readUInt32LE(start + 20);
  const utf8 = (flags & 0x100) !== 0;
  const base = start + stringsStart;
  const out = [];
  for (let i = 0; i < stringCount; i++) {
    const offPos = start + headerSize + i * 4;
    if (offPos + 4 > buf.length) break;
    const off = buf.readUInt32LE(offPos);
    let p = base + off;
    try {
      if (utf8) {
        let len = buf[p++];
        if (len & 0x80) len = ((len & 0x7f) << 8) | buf[p++];
        let blen = buf[p++];
        if (blen & 0x80) blen = ((blen & 0x7f) << 8) | buf[p++];
        out.push(buf.toString('utf8', p, p + blen));
      } else {
        let len = buf.readUInt16LE(p);
        p += 2;
        if (len & 0x8000) {
          len = ((len & 0x7fff) << 16) | buf.readUInt16LE(p);
          p += 2;
        }
        out.push(buf.toString('utf16le', p, p + len * 2));
      }
    } catch {
      out.push('');
    }
  }
  return out;
}

/** Parse Android's binary XML container into a flat list of elements. */
export function parseBinaryXml(buf) {
  if (buf.length < 12 || buf.readUInt16LE(0) !== 0x0003) throw new Error('not_binary_xml');
  const strings = readStringPool(buf, buf.readUInt16LE(2));
  const elements = [];
  const stack = [];
  let off = buf.readUInt16LE(2);

  while (off + 8 <= buf.length) {
    const type = buf.readUInt16LE(off);
    const headerSize = buf.readUInt16LE(off + 2);
    const size = buf.readUInt32LE(off + 4);
    if (size < 8) break;

    if (type === RES_STRING_POOL_TYPE) {
      // string pool already read at the root header
    } else if (type === RES_XML_START_ELEMENT_TYPE) {
      const nameIdx = buf.readUInt32LE(off + 20);
      const attrStart = buf.readUInt16LE(off + 24);
      const attrSize = buf.readUInt16LE(off + 26);
      const attrCount = buf.readUInt16LE(off + 28);
      const attrs = {};
      for (let i = 0; i < attrCount; i++) {
        const a = off + headerSize + attrStart + i * attrSize;
        if (a + 20 > buf.length) break;
        const name = strings[buf.readUInt32LE(a + 4)] || '';
        const rawValue = buf.readUInt32LE(a + 8);
        const dataType = buf[a + 15];
        const data = buf.readUInt32LE(a + 16);
        let value;
        if (rawValue !== 0xffffffff && strings[rawValue] !== undefined) value = strings[rawValue];
        else if (dataType === 0x03) value = strings[data] ?? '';
        else if (dataType === 0x10) value = String(data | 0);
        else if (dataType === 0x11) value = '0x' + data.toString(16);
        else if (dataType === 0x12) value = data !== 0;
        else if (dataType === 0x01) value = '@' + data.toString(16);
        else value = data;
        attrs[name] = { value, raw: rawValue !== 0xffffffff ? strings[rawValue] : undefined, dataType, data };
      }
      const el = { name: strings[nameIdx] || '', attrs, depth: stack.length };
      elements.push(el);
      stack.push(el.name);
    } else if (type === RES_XML_END_ELEMENT_TYPE) {
      stack.pop();
    }
    off += size;
  }
  return elements;
}

/** Resolve a resource id to its first string value using the type chunks. */
export function findResourceString(arscBuf, resId) {
  if (!arscBuf || arscBuf.length < 12 || arscBuf.readUInt16LE(0) !== RES_TABLE_TYPE) return null;
  const globalStrings = readStringPool(arscBuf, arscBuf.readUInt16LE(2));
  const targetType = (resId >> 16) & 0xff;
  const targetEntry = resId & 0xffff;
  let off = arscBuf.readUInt16LE(2);

  while (off + 8 <= arscBuf.length) {
    const type = arscBuf.readUInt16LE(off);
    const headerSize = arscBuf.readUInt16LE(off + 2);
    const size = arscBuf.readUInt32LE(off + 4);
    if (size < 8) break;
    if (type === RES_TABLE_PACKAGE_TYPE) {
      let p = off + headerSize;
      const end = off + size;
      while (p + 8 <= end) {
        const ctype = arscBuf.readUInt16LE(p);
        const chs = arscBuf.readUInt16LE(p + 2);
        const csize = arscBuf.readUInt32LE(p + 4);
        if (csize < 8) break;
        if (ctype === RES_TABLE_TYPE_TYPE) {
          const typeId = arscBuf[p + 8];
          const entryCount = arscBuf.readUInt32LE(p + 12);
          const entriesStart = arscBuf.readUInt32LE(p + 16);
          if (typeId === targetType && targetEntry < entryCount) {
            const entryOffset = arscBuf.readUInt32LE(p + chs + targetEntry * 4);
            if (entryOffset !== 0xffffffff) {
              const e = p + entriesStart + entryOffset;
              if (e + 8 <= end) {
                const flags = arscBuf.readUInt16LE(e + 2);
                if (!(flags & 0x0001)) {
                  const valuePos = e + arscBuf.readUInt16LE(e);
                  const dataType = arscBuf[valuePos + 3];
                  const data = arscBuf.readUInt32LE(valuePos + 4);
                  if (dataType === 0x03 && globalStrings[data]) return globalStrings[data];
                }
              }
            }
          }
        }
        p += csize;
      }
    }
    off += size;
  }
  return null;
}

const ABI_NAMES = ['arm64-v8a', 'armeabi-v7a', 'armeabi', 'x86_64', 'x86', 'mips', 'riscv64'];

export function inspectApk(filePath) {
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();
  const names = new Set(entries.map((e) => e.entryName));
  if (!names.has('AndroidManifest.xml') && !names.has('classes.dex')) {
    throw new Error('not_an_apk');
  }

  const manifestEntry = zip.getEntry('AndroidManifest.xml');
  let manifest = {
    package: null,
    versionName: null,
    versionCode: null,
    label: null,
    icon: null,
    permissions: [],
    activities: [],
    services: [],
    features: [],
    minSdk: null,
    targetSdk: null,
    debuggable: false,
  };

  if (manifestEntry) {
    try {
      const xml = parseBinaryXml(manifestEntry.getData());
      for (const el of xml) {
        const a = el.attrs;
        if (el.name === 'manifest') {
          manifest.package = a.package?.value || manifest.package;
          manifest.versionName = a.versionName?.value || manifest.versionName;
          manifest.versionCode = a.versionCode?.value || manifest.versionCode;
          if (a.compileSdkVersion?.value) manifest.compileSdk = a.compileSdkVersion.value;
        } else if (el.name === 'uses-sdk') {
          manifest.minSdk = a.minSdkVersion?.value ?? manifest.minSdk;
          manifest.targetSdk = a.targetSdkVersion?.value ?? manifest.targetSdk;
        } else if (el.name === 'uses-permission' || el.name === 'uses-permission-sdk-23') {
          if (a.name?.value) manifest.permissions.push(String(a.name.value));
        } else if (el.name === 'uses-feature') {
          if (a.name?.value) manifest.features.push(String(a.name.value));
        } else if (el.name === 'application') {
          manifest.label = a.label?.value ?? manifest.label;
          manifest.icon = a.icon?.value ?? manifest.icon;
          manifest.debuggable = a.debuggable?.value === true || a.debuggable?.value === 'true';
          manifest.allowBackup = a.allowBackup?.value;
          manifest.usesCleartextTraffic = a.usesCleartextTraffic?.value;
        } else if (el.name === 'activity' || el.name === 'activity-alias') {
          if (a.name?.value) manifest.activities.push(String(a.name.value));
        } else if (el.name === 'service') {
          if (a.name?.value) manifest.services.push(String(a.name.value));
        }
      }
    } catch {
      /* keep partial manifest */
    }
  }

  // Resolve string/icon resource references.
  const arscEntry = zip.getEntry('resources.arsc');
  let arsc = null;
  if (arscEntry) {
    try {
      arsc = arscEntry.getData();
    } catch {
      arsc = null;
    }
  }
  const resolveRef = (value) => {
    if (typeof value !== 'string' || !value.startsWith('@')) return value;
    if (arsc) {
      const hex = value.slice(1);
      const id = hex.startsWith('0x') ? parseInt(hex, 16) : /^\d+$/.test(hex) ? Number(hex) : NaN;
      if (Number.isFinite(id)) {
        try {
          return findResourceString(arsc, id) || null;
        } catch {
          return null;
        }
      }
    }
    return null;
  };

  if (manifest.label) manifest.label = resolveRef(manifest.label) || manifest.label;
  let iconPath = manifest.icon ? resolveRef(manifest.icon) : null;

  const nativeAbis = ABI_NAMES.filter((abi) => names.has(`lib/${abi}/`) || [...names].some((n) => n.startsWith(`lib/${abi}/`)));
  const dexFiles = [...names].filter((n) => /^classes\d*\.dex$/.test(n)).length;
  const hasPlayAssetDelivery = names.has('assetpack.json') || [...names].some((n) => n.endsWith('.apk') && !n.startsWith('lib/'));
  const size = fs.statSync(filePath).size;
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

  // Icon extraction ------------------------------------------------------
  let iconDataUrl = null;
  const iconCandidates = [];
  if (iconPath && !/\.xml$/i.test(iconPath)) iconCandidates.push(iconPath);
  iconCandidates.push(
    ...entries
      .filter((e) => /^res\/(mipmap|drawable)[^/]*\/.*\.(png|webp|jpg)$/i.test(e.entryName))
      .sort((a, b) => b.getData().length - a.getData().length)
      .slice(0, 4)
      .map((e) => e.entryName)
  );
  for (const candidate of iconCandidates) {
    const entry = zip.getEntry(candidate) || zip.getEntry(candidate.replace(/^\//, ''));
    if (entry && entry.getData) {
      try {
        const data = entry.getData();
        if (data.length > 64 && data.length < 2_000_000) {
          const mime = candidate.endsWith('.webp') ? 'image/webp' : 'image/png';
          iconDataUrl = `data:${mime};base64,${data.toString('base64')}`;
          iconPath = candidate;
          break;
        }
      } catch {
        /* ignore */
      }
    }
  }

  return {
    size,
    sha256,
    package: manifest.package || null,
    label: manifest.label || manifest.package || null,
    version: manifest.versionName ? String(manifest.versionName) : null,
    versionCode: manifest.versionCode != null ? String(manifest.versionCode) : null,
    minSdk: manifest.minSdk != null ? String(manifest.minSdk) : null,
    targetSdk: manifest.targetSdk != null ? String(manifest.targetSdk) : null,
    compileSdk: manifest.compileSdk || null,
    abis: nativeAbis.length ? nativeAbis : ['universal'],
    permissions: [...new Set(manifest.permissions)].slice(0, 60),
    activities: [...new Set(manifest.activities)].slice(0, 40),
    services: [...new Set(manifest.services)].slice(0, 40),
    features: [...new Set(manifest.features)].slice(0, 20),
    debuggable: !!manifest.debuggable,
    dexFiles,
    hasPlayAssetDelivery,
    icon: iconDataUrl,
    iconPath,
    mainActivity:
      manifest.activities.find((name) => /(MainActivity|Main|Launcher|UnityPlayerActivity)$/i.test(name)) ||
      manifest.activities[0] ||
      null,
  };
}

/** Compatibility report used by the UI before booting the runtime. */
export function compatibilityReport(info) {
  const notes = [];
  let score = 100;

  if (info.abis.includes('x86') || info.abis.includes('x86_64')) {
    notes.push({
      level: 'info',
      text: 'Contains x86 native libraries — the runtime will translate them via ARM translation.',
    });
  }
  if (info.abis.includes('arm64-v8a') && info.abis.includes('armeabi-v7a')) {
    notes.push({ level: 'good', text: 'Ships both 64-bit and 32-bit ARM libraries — great compatibility.' });
  }
  if (info.minSdk && Number(info.minSdk) >= 31) {
    notes.push({
      level: 'warn',
      text: `Requires Android ${info.minSdk}+ APIs. Some features may fall back to software rendering.`,
    });
    score -= 8;
  }
  if (info.size > 900 * 1024 * 1024) {
    notes.push({ level: 'warn', text: 'Over 900 MB — first boot will take a while to unpack.' });
    score -= 10;
  }
  if (info.hasPlayAssetDelivery && info.size < 20 * 1024 * 1024) {
    notes.push({
      level: 'warn',
      text: 'Looks like an App Bundle split — base APKs alone may be missing game assets.',
    });
    score -= 25;
  }
  if (info.permissions.includes('android.permission.INTERNET')) {
    notes.push({ level: 'info', text: 'Uses INTERNET — online accounts and matchmaking can work.' });
  }
  if (info.debuggable) {
    notes.push({ level: 'good', text: 'Debuggable build detected — you can attach adb and inspect logs.' });
  }
  if (!info.abis.length) {
    notes.push({ level: 'good', text: 'Pure Java/Kotlin app — the widest possible compatibility.' });
  }
  if (info.dexFiles > 2) {
    notes.push({ level: 'info', text: `${info.dexFiles} dex files — a large, feature-rich app.` });
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    verdict: score >= 85 ? 'Excellent' : score >= 60 ? 'Playable' : 'Best effort',
    notes,
  };
}

export function storeApk(buffer, originalName, userId) {
  const id = crypto.randomUUID();
  const safeName = path.basename(originalName || 'app.apk').replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'app.apk';
  const filePath = path.join(APK_DIR, `${id}.apk`);
  fs.writeFileSync(filePath, buffer);
  return { id, filePath, safeName };
}

export function apkPath(id) {
  return path.join(APK_DIR, `${id}.apk`);
}

export function deleteApkFile(id) {
  try {
    fs.unlinkSync(apkPath(id));
  } catch {
    /* already gone */
  }
}
