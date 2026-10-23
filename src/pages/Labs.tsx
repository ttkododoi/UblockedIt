import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, ExternalLink, Info, Loader2, Play, Sparkles, Upload, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalog, type Runtime } from '../lib/catalog';
import { useApp } from '../lib/store';

type Status = 'idle' | 'loading' | 'ready' | 'error';

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.id = id;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(s);
  });
}

function loadCss(href: string, id: string) {
  if (document.getElementById(id)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  l.id = id;
  document.head.appendChild(l);
}

function FlashLab() {
  const [status, setStatus] = useState<Status>('idle');
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const holder = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const play = async (file: File) => {
    setStatus('loading');
    setError('');
    setName(file.name);
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle@latest', 'ruffle-script');
      const Ruffle = (window as any).RufflePlayer;
      if (!Ruffle) throw new Error('Ruffle did not initialise');
      const player = Ruffle.newest().createPlayer();
      player.style.width = '100%';
      player.style.height = '100%';
      player.style.display = 'block';
      if (holder.current) {
        holder.current.innerHTML = '';
        holder.current.appendChild(player);
      }
      const url = URL.createObjectURL(file);
      await player.load({ url, autoplay: 'on', unmuteOverlay: 'visible', splashScreen: false, scale: 'showAll' });
      setStatus('ready');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Ruffle failed to start.');
    }
  };

  return (
    <div className="stack">
      <div className="stage" style={{ aspectRatio: '16/10' }}>
        <div ref={holder} style={{ width: '100%', height: '100%', background: '#000' }} />
        {status !== 'ready' && (
          <div className="player-loading" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(255,190,11,.12), #05050a)' }}>
            {status === 'loading' ? <div className="loader-ring" /> : <div style={{ fontSize: 38 }}>⚡</div>}
            <div style={{ fontFamily: 'var(--display)', fontSize: 15 }}>
              {status === 'loading' ? `Waking up ${name}` : 'Drop a .swf file to resurrect it'}
            </div>
            <div className="small" style={{ maxWidth: 360, textAlign: 'center' }}>
              {error || 'Ruffle re-implements the Flash player in WebAssembly — no plugin, no security holes.'}
            </div>
            {status !== 'loading' && (
              <button className="btn btn-primary" onClick={() => input.current?.click()}>
                <Upload size={14} /> Choose SWF
              </button>
            )}
          </div>
        )}
      </div>
      <div className="row wrap" style={{ gap: 9 }}>
        <button className="btn btn-sm" onClick={() => input.current?.click()}>
          <Upload size={14} /> Load another SWF
        </button>
        <span className="badge">Ruffle · wasm</span>
        <div className="spacer" />
        <a className="btn btn-ghost btn-sm" href="https://archive.org/details/softwarelibrary_flash" target="_blank" rel="noreferrer">
          <ExternalLink size={13} /> Flash archive
        </a>
      </div>
      <input
        ref={input}
        type="file"
        accept=".swf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) play(f);
        }}
      />
    </div>
  );
}

