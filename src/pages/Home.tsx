import { motion } from 'framer-motion';
import {
  ArrowRight,
  Heart,
  ArrowUpRight,
  Boxes,
  ChevronRight,
  Flame,
  Gamepad2,
  MessageSquare,
  Package,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';
import { api, fmt } from '../lib/api';
import { useApp } from '../lib/store';
import { Counter, MagneticButton, Reveal, Stagger, staggerItem, TiltCard } from '../components/ui';
import { GameCard } from '../components/GameCard';

const CATEGORY_META: Record<string, { icon: string; from: string; to: string; blurb: string }> = {
  Action: { icon: '💥', from: '#ff4d6d', to: '#ff8a00', blurb: 'Reflex and chaos' },
  Arcade: { icon: '🕹️', from: '#8e2de2', to: '#4a00e0', blurb: 'One more run' },
  Puzzle: { icon: '🧩', from: '#00c6ff', to: '#0072ff', blurb: 'Slow burn brain food' },
  Racing: { icon: '🏎️', from: '#f12711', to: '#f5af19', blurb: 'Full throttle' },
  Sports: { icon: '🏀', from: '#11998e', to: '#38ef7d', blurb: 'Physics, but sporty' },
  Shooter: { icon: '🎯', from: '#4b6cb7', to: '#182848', blurb: 'Precision or spray' },
  Strategy: { icon: '♟️', from: '#bdc3c7', to: '#2c3e50', blurb: 'Out-think them' },
  Casual: { icon: '🫧', from: '#f7971e', to: '#ffd200', blurb: 'Zero commitment' },
  Horror: { icon: '👻', from: '#232526', to: '#414345', blurb: 'Do not look back' },
  Multiplayer: { icon: '🌐', from: '#43cea2', to: '#185a9d', blurb: 'Friends optional' },
  Classic: { icon: '📼', from: '#fc466b', to: '#3f5efb', blurb: 'The originals' },
};

function Hero() {
  const { catalog } = useCatalog();
  const { stats } = useApp();
  const navigate = useNavigate();
  const games = catalog?.games || [];
  const featured = games.filter((g) => g.featured).slice(0, 3);
  const emuCount = catalog?.emulators.length || 28;
  const total = games.length || 55;

  const floats = [
    { top: '2%', left: '4%', w: 190, r: -5, d: '0s', game: featured[0] },
    { top: '30%', right: '0%', w: 168, r: 5, d: '-2.4s', game: featured[1] },
    { bottom: '4%', left: '22%', w: 152, r: -2, d: '-4.8s', game: featured[2] },
  ];

  return (
    <section className="hero">
      <div className="hero-inner">
        <div>
          <motion.div
            className="eyebrow"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <span className="badge badge-live" style={{ marginRight: 4 }}>
              <span className="dot" /> Live hub
            </span>
            {emuCount} emulator cores · zero installs
          </motion.div>

          <motion.h1
            className="display"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          >
            Every game you were
            <br />
            told you <span className="grad-text">couldn’t</span> play.
          </motion.h1>

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Unblocked browser games, {emuCount} retro emulator stations, Flash relics, DOS classics and a genuine APK
            runner — all inside one absurdly fast hub. No installs, no sign-in walls. Just play.
          </motion.p>

          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <MagneticButton className="btn btn-primary btn-lg" onClick={() => navigate('/games')}>
              <Play size={17} fill="currentColor" /> Start playing
            </MagneticButton>
            <MagneticButton
              className="btn btn-lg"
              onClick={() => navigate('/emulators')}
              style={{ background: 'color-mix(in srgb, var(--text) 6%, transparent)' }}
            >
              <Boxes size={17} /> Open emulators
            </MagneticButton>
          </motion.div>

          <motion.div
            className="hero-stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
          >
            <div className="hero-stat">
              <div className="n"><Counter to={total} suffix="+" /></div>
              <div className="l">games ready to launch</div>
            </div>
            <div className="hero-stat">
              <div className="n"><Counter to={emuCount} /></div>
              <div className="l">emulator cores</div>
            </div>
            <div className="hero-stat">
              <div className="n"><Counter to={3} /></div>
              <div className="l">retro runtimes</div>
            </div>
            <div className="hero-stat">
              <div className="n">{stats.minutes ? <Counter to={stats.minutes} suffix="m" /> : '∞'}</div>
              <div className="l">{stats.minutes ? 'your playtime' : 'free forever'}</div>
            </div>
          </motion.div>
        </div>

        <div className="hero-visual">
          <div
            style={{
              position: 'absolute',
              inset: '8% 6%',
              borderRadius: '50%',
              border: '1px dashed var(--line-strong)',
              animation: 'spin 60s linear infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '18%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--glow), transparent 65%)',
              filter: 'blur(10px)',
            }}
          />
          {floats.map((f, i) =>
            f.game ? (
              <motion.div
                key={f.game.id}
                className="float-card"
                style={{ top: f.top, left: f.left, right: f.right, bottom: f.bottom, width: f.w, ['--r' as any]: `${f.r}deg`, animationDelay: f.d }}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => navigate(`/game/${f.game!.id}`)}
                whileHover={{ scale: 1.04 }}
              >
                <div
                  className="mini-cover"
                  style={{ background: `linear-gradient(135deg, ${f.game.cover.from}, ${f.game.cover.to})` }}
                >
                  {f.game.cover.emoji}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, fontFamily: 'var(--display)' }}>{f.game.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Star size={10} fill="#ffd166" stroke="#ffd166" /> {f.game.rating} · {fmt.num(f.game.players)} playing
                </div>
              </motion.div>
            ) : null
          )}
          <motion.div
            className="float-card"
            style={{ right: '14%', bottom: '16%', width: 168, ['--r' as any]: '3deg', animationDelay: '-1.2s' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.7 }}
          >
            <div className="row" style={{ gap: 8 }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                  flexShrink: 0,
                }}
              >
                <Zap size={16} color="#fff" />
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Instant boot</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>0.4s median</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="scroll-marquee" style={{ marginTop: 46 }}>
        <div className="scroll-marquee-track">
          {[...games, ...games].slice(0, 40).map((g, i) => (
            <Link
              key={`${g.id}-${i}`}
              to={`/game/${g.id}`}
              className="row"
              style={{
                gap: 8,
                padding: '7px 14px 7px 7px',
                borderRadius: 999,
                border: '1px solid var(--line)',
                background: 'color-mix(in srgb, var(--text) 3%, transparent)',
                flexShrink: 0,
                fontSize: 12.5,
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 13,
                  background: `linear-gradient(135deg, ${g.cover.from}, ${g.cover.to})`,
                }}
              >
                {g.cover.emoji}
              </span>
              {g.title}
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>★ {g.rating}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContinueRail() {
  const { catalog } = useCatalog();
  const { favorites } = useApp();
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem('ubid.recent') || '[]'));
    } catch {
      setRecent([]);
    }
  }, []);

  const ids = [...new Set([...recent, ...favorites])].slice(0, 8);
  const games = ids.map((id) => catalog?.games.find((g) => g.id === id)).filter(Boolean) as NonNullable<typeof catalog>['games'];
  if (!games.length) return null;

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow"><Play size={12} /> Pick up where you left off</div>
          <h2 style={{ marginTop: 10 }}>Continue playing</h2>
        </div>
        <Link to="/games?fav=1" className="btn btn-sm">
          <Heart size={13} /> Your library
        </Link>
      </div>
      <Stagger className="rail">
        {games.map((g, i) => (
          <GameCard key={g.id} game={g} index={i} />
        ))}
      </Stagger>
    </section>
  );
}

