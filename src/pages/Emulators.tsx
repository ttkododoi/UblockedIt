import { Check, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';
import { CatIcon, Reveal, SkeletonTile } from '../components/ui';

const ERAS = [
  { id: 'all', label: 'All eras' },
  { id: 'retro', label: '70s – 80s' },
  { id: '90s', label: '1990s' },
  { id: 'modern', label: '2000s+' },
  { id: 'handheld', label: 'Handhelds' },
];

const HANDHELD = ['gb', 'gbc', 'gba', 'nds', 'psp', 'segaGG', 'lynx', 'ngp', 'ws', 'vb'];

export function Emulators() {
  const { catalog, loading } = useCatalog();
  const [query, setQuery] = useState('');
  const [era, setEra] = useState('all');

  const list = useMemo(() => {
    let emus = catalog?.emulators || [];
    const q = query.trim().toLowerCase();
    if (q) emus = emus.filter((e) => e.name.toLowerCase().includes(q) || e.short.toLowerCase().includes(q) || e.years.includes(q));
    if (era === 'retro') emus = emus.filter((e) => Number(e.years) < 1990);
    if (era === '90s') emus = emus.filter((e) => Number(e.years) >= 1990 && Number(e.years) < 2000);
    if (era === 'modern') emus = emus.filter((e) => Number(e.years) >= 2000);
    if (era === 'handheld') emus = emus.filter((e) => HANDHELD.includes(e.id));
    return emus;
  }, [catalog, query, era]);

  return (
    <>
      <div className="row wrap row--between" style={{ alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 className="h2">Emulator stations</h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: '64ch' }}>
            {catalog?.emulators.length || 30} cores running in your browser through WebAssembly. Your ROMs never leave
            your device.
          </p>
        </div>
        <span className="pill pill--green"><ShieldCheck size={11} /> No uploads</span>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search consoles" aria-label="Search consoles" />
        </div>
        <div className="chips">
          {ERAS.map((e) => (
            <button key={e.id} className={`chip ${era === e.id ? 'is-active' : ''}`} onClick={() => setEra(e.id)}>
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid--tight">{Array.from({ length: 8 }).map((_, i) => <SkeletonTile key={i} />)}</div>
      ) : (
        <div className="grid grid--tight">
          {list.map((emu, i) => (
            <Reveal key={emu.id} delay={i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2}>
              <Link to={`/emulators/${emu.id}`} className="card" style={{ display: 'block', padding: 20, height: '100%', color: 'var(--ink)' }}>
                <span
                  style={{
                    width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center',
                    background: 'var(--surface-2)', color: 'var(--ink-2)', marginBottom: 14,
                  }}
                >
                  <CatIcon name={emu.icon} size={19} />
                </span>
                <h3 style={{ fontSize: 15.5 }}>{emu.name}</h3>
                <div className="tiny muted mono" style={{ marginTop: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {emu.short} · {emu.years} · {emu.core}
                </div>
                <p className="small muted" style={{ marginTop: 10, lineHeight: 1.5, minHeight: 40 }}>{emu.blurb}</p>
                <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
                  <span className="tag">{emu.extensions[0]}</span>
                  {emu.bios && <span className="tag">BIOS</span>}
                  {emu.saveStates && <span className="tag">Saves</span>}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}

      <section className="section">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
          {[
            ['Bring your own ROM', 'Files are read locally with the File API. Nothing is uploaded or stored.'],
            ['Save states', 'Snapshot any moment and pick up exactly where you left off.'],
            ['Keyboard and gamepad', 'Arrows, WASD or any connected controller — mapped per core.'],
            ['Shader presets', 'CRT scanlines, LCD grids and upscalers from the emulator menu.'],
          ].map(([t, d]) => (
            <div key={t} className="card card--pad">
              <div className="row" style={{ gap: 7, fontSize: 14, fontWeight: 600 }}><Check size={14} style={{ color: 'var(--green)' }} /> {t}</div>
              <p className="small muted" style={{ marginTop: 8, lineHeight: 1.6 }}>{d}</p>
            </div>
          ))}
        </div>
        <div className="note note--warn" style={{ marginTop: 20 }}>
          <ShieldCheck style={{ marginTop: 2 }} />
          <div>
            <strong style={{ color: 'var(--ink)' }}>Use ROMs you have the right to play.</strong> No copyrighted dumps
            are bundled. Emulator cores are open source (EmulatorJS / libretro).
          </div>
        </div>
      </section>
    </>
  );
}
