import {
  ArrowRight,
  Boxes,
  Check,
  Cpu,
  Download,
  Gamepad2,
  MessageCircle,
  Package,
  Play,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fmt } from '../lib/api';
import { useCatalog } from '../lib/catalog';
import { useApp } from '../lib/store';
import { CatIcon, Reveal, SkeletonTile } from '../components/ui';
import { GameCard } from '../components/GameCard';

function Hero() {
  const { catalog } = useCatalog();
  const { openPlayer, stats } = useApp();
  const navigate = useNavigate();
  const games = catalog?.games || [];
  const featured = games.find((g) => g.featured) || games[0];

  return (
    <section className="hero">
      <div className="hero__text">
        <span className="eyebrow"><span className="dot" style={{ background: 'var(--green)' }} /> Self-hosted · no embeds</span>
        <h1 className="h1" style={{ marginTop: 12 }}>
          Every game.
          <br />
          Hosted right here.
        </h1>
        <p className="lede" style={{ marginTop: 18 }}>
          Sixteen hand-picked games served from our own servers, thirty retro consoles in your browser, and a real
          Android APK runner. No third-party players, no pop-ups, no tracking.
        </p>
        <div className="hero__cta">
          <button className="btn btn--primary btn--lg" onClick={() => (featured ? openPlayer(featured.id) : navigate('/games'))}>
            <Play size={16} fill="currentColor" /> Play {featured?.title || 'now'}
          </button>
          <Link to="/games" className="btn btn--lg btn--outline">
            Browse all games
          </Link>
        </div>
        <div className="hero__stats">
          <div>
            <div className="stat__n">{games.length || 16}</div>
            <div className="stat__l">games installed</div>
          </div>
          <div>
            <div className="stat__n">{catalog?.emulators.length || 30}</div>
            <div className="stat__l">emulator cores</div>
          </div>
          <div>
            <div className="stat__n">{stats.minutes ? `${stats.minutes}m` : '0'}</div>
            <div className="stat__l">your playtime</div>
          </div>
          <div>
            <div className="stat__n">0</div>
            <div className="stat__l">ads, ever</div>
          </div>
        </div>
      </div>

      {featured && (
        <div className="hero__stage">
          <img src={featured.cover} alt={`${featured.title} gameplay`} width={1600} height={840} fetchPriority="high" />
          <div className="hero__caption">
            <div>
              <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                <span className="pill pill--green"><span className="dot" />Installed</span>
                <span className="pill">{featured.category}</span>
              </div>
              <h3>{featured.title}</h3>
              <p>{featured.tagline}</p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn--primary" onClick={() => openPlayer(featured.id)}>
                <Play size={14} fill="currentColor" /> Play now
              </button>
              <Link to={`/game/${featured.id}`} className="btn btn--outline">Details</Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ContinueRow() {
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

  const ids = [...new Set([...recent, ...favorites])].slice(0, 5);
  const games = ids.map((id) => catalog?.games.find((g) => g.id === id)).filter(Boolean) as any[];
  if (!games.length) return null;

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Pick up where you left off</h2>
        </div>
        <Link to="/account?tab=library" className="btn btn--sm btn--outline">Your library</Link>
      </div>
      <div className="grid grid--tight">
        {games.map((g, i) => (
          <GameCard key={g.id} game={g} eager={i < 3} />
        ))}
      </div>
    </section>
  );
}

function Library() {
  const { catalog, loading } = useCatalog();
  const [category, setCategory] = useState('All');
  const games = catalog?.games || [];
  const categories = catalog?.categories || ['All'];

  const list = useMemo(
    () => (category === 'All' ? games : games.filter((g) => g.category === category)),
    [games, category]
  );

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>The library</h2>
          <p>Everything below is served from this hub. Open a game and it starts — no redirects, no waiting rooms.</p>
        </div>
        <Link to="/games" className="btn btn--sm">
          See all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="chips" style={{ marginBottom: 22 }}>
        {categories.map((c) => (
          <button key={c} className={`chip ${category === c ? 'is-active' : ''}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonTile key={i} />)
          : list.slice(0, 8).map((g, i) => <GameCard key={g.id} game={g} eager={i < 4} />)}
      </div>
    </section>
  );
}

function EmulatorSection() {
  const { catalog } = useCatalog();
  const cores = catalog?.emulators || [];
  const shown = cores.slice(0, 10);

  return (
    <section className="section">
      <div className="card feature-split" style={{ padding: 'clamp(24px, 4vw, 44px)' }}>
        <div>
          <span className="eyebrow"><Boxes size={13} /> Emulator stations</span>
          <h2 className="h2" style={{ marginTop: 12 }}>Your childhood console,<br />booted in a tab.</h2>
          <p className="muted" style={{ marginTop: 14, fontSize: 16, lineHeight: 1.6, maxWidth: '46ch' }}>
            {cores.length} cores running locally through WebAssembly — NES to Dreamcast, Game Boy to Neo Geo. Load a ROM
            you own and get save states, rewind, fast-forward and CRT shaders.
          </p>
          <div className="row wrap" style={{ gap: 8, marginTop: 18 }}>
            {['Save states', 'Rewind', 'Gamepad', 'Shaders'].map((f) => (
              <span className="pill pill--outline" key={f}><Check size={11} /> {f}</span>
            ))}
          </div>
          <div className="row" style={{ gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            <Link to="/emulators" className="btn btn--primary">Choose a console</Link>
            <Link to="/labs" className="btn btn--ghost">Flash, DOS &amp; Scratch <ArrowRight size={14} /></Link>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {shown.map((e) => (
            <Link
              key={e.id}
              to={`/emulators/${e.id}`}
              className="row"
              style={{
                gap: 10, padding: '10px 12px', borderRadius: 12,
                border: '1px solid var(--line-soft)', background: 'var(--surface)',
                fontSize: 13, color: 'var(--ink)',
              }}
            >
              <span
                style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  display: 'grid', placeItems: 'center',
                  background: 'var(--surface-2)', color: 'var(--ink-2)',
                }}
              >
                <CatIcon name={e.icon} size={15} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.short}</span>
                <span style={{ color: 'var(--ink-3)', fontSize: 11.5 }}>{e.years}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function LabsSection() {
  const { catalog } = useCatalog();
  const runtimes = catalog?.runtimes || [];

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Everything in between</h2>
          <p>Flash animations, DOS shareware and Scratch projects — three runtimes that refuse to let the old web die.</p>
        </div>
      </div>
      <div className="grid grid--3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {runtimes.map((r, i) => (
          <Reveal key={r.id} delay={i === 0 ? 0 : i === 1 ? 1 : 2}>
            <Link to={`/labs?tool=${r.id}`} className="card" style={{ display: 'block', padding: 24, height: '100%', color: 'var(--ink)' }}>
              <span
                style={{
                  width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center',
                  background: 'var(--surface-2)', color: 'var(--ink-2)', marginBottom: 16,
                }}
              >
                <CatIcon name={r.icon} size={20} />
              </span>
              <h3 style={{ fontSize: 17 }}>{r.name}</h3>
              <div className="tiny muted" style={{ marginTop: 2 }}>{r.tech}</div>
              <p className="small muted" style={{ marginTop: 10, lineHeight: 1.55 }}>{r.blurb}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ApkSection() {
  return (
    <section className="section">
      <div className="card feature-split feature-split--wide" style={{ padding: 'clamp(24px, 4vw, 44px)' }}>
        <div>
          <span className="eyebrow"><Package size={13} /> APK runner</span>
          <h2 className="h2" style={{ marginTop: 12 }}>Sideload anything.</h2>
          <p className="muted" style={{ marginTop: 14, fontSize: 16, lineHeight: 1.6, maxWidth: '48ch' }}>
            Drop an <span className="mono">.apk</span>. We parse the binary manifest, resolve the launcher icon, audit
            permissions and native ABIs, then install it on a real Android device that streams into this tab.
          </p>
          <div className="row" style={{ gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            <Link to="/apk" className="btn btn--primary"><Package size={14} /> Upload an APK</Link>
            <Link to="/apk?tab=library" className="btn btn--outline">My installs</Link>
          </div>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          {[
            { icon: Server, t: 'Real adb install', d: 'Your phone or a local emulator, via the bundled bridge.' },
            { icon: Download, t: 'Signed downloads', d: 'HMAC-protected links, expiring in ten minutes.' },
            { icon: ShieldCheck, t: 'Inspected first', d: 'Manifest, permissions and ABIs before anything boots.' },
            { icon: Cpu, t: 'Compatibility score', d: 'A plain-English verdict on whether it will run.' },
          ].map((f) => (
            <div key={f.t} className="row" style={{ gap: 12, padding: '12px 14px', border: '1px solid var(--line-soft)', borderRadius: 12 }}>
              <f.icon size={17} style={{ color: 'var(--ink-2)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 550 }}>{f.t}</div>
                <div className="tiny muted">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CommunitySection() {
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
          <h2>From the community</h2>
          <p>Weekly challenges, emulator help and nostalgia from {stats?.members ?? 0} members.</p>
        </div>
        <Link to="/community" className="btn btn--sm">Open feed <ArrowRight size={14} /></Link>
      </div>
      <div className="split">
        <div className="stack">
          {posts.map((p, i) => (
            <Reveal key={p.id} delay={i === 0 ? 0 : 1}>
              <Link to="/community" className="post" style={{ display: 'block', color: 'var(--ink)' }}>
                <div className="row" style={{ gap: 10, marginBottom: 8 }}>
                  <span className="avatar" style={{ width: 26, height: 26, fontSize: 11, ['--av' as any]: `hsl(${p.author.hue} 60% 46%)` }}>
                    {(p.author.displayName || '?').slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 550 }}>{p.author.displayName}</span>
                  <span className="tiny muted">{fmt.ago(p.createdAt)}</span>
                  <span className="pill" style={{ marginLeft: 'auto' }}>{p.tag}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{p.title}</div>
                <p className="small muted" style={{ marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {p.body}
                </p>
                <div className="row" style={{ gap: 14, marginTop: 10, fontSize: 12, color: 'var(--ink-3)' }}>
                  <span>{p.votes} votes</span>
                  <span>{p.comments} replies</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal delay={1}>
          <div className="card card--pad">
            <h3 style={{ fontSize: 16 }}>Hub activity</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
              {[
                [stats?.members ?? '—', 'members'],
                [stats?.posts ?? '—', 'threads'],
                [stats?.comments ?? '—', 'replies'],
                [`${stats?.hoursPlayed ?? 0}h`, 'logged playtime'],
              ].map(([n, l]) => (
                <div key={l as string}>
                  <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{n}</div>
                  <div className="tiny muted">{l}</div>
                </div>
              ))}
            </div>
            <hr className="hairline" />
            <Link to="/signup" className="btn btn--primary" style={{ width: '100%' }}>
              <Users size={14} /> Create an account
            </Link>
            <p className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
              Accounts keep your library, scores and themes in sync across devices.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Home() {
  return (
    <>
      <Hero />
      <ContinueRow />
      <Library />
      <EmulatorSection />
      <LabsSection />
      <ApkSection />
      <CommunitySection />
    </>
  );
}
