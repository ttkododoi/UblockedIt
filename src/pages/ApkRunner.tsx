import {
  AlertTriangle, ArrowLeft, CheckCircle2, Cloud, Download, Info, Loader2, Package, Play,
  RefreshCw, Server, Settings2, ShieldCheck, Smartphone, Terminal, Trash2, Upload, X, Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, fmt } from '../lib/api';
import { useApp } from '../lib/store';
import { EmptyState } from '../components/ui';

type ApkInfo = {
  id: string;
  filename: string;
  info: {
    package: string; label: string; version: string; versionCode: string;
    minSdk: string; targetSdk: string; size: number; sha256: string;
    abis: string[]; permissions: string[]; activities: string[]; services: string[];
    debuggable: boolean; dexFiles: number; icon: string | null; mainActivity: string | null;
  };
  report: { score: number; verdict: string; notes: { level: string; text: string }[] };
};

type LibraryApk = {
  id: string; filename: string; size: number; package: string; label: string; version: string;
  minSdk: string; abis: string[]; permissions: string[]; createdAt: string; icon: string;
};

type RuntimeStatus = {
  bridge: { configured: boolean; url: string; reachable: boolean; devices: any[] };
  cloud: { configured: boolean; device: string };
};

type Session =
  | { mode: 'embed'; provider: string; embedUrl: string; sessionId: string }
  | { mode: 'bridge'; provider: string; bridgeUrl: string; bridgeToken: string; remote: any; sessionId: string }
  | { mode: 'setup'; sessionId: string; apk: any; requirements: any };

/* --------------------------------------------------------------- modals */