function DosLab() {
  const [status, setStatus] = useState<Status>('idle');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const holder = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const boot = async (source: string) => {
    setStatus('loading');
    setError('');
    try {
      loadCss('https://v8.js-dos.com/latest/js-dos.css', 'jsdos-css');
      await loadScript('https://v8.js-dos.com/latest/js-dos.js', 'jsdos-script');
      const w = window as any;
      w.emulators = w.emulators || {};
      w.emulators.pathPrefix = 'https://v8.js-dos.com/latest/emulators/';
      if (holder.current) holder.current.innerHTML = '';
      const start = w.Dos || w.dos || w.DOSBOX;
      if (typeof start !== 'function') throw new Error('js-dos runtime unavailable');
      start(holder.current, { url: source, theme: 'dark', noCloud: true, autoStart: true });
      setStatus('ready');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'js-dos failed to start.');
    }
  };

  return (
    <div className="stack">
      <div className="stage" style={{ aspectRatio: '16/10' }}>
        <div ref={holder} style={{ width: '100%', height: '100%' }} />
        {status !== 'ready' && (
          <div className="player-loading" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(46,196,182,.14), #05050a)' }}>
            {status === 'loading' ? <div className="loader-ring" /> : <div style={{ fontSize: 38 }}>💾</div>}
            <div style={{ fontFamily: 'var(--display)', fontSize: 15 }}>
              {status === 'loading' ? 'Mounting virtual C: drive…' : 'Boot MS-DOS in a tab'}
            </div>
            <div className="small" style={{ maxWidth: 360, textAlign: 'center' }}>
              {error || 'Drop a .jsdos bundle or a zipped DOS game. js-dos 8 boots it with VGA, Sound Blaster and mouse.'}
            </div>
            {status !== 'loading' && (
              <button className="btn btn-primary" onClick={() => input.current?.click()}>
                <Upload size={14} /> Choose DOS bundle
              </button>
            )}
          </div>
        )}
      </div>
      <div className="row wrap" style={{ gap: 9 }}>
        <button className="btn btn-sm" onClick={() => input.current?.click()}>
          <Upload size={14} /> Load bundle
        </button>
        <div className="search" style={{ minWidth: 200, maxWidth: 320 }}>
          <input placeholder="…or paste a .jsdos URL" value={url} onChange={(e) => setUrl(e.target.value)} style={{ paddingLeft: 14 }} />
        </div>
        <button className="btn btn-sm" disabled={!url} onClick={() => boot(url)}>
          <Play size={13} /> Boot URL
        </button>
        <div className="spacer" />
        <a className="btn btn-ghost btn-sm" href="https://dos.zone" target="_blank" rel="noreferrer">
          <ExternalLink size={13} /> dos.zone
        </a>
      </div>
      <input
        ref={input}
        type="file"
        accept=".jsdos,.zip"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) boot(URL.createObjectURL(f));
        }}
      />
    </div>
  );
}

function ScratchLab() {
  const [project, setProject] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState('');

  const launch = () => {
    const raw = project.trim();
    if (!raw) return;
    const match = raw.match(/(\d{5,})/);
    if (!match) {
      setError('That does not look like a Scratch project ID or URL (numbers only).');
      return;
    }
    setError('');
    setActive(`https://turbowarp.org/${match[1]}/embed?autoplay`);
  };

  return (
    <div className="stack">
      <div className="stage" style={{ aspectRatio: '16/10' }}>
        {active ? (
          <iframe src={active} title="Scratch project" allow="autoplay; fullscreen; microphone; camera" allowFullScreen style={{ width: '100%', height: '100%', border: 0 }} />
        ) : (
          <div className="player-loading" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(255,138,0,.14), #05050a)' }}>
            <div style={{ fontSize: 38 }}>🐱</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 15 }}>Paste a Scratch project link</div>
            <div className="small" style={{ maxWidth: 360, textAlign: 'center' }}>
              TurboWarp’s compiler runs .sb3 projects at up to 60fps — no Flash, no vanilla player stutter.
            </div>
          </div>
        )}
      </div>
      <div className="row wrap" style={{ gap: 9 }}>
        <div className="search" style={{ flex: 1, minWidth: 220 }}>
          <input
            placeholder="https://scratch.mit.edu/projects/10128407 or project ID"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && launch()}
            style={{ paddingLeft: 14 }}
          />
        </div>
        <button className="btn btn-primary btn-sm" onClick={launch}>
          <Play size={13} /> Launch
        </button>
        {active && (
          <a className="btn btn-sm" href={active} target="_blank" rel="noreferrer">
            <ExternalLink size={13} /> New tab
          </a>
        )}
      </div>
      {error && (
        <div className="note warn">
          <AlertTriangle />
          <div>{error}</div>
        </div>
      )}
    </div>
  );
}

