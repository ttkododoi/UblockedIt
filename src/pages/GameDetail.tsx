import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, Crown, Heart, Info, Play, Share2, Star, Trophy, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fmt } from '../lib/api';
import { useCatalog, type Game } from '../lib/catalog';
import { useApp } from '../lib/store';
import { Cover, GameCard, ProviderBadge } from '../components/GameCard';
import { MagneticButton, Reveal, Stagger } from '../components/ui';

type Score = { username: string; avatar: string; avatar_hue: number; score: number };

export function GameDetail() {
  const { id } = useParams();
  const { catalog, loading } = useCatalog();
  const { openPlayer, favorites, toggleFavorite, toast } = useApp();
  const navigate = useNavigate();
  const [scores, setScores] = useState<Score[]>([]);
  const game = useMemo(() => catalog?.games.find((g) => g.id === id), [catalog, id]);
  const isFav = favorites.includes(id || '');

  useEffect(() => {
    if (!id) return;
    api.get<Score[]>(`/api/leaderboard?game=${encodeURIComponent(id)}`).then(setScores).catch(() => {});
  }, [id]);

  const related = useMemo(
    () =>
      (catalog?.games || [])
        .filter((g) => g.id !== id && (g.category === game?.category || g.tags.some((t) => game?.tags.includes(t))))
        .slice(0, 4),
    [catalog, game, id]
  );

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 300, borderRadius: 28 }} />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page">
        <div className="empty">
          <div className="big">🎮</div>
          <h2 style={{ marginBottom: 8 }}>Game not found</h2>
          <p className="muted">That title isn’t in the catalog — it may have been removed.</p>
          <Link to="/games" className="btn btn-primary" style={{ marginTop: 16 }}>
            <ArrowLeft size={15} /> Back to library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 18 }}>
        <ArrowLeft size={14} /> Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 28 }} className="detail-grid">
        <Reveal>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ position: 'relative' }}>
              <Cover game={game} className="detail-cover" />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(0deg, rgba(4,4,10,.85), rgba(4,4,10,.15) 55%, transparent)',
                }}
              />
              <div style={{ position: 'absolute', bottom: 20, left: 22, right: 22 }}>
                <div className="row wrap" style={{ gap: 8, marginBottom: 10 }}>
                  {game.sources.map((s) => (
                    <ProviderBadge key={s.label} provider={s.provider} />
                  ))}
                  <span className="badge">#{game.category}</span>
                </div>
                <h1 style={{ fontSize: 'clamp(30px,4.4vw,50px)', color: '#fff', letterSpacing: '-0.045em' }}>{game.title}</h1>
                <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 14.5, marginTop: 6, maxWidth: '56ch' }}>{game.tagline}</p>
              </div>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <MagneticButton className="btn btn-primary" onClick={() => openPlayer(game.id)}>
                <Play size={16} fill="currentColor" /> Play now
              </MagneticButton>
              <button className="btn" onClick={() => toggleFavorite(game.id)} style={{ color: isFav ? '#ff6b9d' : undefined }}>
                <Heart size={15} fill={isFav ? 'currentColor' : 'none'} /> {isFav ? 'In library' : 'Add to library'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(window.location.href)
                    .then(() => toast('Link copied to clipboard.', 'success'))
                    .catch(() => toast('Could not copy the link.', 'error'));
                }}
              >
                <Share2 size={15} /> Share
              </button>
              <div className="spacer" />
              <span className="row" style={{ gap: 14, fontSize: 13, color: 'var(--muted)' }}>
                <span className="row" style={{ gap: 4 }}>
                  <Star size={13} fill="#ffd166" stroke="#ffd166" /> {game.rating.toFixed(1)}
                </span>
                <span className="row" style={{ gap: 4 }}>
                  <Users size={13} /> {fmt.num(game.players)}
                </span>
              </span>
            </div>
          </div>

          <div className="card" style={{ padding: 22, marginTop: 18 }}>
            <div className="eyebrow">Sources</div>
            <div className="stack" style={{ marginTop: 14, gap: 9 }}>
              {game.sources.map((s, i) => (
                <div key={`${s.provider}-${i}`} className="row" style={{ gap: 12, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--line)' }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', width: 18 }}>{String(i + 1).padStart(2, '0')}</span>
                  <ProviderBadge provider={s.provider} />
                  <span style={{ fontSize: 12.5, color: 'var(--muted)', flex: 1 }}>
                    {s.provider === 'local'
                      ? 'Runs from this hub — no external requests.'
                      : s.provider === 'crazygames'
                      ? 'Official CrazyGames embed player.'
                      : 'Official Poki listing — opens in a new tab if embedding is blocked.'}
                  </span>
                  {s.provider !== 'local' && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                      <ArrowUpRight size={13} />
                    </a>
                  )}
                </div>
              ))}
            </div>
            <div className="note" style={{ marginTop: 16 }}>
              <Info />
              <div>
                Some providers region-lock titles or block iframes. If a source doesn’t load, use the source switcher
                inside the player — installed builds always work.
              </div>
            </div>
          </div>
        </Reveal>

        <div className="stack">
          <Reveal delay={0.08}>
            <div className="card" style={{ padding: 22 }}>
              <div className="eyebrow"><Trophy size={12} /> Leaderboard</div>
              {scores.length === 0 ? (
                <p className="small muted" style={{ marginTop: 12, lineHeight: 1.65 }}>
                  No scores yet for this title. Built-in arcade games (Neon Serpent, Vector Breakout) post scores
                  automatically once you’re signed in.
                </p>
              ) : (
                <div className="stack" style={{ gap: 8, marginTop: 14 }}>
                  {scores.map((s, i) => (
                    <div key={`${s.username}-${i}`} className="row" style={{ gap: 10, fontSize: 13 }}>
                      <span style={{ width: 20, color: i === 0 ? '#ffd166' : 'var(--muted)' }}>
                        {i === 0 ? <Crown size={14} /> : i + 1}
                      </span>
                      <span className="avatar" style={{ ['--hue' as any]: s.avatar_hue, width: 26, height: 26, fontSize: 12, borderRadius: 8 }}>
                        {s.avatar}
                      </span>
                      <span style={{ flex: 1 }}>{s.username}</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{fmt.num(s.score)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.14}>
            <div className="card" style={{ padding: 22 }}>
              <div className="eyebrow">Details</div>
              <div className="stack" style={{ gap: 10, marginTop: 14, fontSize: 13 }}>
                {[
                  ['Genre', game.category],
                  ['Players online', fmt.num(game.players)],
                  ['Rating', `${game.rating.toFixed(1)} / 5`],
                  ['Works offline', game.sources.some((s) => s.provider === 'local') ? 'Yes' : 'No'],
                  ['Tags', game.tags.join(', ')],
                ].map(([k, v]) => (
                  <div key={k} className="row" style={{ justifyContent: 'space-between', gap: 14 }}>
                    <span className="muted">{k}</span>
                    <span style={{ textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="card" style={{ padding: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Quick switch</div>
              <div className="stack" style={{ gap: 7 }}>
                {related.slice(0, 3).map((g: Game) => (
                  <Link key={g.id} to={`/game/${g.id}`} className="row" style={{ gap: 10, padding: 6, borderRadius: 10 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${g.cover.from}, ${g.cover.to})`, fontSize: 15 }}>
                      {g.cover.emoji}
                    </span>
                    <span style={{ fontSize: 12.5 }}>{g.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow">More like this</div>
              <h2 style={{ marginTop: 10 }}>Keep the streak going</h2>
            </div>
            <Link to="/games" className="btn btn-sm">All games</Link>
          </div>
          <Stagger className="grid-games">
            {related.map((g, i) => (
              <GameCard key={g.id} game={g} index={i} />
            ))}
          </Stagger>
        </section>
      )}

      <style>{`
        .detail-cover { aspect-ratio: 16/8; }
        @media (max-width: 900px) {
          .detail-grid { grid-template-columns: 1fr !important; }
          .detail-cover { aspect-ratio: 16/11; }
        }
      `}</style>
    </div>
  );
}
