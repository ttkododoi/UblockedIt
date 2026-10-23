import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Cpu,
  Download,
  HardDrive,
  Info,
  Layers,
  Loader2,
  Package,
  Play,
  Plus,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  Smartphone,
  Terminal,
  Trash2,
  Upload,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../lib/api';
import { useApp } from '../lib/store';

type ApkInfo = {
  id: string;
  filename: string;
  info: {
    package: string;
    label: string;
    version: string;
    versionCode: string;
    minSdk: string;
    targetSdk: string;
    size: number;
    sha256: string;
    abis: string[];
    permissions: string[];
    activities: string[];
    services: string[];
    debuggable: boolean;
    dexFiles: number;
    icon: string | null;
    mainActivity: string | null;
  };
  report: { score: number; verdict: string; notes: { level: string; text: string }[] };
};

type LibraryApk = {
  id: string;
  filename: string;
  size: number;
  package: string;
  label: string;
  version: string;
  minSdk: string;
  abis: string[];
  permissions: string[];
  createdAt: string;
  icon: string;
};

type RuntimeStatus = {
  bridge: { configured: boolean; url: string; reachable: boolean; devices: any[] };
  cloud: { configured: boolean; device: string };
};

type Session =
  | { mode: 'embed'; provider: string; embedUrl: string; sessionId: string }
  | { mode: 'bridge'; provider: string; bridgeUrl: string; bridgeToken: string; remote: any; sessionId: string }
  | { mode: 'setup'; sessionId: string; apk: any; requirements: any };

/* ------------------------------------------------------------------ */
/* Bridge stream player                                                */
/* ------------------------------------------------------------------ */