function FeaturedRail() {
  const { catalog, loading } = useCatalog();
  const games = (catalog?.games || []).filter((g) => g.featured || g.hot).slice(0, 10);
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow">Hand-picked</div>
          <h2 style={{ marginTop: 10 }}>Tonight’s headliners</h2>
          <p>Big hitters, quietly excellent indie gems, and the ones your group chat keeps mentioning.</p>
        </div>
        <Link to="/games" className="btn btn-sm">
          Browse everything <ArrowRight size={14} />
        </Link>
      </div>
      <Stagger className="rail">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: 0 }}>
                <div className="skeleton" style={{ aspectRatio: '16/11', borderRadius: 0 }} />
                <div style={{ padding: 14 }}>
                  <div className="skeleton" style={{ height: 13, width: '60%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 10, width: '85%' }} />
                </div>
              </div>
            ))
          : games.map((g, i) => <GameCard key={g.id} game={g} index={i} />)}
      </Stagger>
    </section>
  );
}

function VibeGrid() {
  const { catalog } = useCatalog();
  const categories = (catalog?.categories || []).filter((c) => c !== 'All');
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    (catalog?.games || []).forEach((g) => (map[g.category] = (map[g.category] || 0) + 1));
    return map;
  }, [catalog]);

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow">Find your mood</div>
          <h2 style={{ marginTop: 10 }}>Browse by vibe</h2>
        </div>
      </div>
      <Stagger className="grid-games" gap={0.04}>
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat] || { icon: '🎲', from: '#7c5cff', to: '#00e0ff', blurb: 'A bit of everything' };
          return (
            <motion.div key={cat} variants={staggerItem}>
              <Link to={`/games?category=${encodeURIComponent(cat)}`}>
                <TiltCard tilt={4} style={{ padding: 18, minHeight: 124, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 20,
                      background: `linear-gradient(135deg, ${meta.from}, ${meta.to})`,
                      boxShadow: `0 10px 26px -12px ${meta.from}`,
                    }}
                  >
                    {meta.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 15, marginTop: 14 }}>{cat}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      {meta.blurb} · {counts[cat] || 0} games
                    </div>
                  </div>
                </TiltCard>
              </Link>
            </motion.div>
          );
        })}
      </Stagger>
    </section>
  );
}

