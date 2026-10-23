import { motion } from 'framer-motion';
import { Boxes, HardDrive, Keyboard, Search, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';
import { Reveal, Stagger, staggerItem } from '../components/ui';

export function Emulators() {
  const { catalog, loading } = useCatalog();
  const [query, setQuery] = useState('');
  const [era, setEra] = useState('all');

  const list = useMemo(() => {
    let emus = catalog?.emulators || [];
    const q = query.trim().toLowerCase();
    if (q)
      emus = emus.filter(
        (e) => e.name.toLowerCase().includes(q) || e.short.toLowerCase().includes(q) || e.years.includes(q)
      );
    if (era === 'retro') emus = emus.filter((e) => Number(e.years) < 1990);
    if (era === '90s') emus = emus.filter((e) => Number(e.years) >= 1990 && Number(e.years) < 2000);
    if (era === 'modern') emus = emus.filter((e) => Number(e.years) >= 2000);
    if (era === 'handheld') emus = emus.filter((e) => ['gb', 'gbc', 'gba', 'nds', 'psp', 'gg', 'lynx', 'ngp', 'ws', 'vb'].includes(e.id));
    return emus;
  }, [catalog, query, era]);

  return (
    <div className="page">
      <div className="eyebrow"><Boxes size={12} /> Emulator stations</div>
      <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(30px,4.2vw,48px)', letterSpacing: '-0.045em' }}>
            Boot a console in <span className="grad-text">one click</span>
          </h1>
          <p className="muted" style={{ marginTop: 8, maxWidth: '62ch', fontSize: 14 }}>
            {catalog?.emulators.length || 28} cores, running inside your browser through WebAssembly. Drop in a ROM you
            own, and get save states, rewind, fast-forward, shaders and controller support.
          </p>
        </div>
        <div className="pill-row">
          <span className="badge badge-live"><span className="dot" />WASM powered</span>
          <span className="badge"><ShieldCheck size={10} />No uploads to us</span>
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: 26 }}>
        <div className="search">
          <Search />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search consoles — NES, GBA, Dreamcast…" />
        </div>
        <div className="chips">
          {[
            { id: 'all', label: 'All eras' },
            { id: 'retro', label: '70s–80s' },
            { id: '90s', label: '90s' },
            { id: 'modern', label: '2000s+' },
            { id: 'handheld', label: 'Handhelds' },
          ].map((e) => (
            <button key={e.id} className={`chip ${era === e.id ? 'active' : ''}`} onClick={() => setEra(e.id)}>
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid-games">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 176 }} />
          ))}
        </div>
      ) : (
        <Stagger className="grid-games" gap={0.035}>
          {list.map((emu) => (
            <motion.div key={emu.id} variants={staggerItem}>
              <Link to={`/emulators/${emu.id}`}>
                <div className="emu-card" style={{ ['--emu-color' as any]: emu.color }}>
                  <div className="emu-icon">{emu.icon}</div>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 15.5, letterSpacing: '-0.02em' }}>
                    {emu.name}
                  </div>
                  <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase', marginTop: 3 }}>
                    {emu.short} · {emu.years} · {emu.core}
                  </div>
                  <p style={{ fontSize: 12.3, color: 'var(--muted)', lineHeight: 1.6, marginTop: 10, minHeight: 38 }}>{emu.blurb}</p>
                  <div className="pill-row" style={{ marginTop: 12 }}>
                    <span className="tag">{emu.extensions[0]}</span>
                    {emu.bios && <span className="tag">BIOS</span>}
                    {emu.heavy && <span className="tag">Heavy</span>}
                    {emu.saveStates && <span className="tag">Save states</span>}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </Stagger>
      )}

      {list.length === 0 && (
        <div className="empty">
          <div className="big">🔍</div>
          No consoles matched that search.
        </div>
      )}

      <Reveal>
        <div className="section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14 }}>
          {[
            { icon: Upload, title: 'Bring your own ROM', text: 'Files are read locally with the File API and never touch our servers. Nothing is stored.' },
            { icon: HardDrive, title: 'Save states', text: 'Snapshot any moment, export the save, and pick up exactly where you left off next visit.' },
            { icon: Keyboard, title: 'Keyboard + gamepad', text: 'Arrow keys, WASD and any connected controller are mapped automatically per core.' },
            { icon: Sparkles, title: 'Shader presets', text: 'CRT scanlines, LCD grids and upscalers — flip them on from the emulator menu bar.' },
          ].map((f) => (
            <div key={f.title} className="card" style={{ padding: 20 }}>
              <span style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent-2)', marginBottom: 12 }}>
                <f.icon size={18} />
              </span>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 14 }}>{f.title}</div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 6 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="note warn" style={{ marginTop: 26 }}>
        <ShieldCheck />
        <div>
          <strong style={{ color: 'var(--text)' }}>Use ROMs you have the right to play.</strong> UblockedIt ships no
          copyrighted game dumps. The emulator cores are open-source (EmulatorJS, RetroArch/libretro) and the files you
          load stay in your browser.
        </div>
      </div>
    </div>
  );
}
