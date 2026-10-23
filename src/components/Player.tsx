import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  Check,
  Crown,
  Expand,
  Gamepad2,
  Heart,
  Info,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trophy,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../lib/api';
import { useCatalog, type Game } from '../lib/catalog';
import { useApp } from '../lib/store';
import { ProviderBadge } from './GameCard';

type Score = { username: string; avatar: string; avatar_hue: number; score: number; game_id: string };

export function Player() {
  const { player, closePlayer, favorites, toggleFavorite, toast, user } = useApp();
  const { catalog } = useCatalog();
  const game = useMemo(() => catalog?.games.find((g) => g.id === player) || null, [player, catalog]);
  const [sourceIdx, setSourceIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [scores, setScores] = useState<Score[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef<number>(Date.now());

  const source = game?.sources[Math.min(sourceIdx, (game?.sources.length || 1) - 1)];
  const isFav = game ? favorites.includes(game.id) : false;

  useEffect(() => {
    if (!game) return;
    setSourceIdx(0);
    setLoading(true);
    setSlow(false);
    setReloadKey((k) => k + 1);
    startedRef.current = Date.now();
    setScores([]);
    api.get<Score[]>(`/api/leaderboard?game=${encodeURIComponent(game.id)}`).then(setScores).catch(() => {});
  }, [game?.id]);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setSlow(true), 11000);
    return () => clearTimeout(t);
  }, [loading, reloadKey, sourceIdx]);

  const reportPlay = useCallback(() => {
    if (!game) return;
    const seconds = Math.round((Date.now() - startedRef.current) / 1000);
    startedRef.current = Date.now();
    api.post('/api/play', { gameId: game.id, provider: source?.provider, seconds }).catch(() => {});
  }, [game, source]);

  // built-in games report scores back through postMessage
  useEffect(() => {
    if (!game) return;
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (data && data.type === 'ubid:score' && typeof data.score === 'number') {
        api.post('/api/scores', { gameId: data.game || game.id, score: data.score }).catch(() => {});
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [game?.id]);

  useEffect(() => {
    if (!player) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePlayer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player, closePlayer]);

  useEffect(() => {
    return () => {
      if (game) reportPlay();
    };
  }, [game?.id]);

  const requestFullscreen = () => {
    const el = wrapRef.current?.querySelector('iframe') as HTMLElement | null;
    const subject = (el?.parentElement || wrapRef.current) as any;
    if (subject?.requestFullscreen) subject.requestFullscreen().catch(() => toast('Fullscreen was blocked by the browser.', 'error'));
  };

  const nextSource = () => {
    if (!game) return;
    setSourceIdx((i) => (i + 1) % game.sources.length);
    setLoading(true);
    setSlow(false);
  };

  const related = useMemo(
    () =>
      (catalog?.games || [])
        .filter((g) => game && g.id !== game.id && (g.category === game.category || g.tags.some((t) => game.tags.includes(t))))
        .slice(0, 5),
    [catalog, game]
  );

  return (
    <AnimatePresence>
      {game && (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={closePlayer}
        >
          <motion.div
            className="player-shell"
            initial={{ scale: 0.94, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="player-head">
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 17,
                  background: `linear-gradient(135deg, ${game.cover.from}, ${game.cover.to})`,
                  flexShrink: 0,
                }}
              >
                {game.cover.emoji}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, fontFamily: 'var(--display)' }}>{game.title}</div>
                <div className="row" style={{ gap: 7, fontSize: 11.5, color: 'var(--muted)' }}>
                  <span>{game.category}</span>
                  <span>·</span>
                  <span>{fmt.num(game.players)} playing</span>
                </div>
              </div>
              <div className="spacer" />
              <button
                className="btn btn-sm"
                onClick={() => toggleFavorite(game.id)}
                style={{ color: isFav ? '#ff6b9d' : undefined }}
                title={user ? 'Toggle library' : 'Sign in to save'}
              >
                <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
                {isFav ? 'Saved' : 'Save'}
              </button>
              <button className="icon-btn" onClick={requestFullscreen} aria-label="Fullscreen" title="Fullscreen">
                <Expand />
              </button>
              <button className="icon-btn" onClick={closePlayer} aria-label="Close player">
                <X />
              </button>
            </div>

            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div className="player-frame-wrap" ref={wrapRef}>
                  <AnimatePresence>
                    {loading && (
                      <motion.div
                        className="player-loading"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                      >
                        <div style={{ position: 'relative' }}>
                          <div className="loader-ring" />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 14,
                            }}
                          >
                            🎮
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--text)' }}>
                          Booting {game.title}
                        </div>
                        <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                          {source?.label || 'source'} · {loading ? 'negotiating' : 'ready'}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {source && (
                    <iframe
                      key={`${source.provider}-${source.url}-${reloadKey}`}
                      src={source.url}
                      title={game.title}
                      allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope; clipboard-write; encrypted-media"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      onLoad={() => setLoading(false)}
                    />
                  )}
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderTop: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    background: 'color-mix(in srgb, var(--text) 2%, transparent)',
                  }}
                >
                  <span className="eyebrow" style={{ fontSize: 9.5 }}>Source</span>
                  {game.sources.map((s, i) => (
                    <button
                      key={`${s.provider}-${i}`}
                      className={`chip ${i === sourceIdx ? 'active' : ''}`}
                      onClick={() => {
                        setSourceIdx(i);
                        setLoading(true);
                        setSlow(false);
                      }}
                      style={{ padding: '5px 11px', fontSize: 11.5 }}
                    >
                      {s.label}
                    </button>
                  ))}
                  <span className="small muted" style={{ fontSize: 11 }}>
                    Blank screen? Some providers block embedding.
                  </span>
                  <div className="spacer" />
                  <button className="btn btn-ghost btn-sm" onClick={() => setReloadKey((k) => k + 1)}>
                    <RefreshCw size={13} /> Reload
                  </button>
                  <a className="btn btn-ghost btn-sm" href={source?.url} target="_blank" rel="noreferrer">
                    <ArrowUpRight size={13} /> Open in tab
                  </a>
                </div>

                {slow && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{ padding: '12px 14px', borderTop: '1px solid var(--line)' }}
                  >
                    <div className="note warn">
                      <ShieldAlert />
                      <div>
                        <strong style={{ color: 'var(--text)' }}>This source is taking a while.</strong> Some providers block
                        embedding or region-lock certain titles. Try another source, or open the game in a new tab.
                        {game.sources.length > 1 && (
                          <div style={{ marginTop: 8 }}>
                            <button className="btn btn-sm" onClick={nextSource}>
                              Switch to {game.sources[(sourceIdx + 1) % game.sources.length].label}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <aside className="player-side">
                <div className="eyebrow">About this game</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, marginTop: 10 }}>{game.tagline}</p>
                <div className="pill-row" style={{ marginTop: 12 }}>
                  {game.tags.map((t) => (
                    <span className="tag" key={t}>#{t}</span>
                  ))}
                </div>
                <div className="hairline" />
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Provider</span>
                  <ProviderBadge provider={source?.provider || 'local'} />
                </div>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Rating</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>★ {game.rating.toFixed(1)}</span>
                </div>
                <div className="hairline" />

                <div className="eyebrow" style={{ marginBottom: 10 }}>
                  <Trophy size={12} /> High scores
                </div>
                {scores.length === 0 ? (
                  <div style={{ fontSize: 12.2, color: 'var(--muted)', lineHeight: 1.6 }}>
                    No runs recorded yet. Play a round on a built-in arcade title and your score lands here.
                  </div>
                ) : (
                  <div className="stack" style={{ gap: 6 }}>
                    {scores.slice(0, 5).map((s, i) => (
                      <div key={`${s.username}-${i}`} className="row" style={{ fontSize: 12.5, gap: 8 }}>
                        <span style={{ width: 16, color: i === 0 ? '#ffd166' : 'var(--muted)', fontFamily: 'var(--mono)' }}>
                          {i === 0 ? <Crown size={12} /> : i + 1}
                        </span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.username}</span>
                        <span className="mono" style={{ fontWeight: 600 }}>{fmt.num(s.score)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="hairline" />
                <div className="eyebrow" style={{ marginBottom: 10 }}>Up next</div>
                <div className="stack" style={{ gap: 7 }}>
                  {related.map((g) => (
                    <RelatedRow key={g.id} game={g} />
                  ))}
                </div>

                <div className="note" style={{ marginTop: 16 }}>
                  <Info />
                  <div>
                    Third-party titles stream from their official players. If one is blocked, switch sources — installed
                    games always run locally.
                  </div>
                </div>
              </aside>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RelatedRow({ game }: { game: Game }) {
  const { openPlayer } = useApp();
  return (
    <button
      onClick={() => openPlayer(game.id)}
      className="row"
      style={{
        gap: 9,
        padding: 6,
        borderRadius: 10,
        border: '1px solid transparent',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        color: 'var(--text)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'color-mix(in srgb, var(--text) 6%, transparent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          display: 'grid',
          placeItems: 'center',
          fontSize: 15,
          background: `linear-gradient(135deg, ${game.cover.from}, ${game.cover.to})`,
          flexShrink: 0,
        }}
      >
        {game.cover.emoji}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {game.title}
      </span>
      <Gamepad2 size={13} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />
    </button>
  );
}