const PANELS: Record<string, { component: () => any; tips: string[] }> = {
  flash: {
    component: FlashLab,
    tips: [
      'Ruffle is a Rust + WebAssembly reimplementation of the Flash Player.',
      'Load any .swf you have lying around — old Newgrounds archives work great.',
      'Audio starts muted until you click the player (browser policy).',
    ],
  },
  dos: {
    component: DosLab,
    tips: [
      'A .jsdos bundle is a zip with a dosbox conf and your game files.',
      'Plain DOS game zips usually boot too — js-dos auto-generates a config.',
      'Press Ctrl+F10 in the dos window for the js-dos menu.',
    ],
  },
  scratch: {
    component: ScratchLab,
    tips: [
      'Paste any scratch.mit.edu project link — we extract the ID.',
      'TurboWarp compiles scripts for a large speed boost.',
      'Works with full keyboard and mouse extension support.',
    ],
  },
};

export function Labs() {
  const { catalog } = useCatalog();
  const [params, setParams] = useSearchParams();
  const tool = params.get('tool') || 'flash';
  const runtimes = catalog?.runtimes || [];
  const meta = runtimes.find((r) => r.id === tool) as Runtime | undefined;
  const Panel = PANELS[tool]?.component || FlashLab;
  const tips = PANELS[tool]?.tips || [];

  useEffect(() => {
    if (!params.get('tool')) setParams({ tool: 'flash' }, { replace: true });
  }, []);

  return (
    <div className="page">
      <div className="eyebrow"><Sparkles size={12} /> Labs</div>
      <h1 style={{ fontSize: 'clamp(30px,4.2vw,46px)', letterSpacing: '-0.045em', marginTop: 12 }}>
        The internet’s <span className="grad-text">weird attic</span>
      </h1>
      <p className="muted" style={{ marginTop: 8, maxWidth: '62ch', fontSize: 14 }}>
        Flash animations, DOS shareware, Scratch projects. Three runtimes that refuse to let the old web die.
      </p>

      <div className="row wrap" style={{ gap: 10, marginTop: 24 }}>
        {runtimes.map((r) => (
          <motion.button
            key={r.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => setParams({ tool: r.id })}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '10px 15px',
              cursor: 'pointer',
              background: tool === r.id ? `color-mix(in srgb, ${r.color} 14%, transparent)` : 'color-mix(in srgb, var(--text) 3%, transparent)',
              borderColor: tool === r.id ? `color-mix(in srgb, ${r.color} 45%, transparent)` : 'var(--line)',
              color: 'var(--text)',
            }}
          >
            <span style={{ fontSize: 18 }}>{r.icon}</span>
            <span style={{ textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 550 }}>{r.name}</span>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{r.tech}</span>
            </span>
          </motion.button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)', gap: 20, marginTop: 24 }} className="labs-grid">
        <div className="card" style={{ padding: 18 }}>
          <div className="row" style={{ gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>{meta?.icon || '⚡'}</span>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 15 }}>{meta?.name || 'Flash Vault'}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {meta?.tech || 'Ruffle'}
              </div>
            </div>
            <div className="spacer" />
            <span className="badge badge-live"><span className="dot" />Local runtime</span>
          </div>
          <Panel />
        </div>

        <div className="stack">
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow">How it works</div>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginTop: 10 }}>{meta?.blurb}</p>
            <div className="hairline" />
            <div className="stack" style={{ gap: 10 }}>
              {tips.map((t, i) => (
                <div key={i} className="row" style={{ gap: 9, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--muted)' }}>
                  <span className="mono" style={{ color: 'var(--accent-2)', fontSize: 11, marginTop: 2 }}>0{i + 1}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="note">
            <Info />
            <div>{meta?.how}</div>
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Also try</div>
            {runtimes
              .filter((r) => r.id !== tool)
              .map((r) => (
                <button key={r.id} className="menu-item" onClick={() => setParams({ tool: r.id })}>
                  <span>{r.icon}</span> {r.name}
                  <ArrowRight size={13} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />
                </button>
              ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 940px) { .labs-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