function Trending() {
  const { catalog } = useCatalog();
  const games = [...(catalog?.games || [])].sort((a, b) => b.players - a.players).slice(0, 8);
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow"><Flame size={12} /> Trending now</div>
          <h2 style={{ marginTop: 10 }}>What everyone’s playing</h2>
        </div>
        <Link to="/games?sort=popular" className="btn btn-sm">
          See the chart <ArrowRight size={14} />
        </Link>
      </div>
      <Stagger className="grid-games">
        {games.map((g, i) => (
          <GameCard key={g.id} game={g} index={i} />
        ))}
      </Stagger>
    </section>
  );
}

function EmulatorBand() {
  const { catalog } = useCatalog();
  const emus = (catalog?.emulators || []).slice(0, 8);
  return (
    <Reveal>
      <section className="section">
        <TiltCard
          tilt={1.5}
          style={{
            padding: 0,
            overflow: 'hidden',
            background:
              'radial-gradient(700px 400px at 88% 10%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 65%), color-mix(in srgb, var(--text) 3%, transparent)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)', gap: 0 }}>
            <div style={{ padding: '38px 34px' }}>
              <div className="eyebrow"><Boxes size={12} /> Emulator stations</div>
              <h2 style={{ fontSize: 'clamp(26px,3vw,36px)', margin: '12px 0 12px', letterSpacing: '-0.04em' }}>
                Your childhood console,
                <br />
                booted in a tab.
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: '46ch', lineHeight: 1.7 }}>
                {catalog?.emulators.length || 28} cores powered by EmulatorJS — NES to Dreamcast, Game Boy to Neo Geo.
                Drop in a ROM, get save states, fast-forward, netplay and shaders. Everything runs locally in your browser.
              </p>
              <div className="pill-row" style={{ marginTop: 18 }}>
                {['Save states', 'Fast-forward', 'Netplay', 'CRT shaders', 'Gamepad support'].map((f) => (
                  <span className="tag" key={f}>
                    <ShieldCheck size={10} style={{ marginRight: 4, verticalAlign: -1 }} />
                    {f}
                  </span>
                ))}
              </div>
              <div className="row" style={{ gap: 10, marginTop: 26, flexWrap: 'wrap' }}>
                <Link to="/emulators" className="btn btn-primary">
                  <Boxes size={15} /> Pick a console
                </Link>
                <Link to="/labs" className="btn btn-ghost">
                  Flash, DOS & Scratch <ChevronRight size={14} />
                </Link>
              </div>
            </div>
            <div style={{ padding: 26, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'center' }}>
              {emus.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={`/emulators/${e.id}`}
                    className="row"
                    style={{
                      gap: 9,
                      padding: '10px 11px',
                      borderRadius: 12,
                      border: '1px solid var(--line)',
                      background: 'color-mix(in srgb, var(--text) 3%, transparent)',
                      fontSize: 12,
                      transition: 'all .25s',
                    }}
                  >
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        display: 'grid',
                        placeItems: 'center',
                        background: `color-mix(in srgb, ${e.color} 22%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${e.color} 40%, transparent)`,
                        flexShrink: 0,
                      }}
                    >
                      {e.icon}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.short}
                      </span>
                      <span style={{ color: 'var(--muted)', fontSize: 10.5 }}>{e.years}</span>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </TiltCard>
      </section>
    </Reveal>
  );
}