function BridgePlayer({ session, onClose }: { session: Extract<Session, { mode: 'bridge' }>; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [mode, setMode] = useState<'connecting' | 'stream' | 'frames' | 'error'>('connecting');
  const [error, setError] = useState('');
  const [fps, setFps] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const base = session.bridgeUrl.replace(/\/$/, '');
  const auth = session.bridgeToken ? { authorization: `Bearer ${session.bridgeToken}` } : {};
  const id = session.remote?.id;

  useEffect(() => {
    let cancelled = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let jmuxer: any = null;

    (async () => {
      try {
        const { default: JMuxer } = await import('jmuxer');
        if (cancelled || !videoRef.current) return;
        jmuxer = new JMuxer({
          node: videoRef.current,
          mode: 'video',
          flushingTime: 0,
          fps: 30,
          debug: false,
          clearBuffer: true,
        });
        const res = await fetch(`${base}/sessions/${id}/stream`, { headers: auth });
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
        setMode('stream');
        reader = res.body.getReader();
        let last = performance.now();
        let frames = 0;
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            jmuxer.feed({ video: value });
            frames++;
            const now = performance.now();
            if (now - last > 1000) {
              setFps(Math.round((frames * 1000) / (now - last)));
              frames = 0;
              last = now;
            }
          }
        }
        if (!cancelled) setMode('frames');
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'stream unavailable');
        setMode('frames');
      }
    })();

    return () => {
      cancelled = true;
      try {
        reader?.cancel();
      } catch {}
      try {
        jmuxer?.destroy();
      } catch {}
    };
  }, [id, base, reloadKey]);

  // JPEG polling fallback
  useEffect(() => {
    if (mode !== 'frames' || !id) return;
    let stop = false;
    let url: string | null = null;
    const tick = async () => {
      while (!stop) {
        try {
          const res = await fetch(`${base}/sessions/${id}/frame.jpg?t=${Date.now()}`, { headers: auth });
          if (res.ok) {
            const blob = await res.blob();
            if (imgRef.current) {
              if (url) URL.revokeObjectURL(url);
              url = URL.createObjectURL(blob);
              imgRef.current.src = url;
            }
          }
        } catch {
          /* keep trying */
        }
        await new Promise((r) => setTimeout(r, 850));
      }
    };
    tick();
    return () => {
      stop = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [mode, id, base]);

  const sendTap = async (e: React.MouseEvent) => {
    const el = (mode === 'stream' ? videoRef.current : imgRef.current) as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // screenrecord is captured at 720x1280; map through the letterbox
    const sx = (e.clientX - r.left) / r.width;
    const sy = (e.clientY - r.top) / r.height;
    await fetch(`${base}/sessions/${id}/touch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ type: 'tap', x: Math.round(sx * 720), y: Math.round(sy * 1280) }),
    }).catch(() => {});
  };

  const sendKey = (code: number) =>
    fetch(`${base}/sessions/${id}/key`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ code }),
    }).catch(() => {});

  return (
    <div className="overlay" onClick={onClose}>
      <motion.div
        className="player-shell"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 980 }}
      >
        <div className="player-head">
          <Smartphone size={16} style={{ color: 'var(--accent-2)' }} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{session.remote?.package || 'Android device'}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              bridge · {mode === 'frames' ? `${error ? 'screenshot mode' : 'fallback'} · ~1 fps` : `${fps} fps`}
            </div>
          </div>
          <div className="spacer" />
          <span className={`badge ${mode === 'error' ? '' : 'badge-live'}`}>
            <span className="dot" />
            {mode === 'connecting' ? 'Connecting' : mode === 'frames' ? 'Screenshots' : 'Live'}
          </span>
          <button className="icon-btn" onClick={() => sendKey(4)} title="Back">
            <ArrowLeft />
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              setMode('connecting');
              setReloadKey((k) => k + 1);
            }}
            title="Reload stream"
          >
            <RefreshCw />
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            background: '#000',
            padding: 12,
            maxHeight: 'calc(100vh - 140px)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'relative',
              aspectRatio: '9 / 16',
              height: 'min(74vh, 720px)',
              maxWidth: '100%',
              borderRadius: 18,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,.12)',
              background: '#0a0a12',
              cursor: 'crosshair',
            }}
            onClick={sendTap}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: mode === 'stream' ? 'block' : 'none' }}
            />
            {mode !== 'stream' && (
              <>
                <img ref={imgRef} alt="Device screen" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                {mode === 'connecting' && (
                  <div className="player-loading" style={{ background: '#0a0a12' }}>
                    <div className="loader-ring" />
                    <div style={{ fontSize: 13 }}>Attaching to the device stream…</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>adb screenrecord · h264</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="player-head" style={{ borderTop: '1px solid var(--line)', borderBottom: 0 }}>
          <span className="small muted">Click the screen to tap. Use the back button above to navigate Android.</span>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={() => sendKey(3)}>Home</button>
          <button className="btn btn-sm" onClick={() => sendKey(187)}>Recents</button>
          <button className="btn btn-sm" onClick={() => sendKey(26)}>Power</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Runtime setup panel                                                 */
/* ------------------------------------------------------------------ */

function SetupPanel({ session, onClose, onConfigured }: { session: Extract<Session, { mode: 'setup' }>; onClose: () => void; onConfigured: () => void }) {
  const { toast } = useApp();
  const [tab, setTab] = useState<'bridge' | 'cloud' | 'local'>('bridge');
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [bridgeToken, setBridgeToken] = useState('');
  const [appetizeKey, setAppetizeKey] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/api/apk/runtime/config', {
        ...(tab === 'bridge' ? { bridgeUrl, bridgeToken } : {}),
        ...(tab === 'cloud' ? { appetizeKey } : {}),
      });
      toast('Runtime connected. Launching your APK…', 'success');
      onConfigured();
    } catch (e: any) {
      toast(e.message || 'Could not save the runtime config.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <motion.div
        className="player-shell"
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 760 }}
      >
        <div className="player-head">
          <Package size={16} style={{ color: 'var(--accent-2)' }} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Runtime setup</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{session.apk.label} · {session.apk.package}</div>
          </div>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div style={{ padding: 22, overflowY: 'auto' }}>
          <div className="note" style={{ marginBottom: 18 }}>
            <Info />
            <div>
              Browsers cannot execute Android bytecode directly, so the runner needs a device to install into. Pick a
              path below — both are real installs, not a simulator skin.
            </div>
          </div>

          <div className="tabs" style={{ marginBottom: 18 }}>
            <button className={tab === 'bridge' ? 'active' : ''} onClick={() => setTab('bridge')}>Self-hosted bridge</button>
            <button className={tab === 'cloud' ? 'active' : ''} onClick={() => setTab('cloud')}>Cloud device</button>
            <button className={tab === 'local' ? 'active' : ''} onClick={() => setTab('local')}>Download APK</button>
          </div>

          {tab === 'bridge' && (
            <div className="stack">
              <p className="small muted" style={{ lineHeight: 1.7 }}>
                The bundled bridge installs your APK with adb and streams the device screen back here. Works with a
                USB-connected phone or any local Android emulator — no third-party service.
              </p>
              <div className="field">
                <label>Bridge URL</label>
                <input className="input" placeholder="http://127.0.0.1:8099" value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} />
              </div>
              <div className="field">
                <label>Shared token (optional)</label>
                <input className="input" type="password" placeholder="APK_BRIDGE_TOKEN" value={bridgeToken} onChange={(e) => setBridgeToken(e.target.value)} />
              </div>
              <div className="note" style={{ fontFamily: 'var(--mono)', fontSize: 11.5, display: 'block', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
{`# 1 · start an Android target
adb devices
# 2 · run the bundled bridge
node runtime/bridge/bridge.mjs
# 3 · point the hub at it
APK_BRIDGE_URL=http://127.0.0.1:8099 npm start`}
              </div>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-primary" disabled={!bridgeUrl || saving} onClick={save}>
                  {saving ? <Loader2 size={14} className="spin" /> : <Zap size={14} />} Save & launch
                </button>
                <span className="small muted mono" style={{ fontSize: 11 }}>
                  docs → runtime/bridge/README.md
                </span>
              </div>
            </div>
          )}

          {tab === 'cloud' && (
            <div className="stack">
              <p className="small muted" style={{ lineHeight: 1.7 }}>
                Already have an Appetize.io app key? Paste it and your APK launches on a managed Android device in the
                cloud — nothing to install locally.
              </p>
              <div className="field">
                <label>Appetize public key</label>
                <input className="input" placeholder="a1b2c3d4e5f6…" value={appetizeKey} onChange={(e) => setAppetizeKey(e.target.value)} />
              </div>
              <div className="note">
                <Cloud />
                <div>
                  You can generate a key from the Appetize dashboard after uploading an APK, or set
                  <span className="mono"> APPETIZE_TOKEN </span> on the server and we will upload automatically.
                </div>
              </div>
              <button className="btn btn-primary" disabled={!appetizeKey || saving} onClick={save}>
                {saving ? <Loader2 size={14} /> : <Cloud size={14} />} Save & launch
              </button>
            </div>
          )}

          {tab === 'local' && (
            <div className="stack">
              <p className="small muted" style={{ lineHeight: 1.7 }}>
                Grab the inspected package and install it on any Android device the old-fashioned way. The manifest
                report on the previous screen tells you exactly what you’re installing.
              </p>
              <a className="btn btn-primary" href={`/api/apk/${session.apk.id}/download`} style={{ width: 'fit-content' }}>
                <Download size={15} /> Download {session.apk.label || 'APK'}
              </a>
              <div className="note warn">
                <AlertTriangle />
                <div>Only install packages you trust. You can revoke access to your uploaded APKs at any time from the library below.</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export function ApkRunner() {
  const { user, toast } = useApp();
  const [tab, setTab] = useState<'upload' | 'library'>('upload');
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ApkInfo | null>(null);
  const [library, setLibrary] = useState<LibraryApk[]>([]);
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refreshLibrary = useCallback(() => {
    if (!user) return;
    api.get<LibraryApk[]>('/api/apk').then(setLibrary).catch(() => {});
  }, [user]);

  const refreshStatus = useCallback(() => {
    api.get<RuntimeStatus>('/api/apk/runtime/status').then(setStatus).catch(() => {});
  }, []);

  useEffect(() => {
    refreshLibrary();
    refreshStatus();
  }, [refreshLibrary, refreshStatus]);

  const upload = async (file: File) => {
    if (!user) {
      toast('Sign in first — uploads are tied to your account.', 'error', 'Account required');
      return;
    }
    if (!/\.apk$/i.test(file.name)) {
      toast('That is not an .apk file.', 'error');
      return;
    }
    setUploading(true);
    setProgress(0);
    setResult(null);
    try {
      const data = await api.upload<ApkInfo>('/api/apk', file, 'apk', setProgress);
      setResult(data);
      refreshLibrary();
      toast('Package inspected and stored securely.', 'success', 'APK ready');
    } catch (e: any) {
      toast(e.message || 'Upload failed.', 'error', 'Could not read APK');
    } finally {
      setUploading(false);
    }
  };

  const launch = async (apkId: string, mode: string = 'auto') => {
    setBusyId(apkId);
    try {
      const data = await api.post<Session>(`/api/apk/${apkId}/session`, { mode });
      setSession(data);
      if (data.mode === 'setup') {
        toast('Choose a runtime to install into.', 'info', 'One more step');
      }
      refreshStatus();
    } catch (e: any) {
      toast(e.message || 'Could not start a device session.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const deleteApk = async (id: string) => {
    try {
      await api.del(`/api/apk/${id}`);
      setLibrary((l) => l.filter((a) => a.id !== id));
      if (result?.id === id) setResult(null);
      toast('Package deleted from your library.');
    } catch {
      toast('Could not delete that package.', 'error');
    }
  };

  const runtimeBadge = status?.bridge.reachable
    ? { label: 'Bridge online', cls: 'badge-live', icon: Wifi }
    : status?.cloud.configured
    ? { label: 'Cloud ready', cls: 'badge-live', icon: Cloud }
    : { label: 'Runtime setup needed', cls: '', icon: Settings2 };

  return (
    <div className="page">
      <div className="eyebrow"><Package size={12} /> APK runner</div>
      <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(30px,4.2vw,48px)', letterSpacing: '-0.045em' }}>
            Sideload <span className="grad-text">anything</span>
          </h1>
          <p className="muted" style={{ marginTop: 8, maxWidth: '64ch', fontSize: 14 }}>
            Drop an APK and we parse the binary manifest, resolve the launcher icon, audit permissions and ABIs, then
            install it onto a real Android target that streams straight into this tab.
          </p>
        </div>
        <span className={`badge ${runtimeBadge.cls}`}><runtimeBadge.icon size={11} /> {runtimeBadge.label}</span>
      </div>

      <div className="tabs" style={{ marginTop: 24 }}>
        <button className={tab === 'upload' ? 'active' : ''} onClick={() => setTab('upload')}>Upload & inspect</button>
        <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>
          My installs {library.length ? `· ${library.length}` : ''}
        </button>
      </div>

      <div className="split-2" style={{ marginTop: 20 }}>
        <div className="stack">
          {tab === 'upload' && (
            <>
              {!user ? (
                <div className="card" style={{ padding: 30, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
                  <h2 style={{ fontSize: 20 }}>Sign in to use the runner</h2>
                  <p className="small muted" style={{ maxWidth: 380, margin: '8px auto 18px' }}>
                    APK uploads are private to your account and removable at any time. Accounts also keep your game
                    library and themes in sync.
                  </p>
                  <div className="row" style={{ gap: 10, justifyContent: 'center' }}>
                    <Link to="/login" className="btn btn-primary">Sign in</Link>
                    <Link to="/signup" className="btn">Create account</Link>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`dropzone ${drag ? 'drag' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDrag(true);
                    }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDrag(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) upload(f);
                    }}
                    onClick={() => fileInput.current?.click()}
                  >
                    <div className="drop-icon">
                      {uploading ? <Loader2 size={26} className="spin" /> : <Upload size={26} />}
                    </div>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 18 }}>
                      {uploading ? `Uploading ${progress}%` : 'Drop your .apk here'}
                    </div>
                    <p className="small muted" style={{ margin: '6px auto 0', maxWidth: 360 }}>
                      {uploading
                        ? 'Hashing and reading the binary manifest…'
                        : 'Single APK up to 1.5 GB. Files are stored privately on this server and only streamed to a device you launch.'}
                    </p>
                    {uploading && (
                      <div className="progress" style={{ maxWidth: 320, margin: '18px auto 0' }}>
                        <span style={{ width: `${progress}%` }} />
                      </div>
                    )}
                    {!uploading && (
                      <div className="row" style={{ gap: 8, justifyContent: 'center', marginTop: 18 }}>
                        <span className="btn btn-primary btn-sm"><Plus size={13} /> Choose file</span>
                        <span className="badge">.apk</span>
                        <span className="badge">max 1.5 GB</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".apk,application/vnd.android.package-archive"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(f);
                      e.target.value = '';
                    }}
                  />
                </>
              )}

              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="card"
                    style={{ padding: 22 }}
                  >
                    <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: 62,
                          height: 62,
                          borderRadius: 16,
                          overflow: 'hidden',
                          border: '1px solid var(--line-strong)',
                          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 26,
                          flexShrink: 0,
                        }}
                      >
                        {result.info.icon ? (
                          <img src={result.info.icon} alt="app icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          '📦'
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 19, fontWeight: 600 }}>
                          {result.info.label || result.filename}
                        </div>
                        <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                          {result.info.package}
                        </div>
                        <div className="pill-row" style={{ marginTop: 8 }}>
                          <span className="badge">{result.info.version ? `v${result.info.version}` : 'version ?'}</span>
                          <span className="badge">minSdk {result.info.minSdk || '?'}</span>
                          <span className="badge">target {result.info.targetSdk || '?'}</span>
                          <span className="badge">{fmt.bytes(result.info.size)}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            background: `conic-gradient(var(--accent) ${result.report.score * 3.6}deg, color-mix(in srgb, var(--text) 8%, transparent) 0)`,
                          }}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              background: 'var(--bg-elevated)',
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {result.report.score}
                          </div>
                        </div>
                        <div className="small muted" style={{ marginTop: 4 }}>{result.report.verdict}</div>
                      </div>
                    </div>

                    <div className="hairline" />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
                      <div>
                        <div className="eyebrow" style={{ fontSize: 9 }}>Native ABIs</div>
                        <div className="stack" style={{ gap: 3, marginTop: 6 }}>
                          {result.info.abis.map((a) => (
                            <span key={a} className="mono" style={{ fontSize: 11.5 }}>{a}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="eyebrow" style={{ fontSize: 9 }}>Dex files</div>
                        <div className="mono" style={{ fontSize: 11.5, marginTop: 6 }}>{result.info.dexFiles} compiled</div>
                        <div className="eyebrow" style={{ fontSize: 9, marginTop: 10 }}>Debug</div>
                        <div className="mono" style={{ fontSize: 11.5, marginTop: 6 }}>{result.info.debuggable ? 'Yes' : 'No'}</div>
                      </div>
                      <div>
                        <div className="eyebrow" style={{ fontSize: 9 }}>SHA-256</div>
                        <div className="mono" style={{ fontSize: 10.5, marginTop: 6, wordBreak: 'break-all', color: 'var(--muted)' }}>
                          {result.info.sha256}
                        </div>
                      </div>
                    </div>

                    <div className="hairline" />

                    <div className="eyebrow" style={{ marginBottom: 8 }}>Permissions · {result.info.permissions.length}</div>
                    <div className="pill-row" style={{ maxHeight: 92, overflowY: 'auto' }}>
                      {result.info.permissions.slice(0, 24).map((p) => (
                        <span className="tag" key={p}>{p.replace('android.permission.', '')}</span>
                      ))}
                      {result.info.permissions.length === 0 && <span className="small muted">None declared — unusual but valid.</span>}
                    </div>

                    <div className="stack" style={{ marginTop: 16, gap: 8 }}>
                      {result.report.notes.map((n, i) => (
                        <div key={i} className={`note ${n.level === 'good' ? 'good' : n.level === 'warn' ? 'warn' : ''}`}>
                          {n.level === 'good' ? <CheckCircle2 /> : n.level === 'warn' ? <AlertTriangle /> : <Info />}
                          <div>{n.text}</div>
                        </div>
                      ))}
                    </div>

                    <div className="row wrap" style={{ gap: 10, marginTop: 18 }}>
                      <button className="btn btn-primary" disabled={busyId === result.id} onClick={() => launch(result.id)}>
                        {busyId === result.id ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
                        Launch on device
                      </button>
                      <a className="btn" href={`/api/apk/${result.id}/download`}>
                        <Download size={15} /> Download
                      </a>
                      <button className="btn btn-ghost" onClick={() => deleteApk(result.id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                      <div className="spacer" />
                      <span className="small muted row" style={{ gap: 6 }}><ShieldCheck size={13} /> Private to your account</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!result && !uploading && user && (
                <div className="card" style={{ padding: 22 }}>
                  <div className="eyebrow">What the inspector digs up</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginTop: 14 }}>
                    {[
                      { icon: Layers, t: 'Binary manifest', d: 'Package, version, SDK range' },
                      { icon: Smartphone, t: 'Launcher icon', d: 'Resolved from resources.arsc' },
                      { icon: Cpu, t: 'ABIs & dex', d: 'Native architecture audit' },
                      { icon: ShieldCheck, t: 'Permissions', d: 'Exactly what it asks for' },
                    ].map((f) => (
                      <div key={f.t} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                        <f.icon size={16} style={{ color: 'var(--accent-2)', marginTop: 3, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 550 }}>{f.t}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{f.d}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'library' && (
            <div className="stack">
              {!user ? (
                <div className="empty">
                  <div className="big">📦</div>
                  Sign in to see your uploaded packages.
                  <div style={{ marginTop: 14 }}>
                    <Link to="/login" className="btn btn-primary btn-sm">Sign in</Link>
                  </div>
                </div>
              ) : library.length === 0 ? (
                <div className="empty">
                  <div className="big">🗂️</div>
                  <div style={{ color: 'var(--text)', fontFamily: 'var(--display)', fontWeight: 600 }}>No installs yet</div>
                  <p className="small" style={{ marginTop: 6 }}>Upload an APK and it shows up here with its inspector report.</p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={() => setTab('upload')}>
                    <Upload size={13} /> Upload APK
                  </button>
                </div>
              ) : (
                library.map((a) => (
                  <div key={a.id} className="card" style={{ padding: 14 }}>
                    <div className="row" style={{ gap: 12 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 13,
                          overflow: 'hidden',
                          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={a.icon}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.label || a.filename}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.package} · {fmt.bytes(a.size)} · {fmt.ago(a.createdAt)}
                        </div>
                        <div className="pill-row" style={{ marginTop: 6 }}>
                          {a.abis.slice(0, 2).map((x) => (
                            <span className="tag" key={x}>{x}</span>
                          ))}
                          <span className="tag">{a.permissions.length} perms</span>
                        </div>
                      </div>
                      <div className="row" style={{ gap: 7 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => launch(a.id)} disabled={busyId === a.id}>
                          {busyId === a.id ? <Loader2 size={13} className="spin" /> : <Play size={13} />} Launch
                        </button>
                        <button className="icon-btn" onClick={() => deleteApk(a.id)} aria-label="Delete">
                          <Trash2 />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card" style={{ padding: 20 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="eyebrow">Runtime</div>
              <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={refreshStatus} aria-label="Refresh">
                <RefreshCw style={{ width: 13, height: 13 }} />
              </button>
            </div>
            <div className="stack" style={{ gap: 10, marginTop: 14 }}>
              <div className="row" style={{ gap: 10, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--line)' }}>
                <Server size={15} style={{ color: status?.bridge.reachable ? '#4ade80' : 'var(--muted)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 550 }}>Self-hosted bridge</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {status?.bridge.reachable
                      ? `${status.bridge.devices.length} device(s) connected`
                      : status?.bridge.configured
                      ? 'configured · unreachable'
                      : 'not configured'}
                  </div>
                </div>
                <span className={`badge ${status?.bridge.reachable ? 'badge-live' : ''}`}>
                  {status?.bridge.reachable ? 'online' : 'offline'}
                </span>
              </div>
              <div className="row" style={{ gap: 10, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--line)' }}>
                <Cloud size={15} style={{ color: status?.cloud.configured ? '#4ade80' : 'var(--muted)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 550 }}>Cloud device</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {status?.cloud.configured ? `Appetize · ${status.cloud.device}` : 'add an Appetize key'}
                  </div>
                </div>
                <span className={`badge ${status?.cloud.configured ? 'badge-live' : ''}`}>
                  {status?.cloud.configured ? 'ready' : 'off'}
                </span>
              </div>
            </div>
            {!status?.bridge.reachable && !status?.cloud.configured && (
              <button className="btn btn-sm" style={{ width: '100%', marginTop: 12 }} onClick={() => user && result && launch(result.id, 'bridge')}>
                <Settings2 size={13} /> Configure a runtime
              </button>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow">The pipeline</div>
            <div className="stack" style={{ gap: 14, marginTop: 14 }}>
              {[
                ['Upload', 'Package streamed and hashed server-side'],
                ['Inspect', 'Binary XML + resources.arsc parsed'],
                ['Install', 'adb install -r -g on a real device'],
                ['Stream', 'H.264 screen + touch events in-browser'],
              ].map(([t, d], i) => (
                <div key={t} className="row" style={{ gap: 11, alignItems: 'flex-start' }}>
                  <span
                    className="mono"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 10,
                      background: 'color-mix(in srgb, var(--accent) 18%, transparent)',
                      color: 'var(--accent-2)',
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 550 }}>{t}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="note">
            <Info />
            <div>
              Split APK bundles (XAPK/APKS from an app store) need their base APK plus config splits. The inspector flags
              them before you launch.
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {session?.mode === 'embed' && (
          <div className="overlay" onClick={() => setSession(null)}>
            <motion.div className="player-shell" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()}>
              <div className="player-head">
                <Cloud size={16} style={{ color: 'var(--accent-2)' }} />
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Cloud Android device</div>
                <div className="spacer" />
                <button className="icon-btn" onClick={() => setSession(null)} aria-label="Close"><X /></button>
              </div>
              <div style={{ width: '100%', aspectRatio: '9/16', maxHeight: '78vh', background: '#000' }}>
                <iframe src={session.embedUrl} title="Cloud Android" style={{ width: '100%', height: '100%', border: 0 }} allow="clipboard-read; clipboard-write" />
              </div>
            </motion.div>
          </div>
        )}
        {session?.mode === 'bridge' && <BridgePlayer session={session} onClose={() => setSession(null)} />}
        {session?.mode === 'setup' && (
          <SetupPanel
            session={session}
            onClose={() => setSession(null)}
            onConfigured={async () => {
              const apkId = session.apk.id;
              setSession(null);
              await launch(apkId, 'auto');
            }}
          />
        )}
      </AnimatePresence>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
