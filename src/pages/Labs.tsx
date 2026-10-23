import { AlertTriangle, ArrowRight, ExternalLink, Info, Loader2, Play, Sparkles, Upload, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';
import { CatIcon } from '../components/ui';

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

function Stage({
  children,
  idle,
}: {
  children?: React.ReactNode;
  idle?: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode; error?: string };
}) {
  return (
    <div className="stage">
      {children}
      {idle && (
        <div className="stage__idle">
          <span className="dropzone__icon">{idle.icon}</span>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>{idle.title}</div>
          <p className="small muted" style={{ maxWidth: 400, textAlign: 'center' }}>
            {idle.error || idle.body}
          </p>
          {idle.action}
        </div>
      )}
    </div>
  );
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
      <Stage
        idle={
          status === 'ready'
            ? undefined
            : {
                icon: status === 'loading' ? <Loader2 className="spin" size={22} /> : <Zap size={22} />,
                title: status === 'loading' ? `Waking up ${name}` : 'Drop a .swf file to resurrect it',
                body: 'Ruffle re-implements the Flash player in WebAssembly — no plugin, no security holes.',
                error,
                action:
                  status !== 'loading' ? (
                    <button className="btn btn--primary" onClick={() => input.current?.click()}>
                      <Upload size={14} /> Choose SWF
                    </button>
                  ) : undefined,
              }
        }
      >
        <div ref={holder} style={{ width: '100%', height: '100%', background: 'var(--surface-2)' }} />
      </Stage>
      <div className="row wrap" style={{ gap: 8 }}>
        <button className="btn btn--sm btn--outline" onClick={() => input.current?.click()}>
          <Upload size={13} /> Load another SWF
        </button>
        <span className="pill">Ruffle · wasm</span>
        <div className="spacer" />
        <a className="btn btn--sm btn--ghost" href="https://archive.org/details/softwarelibrary_flash" target="_blank" rel="noreferrer">
          <ExternalLink size={13} /> Flash archive
        </a>
      </div>
      <input ref={input} type="file" accept=".swf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) play(f); }} />
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
      start(holder.current, { url: source, theme: 'light', noCloud: true, autoStart: true });
      setStatus('ready');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'js-dos failed to start.');
    }
  };

  return (
    <div className="stack">
      <Stage
        idle={
          status === 'ready'
            ? undefined
            : {
                icon: status === 'loading' ? <Loader2 className="spin" size={22} /> : <CatIcon name="computer" size={22} />,
                title: status === 'loading' ? 'Mounting virtual C: drive…' : 'Boot MS-DOS in a tab',
                body: 'Drop a .jsdos bundle or a zipped DOS game. js-dos 8 boots it with VGA, Sound Blaster and mouse.',
                error,
                action:
                  status !== 'loading' ? (
                    <button className="btn btn--primary" onClick={() => input.current?.click()}>
                      <Upload size={14} /> Choose DOS bundle
                    </button>
                  ) : undefined,
              }
        }
      >
        <div ref={holder} style={{ width: '100%', height: '100%' }} />
      </Stage>
      <div className="row wrap" style={{ gap: 8 }}>
        <button className="btn btn--sm btn--outline" onClick={() => input.current?.click()}>
          <Upload size={13} /> Load bundle
        </button>
        <div className="search" style={{ minWidth: 200, maxWidth: 320 }}>
          <input placeholder="…or paste a .jsdos URL" value={url} onChange={(e) => setUrl(e.target.value)} style={{ paddingLeft: 14 }} />
        </div>
        <button className="btn btn--sm btn--primary" disabled={!url} onClick={() => boot(url)}>
          <Play size={13} /> Boot URL
        </button>
        <div className="spacer" />
        <a className="btn btn--sm btn--ghost" href="https://dos.zone" target="_blank" rel="noreferrer">
          <ExternalLink size={13} /> dos.zone
        </a>
      </div>
      <input ref={input} type="file" accept=".jsdos,.zip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) boot(URL.createObjectURL(f)); }} />
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
      <Stage
        idle={
          active
            ? undefined
            : {
                icon: <CatIcon name="blocks" size={22} />,
                title: 'Paste a Scratch project link',
                body: 'TurboWarp compiles .sb3 projects for a big speed boost — no Flash, no vanilla player stutter.',
                error,
              }
        }
      >
        {active ? (
          <iframe src={active} title="Scratch project" allow="autoplay; fullscreen; microphone; camera" allowFullScreen style={{ width: '100%', height: '100%', border: 0 }} />
        ) : null}
      </Stage>
      <div className="row wrap" style={{ gap: 8 }}>
        <div className="search" style={{ flex: 1, minWidth: 220 }}>
          <input
            placeholder="https://scratch.mit.edu/projects/10128407 or a project ID"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && launch()}
            style={{ paddingLeft: 14 }}
          />
        </div>
        <button className="btn btn--sm btn--primary" onClick={launch}>
          <Play size={13} /> Launch
        </button>
        {active && (
          <a className="btn btn--sm btn--outline" href={active} target="_blank" rel="noreferrer">
            <ExternalLink size={13} /> New tab
          </a>
        )}
      </div>
    </div>
  );
}

