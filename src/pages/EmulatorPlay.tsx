import { ArrowLeft, FileArchive, HardDrive, Keyboard, Maximize2, Play, RotateCw, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';
import { useApp } from '../lib/store';
import { CatIcon, EmptyState } from '../components/ui';

const EJS_DATA = 'https://cdn.emulatorjs.org/stable/data/';

export function EmulatorPlay() {
  const { id } = useParams();
  const { catalog, loading } = useCatalog();
  const { toast } = useApp();
  const navigate = useNavigate();
  const emu = catalog?.emulators.find((e) => e.id === id);

  const [romName, setRomName] = useState<string | null>(null);
  const [romUrl, setRomUrl] = useState<string | null>(null);
  const [biosUrl, setBiosUrl] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const romInput = useRef<HTMLInputElement>(null);
  const biosInput = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const urls = useRef<string[]>([]);

  const reset = () => {
    if (holderRef.current) holderRef.current.innerHTML = '';
    const w = window as any;
    Object.keys(w)
      .filter((k) => k.startsWith('EJS_'))
      .forEach((k) => delete w[k]);
    document.querySelectorAll('script[data-ejs]').forEach((s) => s.remove());
  };

  useEffect(() => {
    return () => {
      reset();
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [id]);

  const pickRom = (file?: File | null) => {
    if (!file || !emu) return;
    if (file.size > 512 * 1024 * 1024) {
      setError('That ROM is larger than 512 MB — too big for a browser tab.');
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    setRomUrl(url);
    setRomName(file.name);
    setStarted(false);
    reset();
  };

  const boot = () => {
    if (!emu || !romUrl || !holderRef.current) return;
    setBooting(true);
    setStarted(true);
    setError(null);
    const holder = holderRef.current;
    holder.innerHTML = '';
    if (!holder.id) holder.id = `ejs-${emu.id}`;
    const w = window as any;
    w.EJS_player = `#${holder.id}`;
    w.EJS_core = emu.core;
    w.EJS_gameUrl = romUrl;
    w.EJS_gameName = romName?.replace(/\.[^.]+$/, '') || emu.short;
    w.EJS_pathtodata = EJS_DATA;
    w.EJS_startOnLoaded = true;
    w.EJS_color = '#0071e3';
    w.EJS_backgroundColor = '#000000';
    if (biosUrl) w.EJS_biosUrl = biosUrl;

    const script = document.createElement('script');
    script.src = EJS_DATA + 'loader.js';
    script.async = true;
    script.dataset.ejs = 'true';
    script.onerror = () => {
      setBooting(false);
      setError('The emulator runtime could not be downloaded. Check your connection or any blocker, then retry.');
    };
    script.onload = () => setTimeout(() => setBooting(false), 1600);
    document.body.appendChild(script);
  };

  if (loading) return <div className="skeleton" style={{ height: 440, borderRadius: 24 }} />;
  if (!emu)
    return (
      <EmptyState icon={ArrowLeft} title="Unknown console">
        <Link to="/emulators" className="btn btn--sm btn--primary" style={{ marginTop: 12 }}>All emulators</Link>
      </EmptyState>
    );

  return (
    <>
      <button className="btn btn--sm btn--ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="row wrap" style={{ gap: 14, marginBottom: 20, alignItems: 'flex-start' }}>
        <span style={{ width: 48, height: 48, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'var(--surface-2)', color: 'var(--ink-2)', flexShrink: 0 }}>
          <CatIcon name={emu.icon} size={23} />
        </span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 className="h3" style={{ fontSize: 26 }}>{emu.name}</h1>
          <div className="row wrap" style={{ gap: 8, marginTop: 6 }}>
            <span className="pill">{emu.short}</span>
            <span className="pill">{emu.years}</span>
            <span className="pill mono">core {emu.core}</span>
            {emu.bios && <span className="pill pill--outline">BIOS supported</span>}
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>{emu.blurb}</p>
        </div>
      </div>

      <div className="split" style={{ gridTemplateColumns: started ? '1fr' : 'minmax(0,1.6fr) minmax(0,1fr)' }}>
        <div>
          <div
            className="card"
            style={{ overflow: 'hidden', background: '#000', position: 'relative', aspectRatio: '16 / 10', padding: 0 }}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              pickRom(e.dataTransfer.files?.[0]);
            }}
          >
            <div ref={holderRef} style={{ width: '100%', height: '100%' }} />

            {!started && (
              <div
                style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center',
                  background: drag ? 'var(--accent-soft)' : 'var(--surface)',
                  outline: drag ? '2px dashed var(--accent)' : 'none', outlineOffset: -8,
                }}
              >
                <span className="dropzone__icon" style={{ margin: 0 }}><Upload size={22} /></span>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  {romName || `Load a ${emu.short} ROM`}
                </div>
                <p className="small muted" style={{ maxWidth: 380 }}>
                  {romName
                    ? 'Ready. Your file stays in this tab — nothing is uploaded.'
                    : `Accepted: ${emu.extensions.join('  ·  ')}`}
                </p>
                <div className="row wrap" style={{ gap: 8, justifyContent: 'center', marginTop: 4 }}>
                  <button className="btn btn--primary" onClick={() => romInput.current?.click()}>
                    <Upload size={14} /> {romName ? 'Choose another' : 'Select ROM'}
                  </button>
                  {romName && (
                    <button className="btn btn--dark" onClick={boot}>
                      <Play size={14} /> Boot console
                    </button>
                  )}
                  {emu.bios && (
                    <button className="btn btn--outline" onClick={() => biosInput.current?.click()}>
                      <HardDrive size={14} /> BIOS
                    </button>
                  )}
                </div>
                {error && <div className="note note--warn" style={{ maxWidth: 460, textAlign: 'left' }}>{error}</div>}
              </div>
            )}

            {booting && started && (
              <div className="loading-veil">
                <div className="spinner" />
                <div style={{ fontSize: 14 }}>Booting {emu.short}</div>
              </div>
            )}
          </div>

          <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn btn--sm btn--outline" onClick={() => romInput.current?.click()}>
              <FileArchive size={13} /> Change ROM
            </button>
            {started && (
              <>
                <button
                  className="btn btn--sm btn--outline"
                  onClick={() => {
                    const el = stageRef.current;
                    void el;
                  }}
                  style={{ display: 'none' }}
                />
                <button
                  className="btn btn--sm btn--outline"
                  onClick={() => {
                    const el = holderRef.current?.closest('.card') as any;
                    if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => toast('Fullscreen was blocked.', 'error'));
                    else document.exitFullscreen();
                  }}
                >
                  <Maximize2 size={13} /> Fullscreen
                </button>
                <button
                  className="btn btn--sm btn--outline"
                  onClick={() => {
                    reset();
                    setStarted(false);
                    setBooting(false);
                  }}
                >
                  <RotateCw size={13} /> Stop
                </button>
              </>
            )}
            {romName && <span className="pill" style={{ marginLeft: 'auto' }}>{romName}</span>}
          </div>

          <input ref={romInput} type="file" accept={emu.extensions.join(',')} hidden onChange={(e) => pickRom(e.target.files?.[0])} />
          <input
            ref={biosInput}
            type="file"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const url = URL.createObjectURL(f);
              urls.current.push(url);
              setBiosUrl(url);
              toast(`BIOS loaded: ${f.name}`, 'success');
            }}
          />
          <div ref={stageRef} />
        </div>

        {!started && (
          <div className="stack">
            <div className="card card--pad">
              <h3 style={{ fontSize: 15 }}>Controls</h3>
              <div className="stack" style={{ gap: 8, marginTop: 12, fontSize: 13 }}>
                {[
                  ['D-pad', 'Arrow keys / WASD'],
                  ['A · B', 'Z · X'],
                  ['Start · Select', 'Enter · Shift'],
                  ['Save state', 'F2 / F4'],
                  ['Fast-forward', 'Hold Space'],
                ].map(([k, v]) => (
                  <div key={k} className="row row--between">
                    <span className="muted">{k}</span>
                    <span className="mono" style={{ fontSize: 12 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="note">
              <Keyboard style={{ marginTop: 2 }} />
              <div>Connect a controller and press a button — it maps itself automatically.</div>
            </div>
            {emu.bios && (
              <div className="note note--warn">
                <HardDrive style={{ marginTop: 2 }} />
                <div>Some {emu.short} titles need a console BIOS. Add yours above; it is read locally.</div>
              </div>
            )}
          </div>
        )}
      </div>

      <section className="section">
        <div className="section-head"><h2 style={{ fontSize: 24 }}>Other consoles</h2></div>
        <div className="grid grid--tight">
          {(catalog?.emulators || [])
            .filter((e) => e.id !== emu.id)
            .slice(0, 6)
            .map((e) => (
              <Link key={e.id} to={`/emulators/${e.id}`} className="card" style={{ display: 'block', padding: 16, color: 'var(--ink)' }}>
                <div className="row" style={{ gap: 10 }}>
                  <CatIcon name={e.icon} size={17} style={{ color: 'var(--ink-2)' }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 550 }}>{e.name}</div>
                    <div className="tiny muted">{e.short} · {e.years}</div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>
    </>
  );
}
