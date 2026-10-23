import {
  ArrowUpRight,
  Heart,
  Maximize2,
  RotateCw,
  Star,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../lib/api';
import { useCatalog, type Game } from '../lib/catalog';
import { useApp } from '../lib/store';
import { GameRow } from './GameCard';

type Score = { username: string; score: number; game_id: string; avatar_hue: number; display_name: string };

export function Player() {
  const { player, closePlayer, favorites, toggleFavorite } = useApp();
  const { catalog } = useCatalog();
  const game = useMemo(() => catalog?.games.find((g) => g.id === player) || null, [player, catalog]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [scores, setScores] = useState<Score[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef<number>(Date.now());
  const isFav = game ? favorites.includes(game.id) : false;

  useEffect(() => {
    if (!game) return;
    setLoading(true);
    setReloadKey((k) => k + 1);
    startedRef.current = Date.now();
    api.get<Score[]>(`/api/leaderboard?game=${encodeURIComponent(game.id)}`).then(setScores).catch(() => setScores([]));
  }, [game?.id]);

  const reportPlay = useCallback(() => {
    if (!game) return;
    const seconds = Math.round((Date.now() - startedRef.current) / 1000);
    if (seconds < 3) return;
    startedRef.current = Date.now();
    api.post('/api/play', { gameId: game.id, provider: 'local', seconds }).catch(() => {});
  }, [game?.id]);

  useEffect(() => {
    if (!player) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePlayer();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // never leave the page scroll-locked if the player unmounts mid-session
      document.body.style.overflow = '';
    };
  }, [player, closePlayer]);

  useEffect(() => () => reportPlay(), [game?.id]);

  // built-in games post scores back to the hub
  useEffect(() => {
    if (!game) return;
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (data && data.type === 'ubid:score' && typeof data.score === 'number') {
        api.post('/api/scores', { gameId: data.game || game.id, score: data.score }).catch(() => {});
        if (data.score > 0) {
          api
            .get<Score[]>(`/api/leaderboard?game=${encodeURIComponent(data.game || game.id)}`)
            .then(setScores)
            .catch(() => {});
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [game?.id]);

  const goFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => {});
  };

  const related = useMemo(
    () =>
      (catalog?.games || [])
        .filter((g) => game && g.id !== game.id && (g.category === game.category || g.tags.some((t) => game.tags.includes(t))))
        .slice(0, 4),
    [catalog, game]
  );

  if (!game) return null;
  const src = game.sources[0]?.url;

  return (
    <div className="modal" onClick={closePlayer} role="dialog" aria-modal="true" aria-label={`${game.title} player`}>
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="player__head">
          <img src={game.cover} alt="" width={34} height={34} style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{game.title}</div>
            <div className="tiny muted">{game.category} · playable offline</div>
          </div>
          <div className="spacer" />
          <button className="btn btn--sm btn--outline" onClick={() => toggleFavorite(game.id)}>
            <Heart size={13} fill={isFav ? 'currentColor' : 'none'} style={{ color: isFav ? '#e0245e' : undefined }} />
            {isFav ? 'Saved' : 'Save'}
          </button>
          <button className="iconbtn" onClick={goFullscreen} aria-label="Fullscreen"><Maximize2 /></button>
          <button className="iconbtn" onClick={closePlayer} aria-label="Close player"><X /></button>
        </div>

        <div className="player__body">
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="player__stage" ref={stageRef}>
              {loading && (
                <div className="loading-veil">
                  <div className="spinner" />
                  <div style={{ fontSize: 14 }}>Starting {game.title}</div>
                </div>
              )}
              <iframe
                key={`${game.id}-${reloadKey}`}
                src={src}
                title={game.title}
                allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope; clipboard-write"
                allowFullScreen
                onLoad={() => setLoading(false)}
              />
            </div>
            <div className="player__foot">
              <span className="pill pill--green"><span className="dot" />Self-hosted</span>
              <span className="tiny muted">Runs from this server — no third-party player, no ads, no tracker.</span>
              <div className="spacer" />
              <button className="btn btn--sm btn--ghost" onClick={() => setReloadKey((k) => k + 1)}>
                <RotateCw size={13} /> Restart
              </button>
              <a className="btn btn--sm btn--ghost" href={src} target="_blank" rel="noreferrer">
                <ArrowUpRight size={13} /> New tab
              </a>
            </div>
          </div>

          <aside className="player__side">
            <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-3)' }}>About</h4>
            <p className="small muted" style={{ marginTop: 8, lineHeight: 1.6 }}>{game.tagline}</p>
            <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
              {game.tags.filter((t) => t !== 'offline').map((t) => (
                <span className="tag" key={t}>{t}</span>
              ))}
            </div>
            <hr className="hairline" />
            <div className="row row--between" style={{ fontSize: 13 }}>
              <span className="muted">Rating</span>
              <span className="row" style={{ gap: 4, fontWeight: 550 }}>
                <Star size={12} fill="currentColor" strokeWidth={0} style={{ color: '#f5a623' }} /> {game.rating.toFixed(1)}
              </span>
            </div>
            <div className="row row--between" style={{ fontSize: 13, marginTop: 8 }}>
              <span className="muted">Playing now</span>
              <span className="row" style={{ gap: 4, fontWeight: 550 }}><Users size={12} /> {fmt.num(game.players)}</span>
            </div>
            <hr className="hairline" />

            <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={12} /> High scores
            </h4>
            <div className="stack" style={{ gap: 7, marginTop: 10 }}>
              {scores.length === 0 && <span className="tiny muted">No scores yet. Be the first.</span>}
              {scores.slice(0, 5).map((s, i) => (
                <div key={`${s.username}-${i}`} className="row" style={{ fontSize: 13 }}>
                  <span className="tiny muted" style={{ width: 14, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.username}</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{fmt.num(s.score)}</span>
                </div>
              ))}
            </div>

            <hr className="hairline" />
            <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-3)', marginBottom: 8 }}>Up next</h4>
            <div className="stack" style={{ gap: 4 }}>
              {related.map((g: Game) => (
                <GameRow key={g.id} game={g} />
              ))}
            </div>
            <Link to={`/game/${game.id}`} className="btn btn--sm btn--outline" style={{ width: '100%', marginTop: 14 }} onClick={closePlayer}>
              Game page
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