const PANELS: Record<string, { component: () => any; tips: string[] }> = {
  flash: {
    component: FlashLab,
    tips: [
      'Ruffle is a Rust + WebAssembly reimplementation of the Flash player.',
      'Load any .swf you have lying around — old Newgrounds archives work great.',
      'Audio starts muted until you click the player (browser policy).',
    ],
  },
  dos: {
    component: DosLab,
    tips: [
      'A .jsdos bundle is a zip with a dosbox config and your game files.',
      'Plain DOS game zips usually boot too — js-dos generates a config.',
      'Press Ctrl+F10 inside the DOS window for the js-dos menu.',
    ],
  },
  scratch: {
    component: ScratchLab,
    tips: [
      'Paste any scratch.mit.edu project link — we extract the ID.',
      'TurboWarp compiles scripts for a large speed boost.',
      'Full keyboard, mouse and extension support.',
    ],
  },
};

export function Labs() {
  const { catalog } = useCatalog();
  const [params, setParams] = useSearchParams();
  const tool = params.get('tool') || 'flash';
  const runtimes = catalog?.runtimes || [];
  const meta = runtimes.find((r) => r.id === tool);
  const Panel = PANELS[tool]?.component || FlashLab;
  const tips = PANELS[tool]?.tips || [];

  useEffect(() => {
    if (!params.get('tool')) setParams({ tool: 'flash' }, { replace: true });
  }, []);

  return (
    <>
      <div className="row wrap row--between" style={{ alignItems: 'flex-end', marginBottom: 22 }}>
        <div>
          <h1 className="h2">Labs</h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: '62ch' }}>
            Flash animations, DOS shareware and Scratch projects — three runtimes that refuse to let the old web die.
          </p>
        </div>
        <span className="pill"><Sparkles size={11} /> Experimental</span>
      </div>

      <div className="row wrap" style={{ gap: 8, marginBottom: 22 }}>
        {runtimes.map((r) => (
          <button
            key={r.id}
            onClick={() => setParams({ tool: r.id })}
            className="card"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer',
              borderColor: tool === r.id ? 'var(--ink)' : 'var(--line-soft)',
              boxShadow: tool === r.id ? 'inset 0 0 0 1px var(--ink)' : 'none',
              background: 'var(--surface)', color: 'var(--ink)', textAlign: 'left',
            }}
          >
            <CatIcon name={r.icon} size={17} style={{ color: 'var(--ink-2)' }} />
            <span>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 550 }}>{r.name}</span>
              <span className="tiny muted mono" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>{r.tech}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="split" style={{ gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)' }}>
        <div className="card card--pad">
          <div className="row" style={{ gap: 10, marginBottom: 14 }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
              <CatIcon name={meta?.icon || 'zap'} size={17} />
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{meta?.name || 'Flash Vault'}</div>
              <div className="tiny muted mono" style={{ textTransform: 'uppercase', letterSpacing: '.1em' }}>{meta?.tech || 'Ruffle'}</div>
            </div>
            <div className="spacer" />
            <span className="pill pill--green"><span className="dot" />Local runtime</span>
          </div>
          <Panel />
        </div>

        <div className="stack">
          <div className="card card--pad">
            <span className="eyebrow">How it works</span>
            <p className="small" style={{ color: 'var(--ink-2)', lineHeight: 1.7, marginTop: 10 }}>{meta?.blurb}</p>
            <hr className="hairline" />
            <div className="stack" style={{ gap: 10 }}>
              {tips.map((t, i) => (
                <div key={i} className="row" style={{ gap: 9, alignItems: 'flex-start', fontSize: 13, color: 'var(--ink-2)' }}>
                  <span className="mono tiny" style={{ color: 'var(--ink-3)', marginTop: 2 }}>0{i + 1}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="note">
            <Info />
            <div>{meta?.how}</div>
          </div>
          <div className="card card--pad">
            <div className="menu-label" style={{ padding: '0 0 8px' }}>Also try</div>
            {runtimes.filter((r) => r.id !== tool).map((r) => (
              <button key={r.id} className="menu-item" onClick={() => setParams({ tool: r.id })}>
                <CatIcon name={r.icon} size={15} /> {r.name}
                <ArrowRight size={13} style={{ marginLeft: 'auto', color: 'var(--ink-3)' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