function LabsBand() {
  const { catalog } = useCatalog();
  const runtimes = catalog?.runtimes || [];
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow"><Sparkles size={12} /> Everything in between</div>
          <h2 style={{ marginTop: 10 }}>Labs & relics</h2>
          <p>The weird, wonderful stuff that never made it to a console.</p>
        </div>
        <Link to="/labs" className="btn btn-sm">
          Enter labs <ArrowRight size={14} />
        </Link>
      </div>
      <Stagger className="grid-games" gap={0.06}>
        {runtimes.map((r) => (
          <motion.div key={r.id} variants={staggerItem}>
            <Link to={`/labs?tool=${r.id}`}>
              <TiltCard tilt={5} style={{ padding: 20, minHeight: 168 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 21,
                    background: `color-mix(in srgb, ${r.color} 20%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${r.color} 38%, transparent)`,
                  }}
                >
                  {r.icon}
                </div>
                <div style={{ marginTop: 16, fontFamily: 'var(--display)', fontWeight: 600, fontSize: 15 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
                  {r.tech}
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 10 }}>{r.blurb}</p>
              </TiltCard>
            </Link>
          </motion.div>
        ))}
      </Stagger>
    </section>
  );
}

function ApkBand() {
  return (
    <Reveal>
      <section className="section">
        <TiltCard
          tilt={1}
          style={{
            padding: 0,
            background:
              'radial-gradient(600px 300px at 10% 0%, color-mix(in srgb, var(--accent-2) 18%, transparent), transparent 60%), color-mix(in srgb, var(--text) 3%, transparent)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,0.95fr) minmax(0,1.05fr)', alignItems: 'center' }}>
            <div style={{ padding: '34px 32px' }}>
              <div className="eyebrow"><Package size={12} /> APK runner</div>
              <h2 style={{ fontSize: 'clamp(24px,2.8vw,34px)', margin: '12px 0', letterSpacing: '-0.04em' }}>
                Sideload anything.
                <br />
                We do the boring part.
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>
                Drop an <span className="mono" style={{ color: 'var(--text)' }}>.apk</span> and the runner reads its
                manifest, resolves its icon, checks native ABIs and spins up an Android device for it — cloud device
                farm or your own self-hosted bridge.
              </p>
              <div className="row" style={{ gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
                <Link to="/apk" className="btn btn-primary">
                  <Package size={15} /> Upload an APK
                </Link>
                <Link to="/apk?tab=library" className="btn btn-ghost">
                  My installs <ChevronRight size={14} />
                </Link>
              </div>
            </div>
            <div style={{ padding: '26px 30px 26px 0', display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: 230,
                  height: 300,
                  borderRadius: 30,
                  border: '1px solid var(--line-strong)',
                  background: 'linear-gradient(160deg, #14141f, #06060b)',
                  boxShadow: '0 40px 80px -30px #000, inset 0 1px 0 rgba(255,255,255,.08)',
                  padding: 12,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: 22,
                    background: 'linear-gradient(160deg, color-mix(in srgb, var(--accent) 24%, #0b0b14), color-mix(in srgb, var(--accent-2) 12%, #05050a))',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div className="row" style={{ gap: 8 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#ff6b35,#ffd166)', display: 'grid', placeItems: 'center', fontSize: 17 }}>
                      📦
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 600 }}>SimCity BuildIt</div>
                      <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.55)', fontFamily: 'var(--mono)' }}>arm64-v8a · 892 MB</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, borderRadius: 14, background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.08)', display: 'grid', placeItems: 'center' }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                      style={{ width: 54, height: 54, borderRadius: '50%', border: '2px dashed rgba(255,255,255,.35)' }}
                    />
                  </div>
                  <div className="row" style={{ gap: 6, fontSize: 9.5, color: 'rgba(255,255,255,.6)', fontFamily: 'var(--mono)' }}>
                    <span className="badge badge-live" style={{ fontSize: 8.5 }}><span className="dot" />Booting</span>
                    <span>dex ✓ manifest ✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TiltCard>
      </section>
    </Reveal>
  );
}

function CommunityPreview() {
  const [posts, setPosts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    api.get('/api/community/posts?sort=top').then((p) => setPosts(p.slice(0, 3))).catch(() => {});
    api.get('/api/community/stats').then(setStats).catch(() => {});
  }, []);

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow"><MessageSquare size={12} /> Community</div>
          <h2 style={{ marginTop: 10 }}>The lobby is loud</h2>
          <p>Challenges, tech help and nostalgia — hosted by people who actually play.</p>
        </div>
        <Link to="/community" className="btn btn-sm">
          Open feed <ArrowRight size={14} />
        </Link>
      </div>
      <div className="split-2">
        <div className="stack">
          {posts.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06}>
              <Link to="/community" className="post" style={{ display: 'block' }}>
                <div className="post-head">
                  <span className="avatar" style={{ ['--hue' as any]: p.author.hue }}>{p.author.avatar}</span>
                  <div>
                    <div className="post-author">{p.author.displayName}</div>
                    <div className="post-meta">@{p.author.username} · {fmt.ago(p.createdAt)}</div>
                  </div>
                  <span className="badge" style={{ marginLeft: 'auto' }}>#{p.tag}</span>
                </div>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 15, marginBottom: 5 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.body}
                </div>
                <div className="row" style={{ gap: 14, marginTop: 12, fontSize: 11.5, color: 'var(--muted)' }}>
                  <span className="row" style={{ gap: 4 }}><ArrowUpRight size={12} /> {p.votes} votes</span>
                  <span className="row" style={{ gap: 4 }}><MessageSquare size={12} /> {p.comments} replies</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <div className="stack">
            <div className="card" style={{ padding: 22 }}>
              <div className="eyebrow">Hub pulse</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                <div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600 }}>{stats?.members ?? '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>members</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600 }}>{stats?.posts ?? '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>threads</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600 }}>{stats?.comments ?? '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>replies</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600 }}>{stats?.hoursPlayed ?? 0}h</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>logged playtime</div>
                </div>
              </div>
              <div className="hairline" />
              <Link to="/signup" className="btn btn-primary" style={{ width: '100%' }}>
                <Gamepad2 size={15} /> Join the hub
              </Link>
            </div>
            <div className="card" style={{ padding: 18, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.65 }}>
              <Sparkles size={16} style={{ color: 'var(--accent-2)', marginBottom: 8 }} />
              Accounts keep your library, scores, themes and APK installs in sync across every device you sign in from.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Home() {
  return (
    <div className="page">
      <Hero />
      <ContinueRail />
      <FeaturedRail />
      <VibeGrid />
      <Trending />
      <EmulatorBand />
      <LabsBand />
      <ApkBand />
      <CommunityPreview />
    </div>
  );
}