function Shell({ title, sub, icon, onClose, children }: { title: string; sub?: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820 }}>
        <div className="player__head">
          {icon}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
            {sub && <div className="tiny muted">{sub}</div>}
          </div>
          <div className="spacer" />
          <button className="iconbtn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BridgePlayer({ session, onClose }: { session: Extract<Session, { mode: 'bridge' }>; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [mode, setMode] = useState<'connecting' | 'stream' | 'frames'>('connecting');
  const [error, setError] = useState('');
  const [fps, setFps] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const base = session.bridgeUrl.replace(/\/$/, '');
  const auth: Record<string, string> = session.bridgeToken ? { authorization: `Bearer ${session.bridgeToken}` } : {};
  const id = session.remote?.id;

  useEffect(() => {
    let cancelled = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let jmuxer: any = null;

    (async () => {
      try {
        const { default: JMuxer } = await import('jmuxer');
        if (cancelled || !videoRef.current) return;
        jmuxer = new JMuxer({ node: videoRef.current, mode: 'video', flushingTime: 0, fps: 30, debug: false, clearBuffer: true });
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
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'stream unavailable');
        setMode('frames');
      }
    })();

    return () => {
      cancelled = true;
      try { reader?.cancel(); } catch {}
      try { jmuxer?.destroy(); } catch {}
    };
  }, [id, base, reloadKey]);

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
          /* keep polling */
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
    <Shell
      title={session.remote?.package || 'Android device'}
      sub={`bridge · ${mode === 'frames' ? `${error ? 'screenshot mode' : 'fallback'} · ~1 fps` : `${fps} fps`}`}
      icon={<Smartphone size={16} style={{ color: 'var(--ink-2)' }} />}
      onClose={onClose}
    >
      <div style={{ display: 'grid', placeItems: 'center', padding: 16, background: 'var(--surface-2)' }}>
        <div
          style={{
            position: 'relative', aspectRatio: '9 / 16', height: 'min(70vh, 660px)', maxWidth: '100%',
            borderRadius: 18, overflow: 'hidden', border: '1px solid var(--line)', background: '#0a0a0f', cursor: 'crosshair',
          }}
          onClick={sendTap}
        >
          <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', display: mode === 'stream' ? 'block' : 'none' }} />
          {mode !== 'stream' && (
            <>
              <img ref={imgRef} alt="Device screen" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              {mode === 'connecting' && (
                <div className="loading-veil">
                  <div className="spinner" />
                  <div style={{ fontSize: 13 }}>Attaching to the device stream…</div>
                  <div className="mono tiny muted">adb screenrecord · h264</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="player__foot">
        <span className="tiny muted">Tap the screen to control Android.</span>
        <div className="spacer" />
        <button className="btn btn--sm btn--outline" onClick={() => sendKey(4)}><ArrowLeft size={13} /> Back</button>
        <button className="btn btn--sm btn--outline" onClick={() => sendKey(3)}>Home</button>
        <button className="btn btn--sm btn--outline" onClick={() => sendKey(187)}>Recents</button>
        <button className="btn btn--sm btn--ghost" onClick={() => { setMode('connecting'); setReloadKey((k) => k + 1); }}>
          <RefreshCw size={13} />
        </button>
      </div>
    </Shell>
  );
}

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
    <Shell title="Runtime setup" sub={`${session.apk.label} · ${session.apk.package}`} icon={<Package size={16} style={{ color: 'var(--ink-2)' }} />} onClose={onClose}>
      <div style={{ padding: 24, maxHeight: '74vh', overflowY: 'auto' }}>
        <div className="note" style={{ marginBottom: 18 }}>
          <Info />
          <div>
            Browsers cannot execute Android bytecode directly, so the runner needs a device to install into. Pick a path
            below — both are real installs, not a simulator skin.
          </div>
        </div>

        <div className="segmented" style={{ marginBottom: 18 }}>
          <button className={tab === 'bridge' ? 'is-active' : ''} onClick={() => setTab('bridge')}>Self-hosted bridge</button>
          <button className={tab === 'cloud' ? 'is-active' : ''} onClick={() => setTab('cloud')}>Cloud device</button>
          <button className={tab === 'local' ? 'is-active' : ''} onClick={() => setTab('local')}>Download APK</button>
        </div>

        {tab === 'bridge' && (
          <div className="stack">
            <p className="small muted" style={{ lineHeight: 1.7 }}>
              The bundled bridge installs your APK with adb and streams the device screen back here. Works with a
              USB-connected phone or any local Android emulator — no third-party service.
            </p>
            <label className="label" htmlFor="burl">Bridge URL</label>
            <input id="burl" className="field" placeholder="http://127.0.0.1:8099" value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} />
            <label className="label" htmlFor="btok">Shared token (optional)</label>
            <input id="btok" className="field" type="password" placeholder="APK_BRIDGE_TOKEN" value={bridgeToken} onChange={(e) => setBridgeToken(e.target.value)} />
            <pre className="code">{`# 1 · start an Android target
adb devices
# 2 · run the bundled bridge
node runtime/bridge/bridge.mjs
# 3 · point the hub at it
APK_BRIDGE_URL=http://127.0.0.1:8099 npm start`}</pre>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn--primary" disabled={!bridgeUrl || saving} onClick={save}>
                {saving ? <Loader2 size={14} className="spin" /> : <Zap size={14} />} Save &amp; launch
              </button>
              <span className="tiny muted mono">docs → runtime/bridge/README.md</span>
            </div>
          </div>
        )}

        {tab === 'cloud' && (
          <div className="stack">
            <p className="small muted" style={{ lineHeight: 1.7 }}>
              Already have an Appetize.io app key? Paste it and your APK launches on a managed Android device in the
              cloud — nothing to install locally.
            </p>
            <label className="label" htmlFor="akey">Appetize public key</label>
            <input id="akey" className="field" placeholder="a1b2c3d4e5f6…" value={appetizeKey} onChange={(e) => setAppetizeKey(e.target.value)} />
            <div className="note">
              <Cloud />
              <div>Generate a key in the Appetize dashboard, or set <span className="mono">APPETIZE_TOKEN</span> on the server and we upload automatically.</div>
            </div>
            <button className="btn btn--primary" disabled={!appetizeKey || saving} onClick={save} style={{ width: 'fit-content' }}>
              {saving ? <Loader2 size={14} className="spin" /> : <Cloud size={14} />} Save &amp; launch
            </button>
          </div>
        )}

        {tab === 'local' && (
          <div className="stack">
            <p className="small muted" style={{ lineHeight: 1.7 }}>
              Grab the inspected package and install it on any Android device the old-fashioned way. The manifest report
              tells you exactly what you’re installing.
            </p>
            <a className="btn btn--primary" href={`/api/apk/${session.apk.id}/download`} style={{ width: 'fit-content' }}>
              <Download size={15} /> Download {session.apk.label || 'APK'}
            </a>
            <div className="note note--warn">
              <AlertTriangle />
              <div>Only install packages you trust. You can delete your uploads at any time from the library.</div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ---------------------------------------------------------------- report */

function Report({ result }: { result: ApkInfo }) {
  const { info, report } = result;
  const tone = report.score >= 75 ? 'var(--green)' : report.score >= 45 ? 'var(--amber)' : 'var(--red-line)';

  return (
    <div className="card card--pad">
      <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
        <div style={{ width: 58, height: 58, borderRadius: 14, overflow: 'hidden', background: 'var(--surface-2)', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
          {info.icon ? (
            <img src={info.icon} alt="" width={58} height={58} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Package size={22} style={{ color: 'var(--ink-3)' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 20 }}>{info.label || result.filename}</h2>
          <div className="mono tiny muted" style={{ marginTop: 3, overflowWrap: 'anywhere' }}>{info.package}</div>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            <span className="pill">v{info.version}{info.versionCode ? ` (${info.versionCode})` : ''}</span>
            <span className="pill">min SDK {info.minSdk}</span>
            <span className="pill">{fmt.bytes(info.size)}</span>
            {info.debuggable && <span className="pill pill--amber">debuggable</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', color: tone }}>{report.score}</div>
          <div className="tiny muted">compatibility</div>
        </div>
      </div>

      <p className="small" style={{ marginTop: 16, color: 'var(--ink-2)', lineHeight: 1.6 }}>{report.verdict}</p>

      <div className="form-grid" style={{ marginTop: 18 }}>
        <div>
          <div className="label">ABIs</div>
          <div className="row wrap" style={{ gap: 6 }}>
            {info.abis.length ? info.abis.map((a) => <span className="tag" key={a}>{a}</span>) : <span className="small muted">Universal</span>}
          </div>
        </div>
        <div>
          <div className="label">DEX files · entry</div>
          <div className="small muted" style={{ lineHeight: 1.6 }}>
            {info.dexFiles} dex · {info.mainActivity || 'no launcher activity'}
          </div>
        </div>
      </div>

      <div className="label" style={{ marginTop: 16 }}>Permissions ({info.permissions.length})</div>
      <div className="row wrap" style={{ gap: 6, maxHeight: 96, overflowY: 'auto' }}>
        {info.permissions.slice(0, 24).map((p) => (
          <span className="tag" key={p}>{p.replace('android.permission.', '')}</span>
        ))}
      </div>

      {report.notes.length > 0 && (
        <div className="stack" style={{ gap: 8, marginTop: 18 }}>
          {report.notes.map((n, i) => (
            <div key={i} className={`note ${n.level === 'warn' ? 'note--warn' : ''}`}>
              {n.level === 'warn' ? <AlertTriangle /> : <Info />}
              <div>{n.text}</div>
            </div>
          ))}
        </div>
      )}

      <div className="note" style={{ marginTop: 14 }}>
        <ShieldCheck />
        <div>
          SHA-256 <span className="mono" style={{ overflowWrap: 'anywhere' }}>{info.sha256}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- main page */

export function ApkRunner() {
  const { user, toast } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as 'upload' | 'library') || 'upload';
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
      if (data.mode === 'setup') toast('Choose a runtime to install into.', 'info', 'One more step');
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

  const badge = status?.bridge.reachable
    ? { label: 'Bridge online', green: true }
    : status?.cloud.configured
    ? { label: 'Cloud ready', green: true }
    : { label: 'Runtime setup needed', green: false };

  return (
    <>
      <div className="row wrap row--between" style={{ alignItems: 'flex-end', marginBottom: 22 }}>
        <div>
          <h1 className="h2">APK runner</h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: '64ch' }}>
            Drop an APK and we parse the binary manifest, resolve the launcher icon, audit permissions and ABIs, then
            install it onto a real Android target that streams into this tab.
          </p>
        </div>
        <span className={`pill ${badge.green ? 'pill--green' : 'pill--amber'}`}>
          <span className="dot" /> {badge.label}
        </span>
      </div>

      <div className="segmented" style={{ marginBottom: 20 }}>
        <button className={tab === 'upload' ? 'is-active' : ''} onClick={() => setParams({ tab: 'upload' })}>Upload &amp; inspect</button>
        <button className={tab === 'library' ? 'is-active' : ''} onClick={() => setParams({ tab: 'library' })}>
          My installs{library.length ? ` · ${library.length}` : ''}
        </button>
      </div>

      <div className="split">
        <div className="stack">
          {tab === 'upload' && (
            <>
              {!user ? (
                <div className="card card--pad" style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <span className="dropzone__icon" style={{ margin: '0 auto 12px' }}><Package size={22} /></span>
                  <h2 style={{ fontSize: 20 }}>Sign in to use the runner</h2>
                  <p className="small muted" style={{ maxWidth: 380, margin: '8px auto 18px' }}>
                    APK uploads are private to your account and removable at any time. Accounts also keep your library
                    and themes in sync.
                  </p>
                  <div className="row" style={{ gap: 10, justifyContent: 'center' }}>
                    <Link to="/login" className="btn btn--primary btn--sm">Sign in</Link>
                    <Link to="/signup" className="btn btn--outline btn--sm">Create account</Link>
                  </div>
                </div>
              ) : (
                <div
                  className={`dropzone ${drag ? 'is-drag' : ''}`}
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
                >
                  {uploading ? (
                    <>
                      <span className="dropzone__icon"><Loader2 size={22} className="spin" /></span>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>Uploading and inspecting…</div>
                      <div className="progress"><span style={{ width: `${progress}%` }} /></div>
                      <div className="tiny muted mono">{progress}%</div>
                    </>
                  ) : (
                    <>
                      <span className="dropzone__icon"><Upload size={22} /></span>
                      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>Drop an APK here</div>
                      <p className="small muted" style={{ maxWidth: 380 }}>
                        Up to 250 MB. The manifest is parsed server-side, then the package is stored privately under your account.
                      </p>
                      <span className="btn btn--primary btn--sm" style={{ marginTop: 4 }}>Choose file</span>
                    </>
                  )}
                </div>
              )}
              <input ref={fileInput} type="file" accept=".apk" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />

              {result && (
                <>
                  <Report result={result} />
                  <div className="row wrap" style={{ gap: 8 }}>
                    <button className="btn btn--dark" onClick={() => launch(result.id)} disabled={busyId === result.id}>
                      {busyId === result.id ? <Loader2 size={14} className="spin" /> : <Play size={14} />} Launch on a device
                    </button>
                    <a className="btn btn--outline" href={`/api/apk/${result.id}/download`}>
                      <Download size={14} /> Signed download
                    </a>
                    <button className="btn btn--ghost" onClick={() => deleteApk(result.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </>
              )}

              {!result && !uploading && (
                <div className="card card--pad">
                  <h3 style={{ fontSize: 15 }}>What happens to your file</h3>
                  <div className="stack" style={{ gap: 14, marginTop: 14 }}>
                    {[
                      ['Upload', 'The package is streamed to this server and hashed.'],
                      ['Inspect', 'Binary AndroidManifest.xml and resources.arsc are parsed in Node.'],
                      ['Report', 'Permissions, ABIs, launcher activity and a compatibility score.'],
                      ['Install', 'adb install -r -g on a device you control, streamed back here.'],
                    ].map(([t, d], i) => (
                      <div key={t} className="row" style={{ gap: 11, alignItems: 'flex-start' }}>
                        <span className="step">{i + 1}</span>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 550 }}>{t}</div>
                          <div className="tiny muted">{d}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'library' && (
            <>
              {!user ? (
                <EmptyState icon={Package} title="Sign in to see your packages">
                  <Link to="/login" className="btn btn--sm btn--primary" style={{ marginTop: 14 }}>Sign in</Link>
                </EmptyState>
              ) : library.length === 0 ? (
                <EmptyState icon={Package} title="No installs yet">
                  Upload an APK and it shows up here with its inspector report.
                  <div style={{ marginTop: 14 }}>
                    <button className="btn btn--sm btn--primary" onClick={() => setParams({ tab: 'upload' })}>
                      <Upload size={13} /> Upload APK
                    </button>
                  </div>
                </EmptyState>
              ) : (
                library.map((a) => (
                  <div key={a.id} className="card" style={{ padding: 14 }}>
                    <div className="row" style={{ gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        {a.icon ? (
                          <img src={a.icon} alt="" width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Package size={20} style={{ color: 'var(--ink-3)' }} />
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.label || a.filename}</div>
                        <div className="mono tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.package} · {fmt.bytes(a.size)} · {fmt.ago(a.createdAt)}
                        </div>
                        <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                          {a.abis.slice(0, 2).map((x) => <span className="tag" key={x}>{x}</span>)}
                          <span className="tag">{a.permissions.length} perms</span>
                        </div>
                      </div>
                      <div className="row" style={{ gap: 7 }}>
                        <button className="btn btn--primary btn--sm" onClick={() => launch(a.id)} disabled={busyId === a.id}>
                          {busyId === a.id ? <Loader2 size={13} className="spin" /> : <Play size={13} />} Launch
                        </button>
                        <button className="iconbtn" onClick={() => deleteApk(a.id)} aria-label="Delete package"><Trash2 /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        <div className="stack">
          <div className="card card--pad">
            <div className="row row--between">
              <span className="eyebrow">Runtime</span>
              <button className="iconbtn" style={{ width: 26, height: 26 }} onClick={refreshStatus} aria-label="Refresh runtime">
                <RefreshCw size={13} />
              </button>
            </div>
            <div className="stack" style={{ gap: 10, marginTop: 14 }}>
              <div className="runtime-row">
                <Server size={15} style={{ color: status?.bridge.reachable ? 'var(--green)' : 'var(--ink-3)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 550 }}>Self-hosted bridge</div>
                  <div className="tiny muted">
                    {status?.bridge.reachable
                      ? `${status.bridge.devices.length} device(s) connected`
                      : status?.bridge.configured
                      ? 'configured · unreachable'
                      : 'not configured'}
                  </div>
                </div>
                <span className={`pill ${status?.bridge.reachable ? 'pill--green' : ''}`}>{status?.bridge.reachable ? 'online' : 'offline'}</span>
              </div>
              <div className="runtime-row">
                <Cloud size={15} style={{ color: status?.cloud.configured ? 'var(--green)' : 'var(--ink-3)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 550 }}>Cloud device</div>
                  <div className="tiny muted">{status?.cloud.configured ? `Appetize · ${status.cloud.device}` : 'add an Appetize key'}</div>
                </div>
                <span className={`pill ${status?.cloud.configured ? 'pill--green' : ''}`}>{status?.cloud.configured ? 'ready' : 'off'}</span>
              </div>
            </div>
            {!status?.bridge.reachable && !status?.cloud.configured && (
              <button className="btn btn--sm btn--outline" style={{ width: '100%', marginTop: 12 }} onClick={() => user && result && launch(result.id, 'bridge')}>
                <Settings2 size={13} /> Configure a runtime
              </button>
            )}
          </div>

          <div className="card card--pad">
            <span className="eyebrow row" style={{ gap: 6 }}><Terminal size={12} /> Bridge quickstart</span>
            <pre className="code" style={{ marginTop: 12 }}>{`adb devices
node runtime/bridge/bridge.mjs
APK_BRIDGE_URL=http://127.0.0.1:8099`}</pre>
          </div>

          <div className="note note--warn">
            <AlertTriangle />
            <div>
              Split bundles (XAPK / APKS) need their base APK plus config splits — the inspector flags them before you launch.
            </div>
          </div>
        </div>
      </div>

      {session?.mode === 'embed' && (
        <Shell title="Cloud Android device" icon={<Cloud size={16} style={{ color: 'var(--ink-2)' }} />} onClose={() => setSession(null)}>
          <div style={{ width: '100%', aspectRatio: '9/16', maxHeight: '76vh', background: '#000' }}>
            <iframe src={session.embedUrl} title="Cloud Android" style={{ width: '100%', height: '100%', border: 0 }} allow="clipboard-read; clipboard-write" />
          </div>
        </Shell>
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
    </>
  );
}
