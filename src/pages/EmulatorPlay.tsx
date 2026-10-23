import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  Cpu,
  Expand,
  FileArchive,
  Gamepad2,
  HardDrive,
  Info,
  Keyboard,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCatalog, type Emulator } from '../lib/catalog';
import { useApp } from '../lib/store';
import { fmt } from '../lib/api';

const EJS_DATA = 'https://cdn.emulatorjs.org/stable/data/';

export function EmulatorPlay() {
  const { id } = useParams();
  const { catalog, loading } = useCatalog();
  const { toast } = useApp();
  const navigate = useNavigate();
  const emu: Emulator | undefined = catalog?.emulators.find((e) => e.id === id);

  const [romName, setRomName] = useState<string | null>(null);
  const [romUrl, setRomUrl] = useState<string | null>(null);
  const [biosName, setBiosName] = useState<string | null>(null);
  const [biosUrl, setBiosUrl] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [started, setStarted] = useState(false);
  const romInput = useRef<HTMLInputElement>(null);
  const biosInput = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const objectUrls = useRef<string[]>([]);

  // cleanup object URLs + emulator DOM on unmount / rom change
  useEffect(() => {
    return () => {
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrls.current = [];
    };
  }, []);

  const resetStage = () => {
    const holder = playerRef.current;
    if (holder) holder.innerHTML = '';
    const w = window as any;
    ['EJS_player', 'EJS_core', 'EJS_gameUrl', 'EJS_gameName', 'EJS_biosUrl', 'EJS_pathtodata', 'EJS_startOnLoaded', 'EJS_color', 'EJS_backgroundColor', 'EJS_volume', 'EJS_defaultOptions', 'EJS_lang', 'EJS_Buttons', 'EJS_gameParentUrl'].forEach(
      (k) => delete w[k]
    );
    document.querySelectorAll('script[src*="emulatorjs"], script[data-ejs]').forEach((s) => s.remove());
  };

  useEffect(() => {
    return () => resetStage();
  }, [id]);

  const handleRom = (file: File | undefined | null) => {
    if (!file || !emu) return;
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (emu.extensions.length && !emu.extensions.includes(ext)) {
      toast(`${ext} is not a typical ${emu.short} file — trying anyway.`, 'info', 'Heads up');
    }
    if (file.size > 512 * 1024 * 1024) {
      setError('That ROM is over 512 MB — too large to load in a browser tab.');
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    setRomName(file.name);
    setRomUrl(url);
    setStarted(false);
  };

  const handleBios = (file: File | undefined | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    setBiosName(file.name);
    setBiosUrl(url);
  };

  const boot = () => {
    if (!emu || !romUrl || !playerRef.current) return;
    if (emu.bios && !biosUrl) {
      toast(`This core may need a BIOS file (${emu.short}) for some games.`, 'info');
    }
    setBooting(true);
    setStarted(true);
    setError(null);
    const holder = playerRef.current;
    holder.innerHTML = '';
    if (!holder.id) holder.id = 'emulator-stage-' + emu.id;
    const w = window as any;
    w.EJS_player = '#' + holder.id;
    w.EJS_core = emu.core;
    w.EJS_gameUrl = romUrl;
    w.EJS_gameName = romName?.replace(/\.[^.]+$/, '') || emu.short;
    w.EJS_pathtodata = EJS_DATA;
    w.EJS_startOnLoaded = true;
    w.EJS_lang = 'en';
    w.EJS_color = '#7c5cff';
    w.EJS_backgroundColor = '#000000';
    w.EJS_volume = volume;
    w.EJS_Buttons = {
      playPause: true,
      restart: true,
      mute: true,
      settings: true,
      fullscreen: true,
      saveState: true,
      loadState: true,
      screenRecord: false,
      gamepad: true,
      cheat: true,
      volume: true,
    };
    if (biosUrl) w.EJS_biosUrl = biosUrl;

    const script = document.createElement('script');
    script.src = EJS_DATA + 'loader.js';
    script.async = true;
    script.dataset.ejs = 'true';
    script.onerror = () => {
      setBooting(false);
      const message = 'The emulator runtime could not be downloaded. Check your connection or any blocker extensions, then retry.';
      setError(message);
      toast(message, 'error', 'Runtime blocked');
    };
    script.onload = () => {
      setTimeout(() => setBooting(false), 1800);
    };
    document.body.appendChild(script);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 380, borderRadius: 28 }} />
      </div>
    );
  }

  if (!emu) {
    return (
      <div className="page">
        <div className="empty">
          <div className="big">🕹️</div>
          <h2>Unknown console</h2>
          <Link to="/emulators" className="btn btn-primary" style={{ marginTop: 14 }}>
            <ArrowLeft size={14} /> All emulators
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back
      </button>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 }}>
        <div className="emu-icon" style={{ ['--emu-color' as any]: emu.color, margin: 0, width: 52, height: 52, fontSize: 24 }}>
          {emu.icon}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ fontSize: 'clamp(24px,3.4vw,36px)', letterSpacing: '-0.04em' }}>{emu.name}</h1>
          <div className="row wrap" style={{ gap: 8, marginTop: 6 }}>
            <span className="badge">{emu.short}</span>
            <span className="badge">{emu.years}</span>
            <span className="badge mono">core: {emu.core}</span>
            {emu.bios && <span className="badge badge-accent">BIOS supported</span>}
            {emu.heavy && <span className="badge">Heavy core</span>}
          </div>
          <p className="muted small" style={{ marginTop: 8, maxWidth: '64ch' }}>{emu.blurb}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: started ? '1fr' : 'minmax(0,1.5fr) minmax(0,1fr)', gap: 20 }}>
        <div>
          <div
            className={`stage ${started ? 'stage-live' : ''}`}
            style={{ aspectRatio: started ? '16/10' : '16/10', position: 'relative' }}
            ref={stageRef}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              handleRom(e.dataTransfer.files?.[0]);
            }}
          >
            <div ref={playerRef} style={{ width: '100%', height: '100%' }} />
            {!started && (
              <div
                className="flex-center"
                style={{
                  position: 'absolute',
                  inset: 0,
                  flexDirection: 'column',
                  gap: 12,
                  background:
                    'radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 65%), #05050a',
                  padding: 24,
                  textAlign: 'center',
                  border: drag ? '1.5px dashed var(--accent)' : '1.5px dashed transparent',
                }}
              >
                <div style={{ fontSize: 40, opacity: 0.9 }}>{emu.icon}</div>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 18 }}>
                  {romName ? romName : `Load a ${emu.short} ROM to begin`}
                </div>
                <div className="small muted" style={{ maxWidth: 380 }}>
                  {romName
                    ? 'Ready when you are. Your ROM is only in this tab — nothing is uploaded.'
                    : `Accepted: ${emu.extensions.join(' · ')}`}
                </div>
                <div className="row wrap" style={{ gap: 9, justifyContent: 'center', marginTop: 6 }}>
                  <button className="btn btn-primary" onClick={() => romInput.current?.click()}>
                    <Upload size={15} /> {romName ? 'Choose another ROM' : 'Select ROM'}
                  </button>
                  {romName && (
                    <button className="btn" onClick={boot}>
                      <Gamepad2 size={15} /> Boot console
                    </button>
                  )}
                </div>
                {emu.bios && (
                  <button className="btn btn-ghost btn-sm" onClick={() => biosInput.current?.click()}>
                    <HardDrive size={13} /> {biosName ? `BIOS: ${biosName}` : 'Add BIOS file (optional)'}
                  </button>
                )}
                {error && (
                  <div className="note warn" style={{ maxWidth: 440, textAlign: 'left' }}>
                    <AlertTriangle />
                    <div>{error}</div>
                  </div>
                )}
              </div>
            )}
            {booting && started && (
              <div className="player-loading" style={{ background: 'rgba(4,4,10,.85)' }}>
                <div className="loader-ring" />
                <div style={{ fontFamily: 'var(--display)', fontSize: 15 }}>Booting {emu.short}</div>
                <div className="mono small" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 10 }}>
                  loading wasm core
                </div>
              </div>
            )}
          </div>

          <div className="row wrap" style={{ gap: 9, marginTop: 12 }}>
            <button className="btn btn-sm" onClick={() => romInput.current?.click()}>
              <FileArchive size={14} /> Change ROM
            </button>
            {started && (
              <>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    const el = stageRef.current as any;
                    if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => toast('Fullscreen blocked.', 'error'));
                    else document.exitFullscreen();
                  }}
                >
                  <Expand size={14} /> Fullscreen
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    resetStage();
                    setStarted(false);
                    setBooting(false);
                  }}
                >
                  <RefreshCw size={14} /> Reset
                </button>
              </>
            )}
            <div className="spacer" />
            {romName && (
              <span className="badge">
                <Cpu size={11} /> {romName}
              </span>
            )}
          </div>

          <input
            ref={romInput}
            type="file"
            accept={emu.extensions.join(',')}
            hidden
            onChange={(e) => handleRom(e.target.files?.[0])}
          />
          <input ref={biosInput} type="file" hidden onChange={(e) => handleBios(e.target.files?.[0])} />
        </div>

        {!started && (
          <div className="stack">
            <div className="card" style={{ padding: 20 }}>
              <div className="eyebrow">Controls</div>
              <div className="stack" style={{ gap: 8, marginTop: 12, fontSize: 12.5 }}>
                {[
                  ['D-pad', 'Arrow keys / WASD'],
                  ['A · B', 'Z · X'],
                  ['Start · Select', 'Enter · Shift'],
                  ['Save state', 'F2 / F4'],
                  ['Fast-forward', 'Hold Space'],
                  ['Fullscreen', 'F11 or toolbar'],
                ].map(([k, v]) => (
                  <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="muted">{k}</span>
                    <span className="mono" style={{ fontSize: 11.5 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="note" style={{ marginTop: 14 }}>
                <Keyboard />
                <div>Connect a controller and press a button — it maps itself automatically.</div>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div className="eyebrow">Volume</div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                style={{ width: '100%', marginTop: 12, accentColor: 'var(--accent)' }}
              />
              <div className="small muted">{Math.round(volume * 100)}%</div>
            </div>

            {emu.bios && (
              <div className="note warn">
                <Info />
                <div>
                  <strong style={{ color: 'var(--text)' }}>BIOS recommended.</strong> Some {emu.short} titles refuse to
                  boot without the console BIOS. Add yours above — it is read locally.
                </div>
              </div>
            )}

            <div className="note">
              <Info />
              <div>
                ROMs are memory-mapped in this tab only. Nothing is uploaded, stored or logged. Close the tab and it’s
                gone.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="section">
        <div className="eyebrow">Try another console</div>
        <div className="grid-games" style={{ marginTop: 14 }}>
          {(catalog?.emulators || [])
            .filter((e) => e.id !== emu.id)
            .slice(0, 6)
            .map((e) => (
              <Link key={e.id} to={`/emulators/${e.id}`}>
                <div className="emu-card" style={{ ['--emu-color' as any]: e.color, padding: 16 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="emu-icon" style={{ ['--emu-color' as any]: e.color, margin: 0, width: 36, height: 36, fontSize: 17 }}>
                      {e.icon}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{e.short} · {e.years}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>

      <style>{`
        .stage-live { border-color: color-mix(in srgb, var(--accent) 40%, transparent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 10%, transparent); }
      `}</style>
    </div>
  );
}
