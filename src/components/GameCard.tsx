import { Heart, Play, Star, Users } from 'lucide-react';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Game } from '../lib/catalog';
import { fmt } from '../lib/api';
import { useApp } from '../lib/store';

const Cover = memo(function Cover({ game, eager = false }: { game: Game; eager?: boolean }) {
  return (
    <div className="tile__media">
      <img
        src={game.cover}
        alt={`${game.title} gameplay`}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        width={800}
        height={500}
      />
    </div>
  );
});

export const GameCard = memo(function GameCard({ game, eager = false }: { game: Game; eager?: boolean }) {
  const { openPlayer, favorites, toggleFavorite } = useApp();
  const navigate = useNavigate();
  const isFav = favorites.includes(game.id);

  return (
    <article
      className="tile"
      onClick={() => openPlayer(game.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPlayer(game.id);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Play ${game.title}`}
    >
      <div style={{ position: 'relative' }}>
        <Cover game={game} eager={eager} />
        <div className="tile__badges">
          {game.hot && <span className="pill pill--dark">Popular</span>}
        </div>
        <button
          className={`tile__fav ${isFav ? 'is-on' : ''}`}
          aria-label={isFav ? `Remove ${game.title} from library` : `Save ${game.title}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(game.id);
          }}
        >
          <Heart size={14} fill={isFav ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      </div>
      <div className="tile__body">
        <h3 className="tile__title">
          <span>{game.title}</span>
          <span className="row" style={{ gap: 3, color: 'var(--ink-3)', fontSize: 12, fontWeight: 500 }}>
            <Star size={11} fill="currentColor" strokeWidth={0} style={{ color: '#f5a623' }} />
            {game.rating.toFixed(1)}
          </span>
        </h3>
        <p className="tile__desc">{game.tagline}</p>
        <div className="tile__meta">
          <Users size={12} />
          {fmt.num(game.players)} playing
          <span style={{ opacity: 0.5 }}>·</span>
          {game.category}
        </div>
      </div>
    </article>
  );
});

export function GameRow({ game }: { game: Game }) {
  const { openPlayer } = useApp();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => openPlayer(game.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, padding: 7, width: '100%',
        border: 0, background: 'transparent', borderRadius: 10, textAlign: 'left', color: 'var(--ink)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <img src={game.cover} alt="" loading="lazy" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 9, objectFit: 'cover' }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {game.title}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{game.category}</span>
      </span>
      <Play size={13} style={{ marginLeft: 'auto', color: 'var(--ink-3)', flexShrink: 0 }} />
    </button>
  );
}
