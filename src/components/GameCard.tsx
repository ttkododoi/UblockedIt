import { motion } from 'framer-motion';
import { Heart, Play, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Game } from '../lib/catalog';
import { fmt } from '../lib/api';
import { useApp } from '../lib/store';
import { staggerItem, TiltCard } from './ui';
import { sfx } from '../lib/sound';

export function Cover({ game, className = '' }: { game: Game; className?: string }) {
  return (
    <div className={`cover ${className}`} style={{ ['--cover-from' as any]: game.cover.from, ['--cover-to' as any]: game.cover.to }}>
      <div className="cover-art" />
      <span className="cover-emoji">{game.cover.emoji}</span>
      <div className="cover-shine" />
    </div>
  );
}

export function ProviderBadge({ provider }: { provider: string }) {
  const label =
    provider === 'crazygames' ? 'CrazyGames' : provider === 'poki' ? 'Poki' : provider === 'local' ? 'Installed' : provider;
  return (
    <span className={`badge ${provider === 'local' ? 'badge-live' : ''}`}>
      {provider === 'local' && <span className="dot" />}
      {label}
    </span>
  );
}

export function GameCard({ game, index = 0 }: { game: Game; index?: number }) {
  const { openPlayer, favorites, toggleFavorite } = useApp();
  const isFav = favorites.includes(game.id);

  return (
    <motion.div variants={staggerItem} custom={index}>
      <TiltCard className="game-card" tilt={3} onClick={() => openPlayer(game.id)}>
        <div style={{ position: 'relative' }}>
          <Cover game={game} />
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              display: 'flex',
              gap: 6,
              zIndex: 4,
            }}
          >
            {game.hot && <span className="badge badge-hot">🔥 Hot</span>}
            {game.installed && <span className="badge badge-live"><span className="dot" />Local</span>}
            {game.custom && <span className="badge badge-accent">Community</span>}
          </div>
          <button
            aria-label={isFav ? 'Remove from library' : 'Add to library'}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(game.id);
            }}
            style={{
              position: 'absolute',
              top: 9,
              right: 9,
              zIndex: 4,
              width: 30,
              height: 30,
              borderRadius: 10,
              display: 'grid',
              placeItems: 'center',
              border: '1px solid rgba(255,255,255,.25)',
              background: 'rgba(10,10,18,.5)',
              backdropFilter: 'blur(10px)',
              color: isFav ? '#ff6b9d' : 'rgba(255,255,255,.85)',
              cursor: 'pointer',
              opacity: isFav ? 1 : 0.75,
              transition: 'all .25s',
            }}
          >
            <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
          </button>
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="play-hint"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(0deg, rgba(5,5,12,.55), rgba(5,5,12,.1))',
              zIndex: 3,
            }}
          >
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(255,255,255,.95)',
                color: '#0a0a12',
                boxShadow: '0 10px 30px rgba(0,0,0,.35)',
              }}
            >
              <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
            </span>
          </motion.div>
        </div>
        <div className="card-body">
          <div className="game-title">
            <span>{game.title}</span>
            <span className="row" style={{ gap: 4, color: 'var(--muted)', fontSize: 11.5, fontWeight: 500 }}>
              <Star size={11} fill="#ffd166" stroke="#ffd166" /> {game.rating.toFixed(1)}
            </span>
          </div>
          <div className="game-tagline">{game.tagline}</div>
          <div className="card-foot">
            <span className="row" style={{ gap: 5 }}>
              <Users size={11} /> {fmt.num(game.players)} playing
            </span>
            <ProviderBadge provider={game.sources[0].provider} />
          </div>
        </div>
      </TiltCard>
    </motion.div>
  );
}

export function GameTileRow({ game }: { game: Game }) {
  const { openPlayer } = useApp();
  return (
    <button
      onClick={() => {
        sfx.tap();
        openPlayer(game.id);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: 9,
        borderRadius: 14,
        border: '1px solid var(--line)',
        background: 'color-mix(in srgb, var(--text) 3%, transparent)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'all .25s var(--ease)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'color-mix(in srgb, var(--text) 7%, transparent)';
        e.currentTarget.style.transform = 'translateX(3px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'color-mix(in srgb, var(--text) 3%, transparent)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          display: 'grid',
          placeItems: 'center',
          fontSize: 19,
          background: `linear-gradient(135deg, ${game.cover.from}, ${game.cover.to})`,
          flexShrink: 0,
        }}
      >
        {game.cover.emoji}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {game.title}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{game.category}</div>
      </div>
      <Play size={14} style={{ marginLeft: 'auto', color: 'var(--muted)', flexShrink: 0 }} />
    </button>
  );
}

export function GameGridLink({ game }: { game: Game }) {
  return <Link to={`/game/${game.id}`}>{game.title}</Link>;
}
