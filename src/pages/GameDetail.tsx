import { ArrowLeft, Check, Heart, Play, Star, Trophy, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fmt } from '../lib/api';
import { useCatalog } from '../lib/catalog';
import { useApp } from '../lib/store';
import { GameCard } from '../components/GameCard';
import { EmptyState } from '../components/ui';

export function GameDetail() {
  const { id } = useParams();
  const { catalog, loading } = useCatalog();
  const { openPlayer, favorites, toggleFavorite } = useApp();
  const navigate = useNavigate();
  const [scores, setScores] = useState<any[]>([]);
  const game = useMemo(() => catalog?.games.find((g) => g.id === id), [catalog, id]);
  const isFav = favorites.includes(id || '');

  useEffect(() => {
    if (!id) return;
    api.get(`/api/leaderboard?game=${encodeURIComponent(id)}`).then(setScores).catch(() => {});
  }, [id]);

  const related = useMemo(
    () => (catalog?.games || []).filter((g) => g.id !== id && (g.category === game?.category || g.tags.some((t) => game?.tags.includes(t)))).slice(0, 4),
    [catalog, game, id]
  );

  if (loading) return <div className="skeleton" style={{ height: 420, borderRadius: 24 }} />;

  if (!game)
    return (
      <EmptyState icon={ArrowLeft} title="Game not found">
        That title isn’t in the catalog.
        <div style={{ marginTop: 14 }}>
          <Link to="/games" className="btn btn--sm btn--primary">Back to the library</Link>
        </div>
      </EmptyState>
    );

  return (
    <>
      <button className="btn btn--sm btn--ghost" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="split">
        <div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '16 / 9' }}>
              <img src={game.cover} alt={`${game.title} screenshot`} width={1280} height={720} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ padding: 24 }}>
              <div className="row wrap" style={{ gap: 8, marginBottom: 10 }}>
                <span className="pill pill--green"><span className="dot" />Self-hosted</span>
                <span className="pill">{game.category}</span>
                {game.hot && <span className="pill pill--blue">Popular</span>}
              </div>
              <h1 className="h2">{game.title}</h1>
              <p className="muted" style={{ marginTop: 8, fontSize: 16 }}>{game.tagline}</p>

              <div className="row wrap" style={{ gap: 10, marginTop: 20 }}>
                <button className="btn btn--primary btn--lg" onClick={() => openPlayer(game.id)}>
                  <Play size={16} fill="currentColor" /> Play now
                </button>
                <button className="btn btn--lg btn--outline" onClick={() => toggleFavorite(game.id)}>
                  <Heart size={15} fill={isFav ? 'currentColor' : 'none'} style={{ color: isFav ? '#e0245e' : undefined }} />
                  {isFav ? 'In library' : 'Add to library'}
                </button>
                <div className="spacer" />
                <span className="row" style={{ gap: 16, color: 'var(--ink-2)', fontSize: 14 }}>
                  <span className="row" style={{ gap: 5 }}>
                    <Star size={13} fill="currentColor" strokeWidth={0} style={{ color: '#f5a623' }} /> {game.rating.toFixed(1)}
                  </span>
                  <span className="row" style={{ gap: 5 }}><Users size={13} /> {fmt.num(game.players)}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="card card--pad" style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 16 }}>How this runs</h3>
            <div className="stack" style={{ gap: 10, marginTop: 12 }}>
              {[
                'Served from this hub as a static build — no third-party player, no iframe from another company.',
                'Progress and settings stay in your browser; sign in to store high scores on your account.',
                game.tags.includes('webgl') ? 'Uses WebGL — needs a reasonably modern GPU.' : 'Runs comfortably on phones and laptops.',
              ].map((t) => (
                <div key={t} className="row" style={{ gap: 9, fontSize: 13.5, color: 'var(--ink-2)', alignItems: 'flex-start' }}>
                  <Check size={15} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card card--pad">
            <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Trophy size={15} /> High scores
            </h3>
            {scores.length === 0 ? (
              <p className="small muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
                No scores recorded yet. Play a round while signed in and your name lands here.
              </p>
            ) : (
              <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                {scores.map((s, i) => (
                  <div key={i} className="row" style={{ fontSize: 13.5 }}>
                    <span className="tiny muted" style={{ width: 14 }}>{i + 1}</span>
                    <span style={{ flex: 1 }}>{s.username}</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{fmt.num(s.score)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card card--pad">
            <h3 style={{ fontSize: 15 }}>Details</h3>
            <div className="stack" style={{ gap: 9, marginTop: 12, fontSize: 13.5 }}>
              {[
                ['Genre', game.category],
                ['Players now', fmt.num(game.players)],
                ['Rating', `${game.rating.toFixed(1)} / 5`],
                ['Hosting', 'This server'],
                ['Tags', game.tags.filter((t) => t !== 'offline' && t !== 'self-hosted').join(', ') || '—'],
              ].map(([k, v]) => (
                <div key={k} className="row row--between" style={{ gap: 12 }}>
                  <span className="muted">{k}</span>
                  <span style={{ textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 style={{ fontSize: 26 }}>More like this</h2>
            <Link to="/games" className="btn btn--sm btn--outline">All games</Link>
          </div>
          <div className="grid">
            {related.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
