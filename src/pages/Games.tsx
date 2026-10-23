import { AnimatePresence, motion } from 'framer-motion';
import { Filter, Gamepad2, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';
import { useApp } from '../lib/store';
import { GameCard } from '../components/GameCard';
import { SkeletonCard } from '../components/ui';

const SORTS = [
  { id: 'popular', label: 'Most played' },
  { id: 'rating', label: 'Top rated' },
  { id: 'az', label: 'A → Z' },
  { id: 'new', label: 'Newest' },
];

export function Games() {
  const { catalog, loading } = useCatalog();
  const { favorites, user } = useApp();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || 'All');
  const [sort, setSort] = useState(params.get('sort') || 'popular');
  const [onlyLocal, setOnlyLocal] = useState(false);
  const [onlyFavs, setOnlyFavs] = useState(params.get('fav') === '1');

  useEffect(() => {
    const next: Record<string, string> = {};
    if (query) next.q = query;
    if (category !== 'All') next.category = category;
    if (sort !== 'popular') next.sort = sort;
    if (onlyFavs) next.fav = '1';
    const t = setTimeout(() => setParams(next, { replace: true }), 250);
    return () => clearTimeout(t);
  }, [query, category, sort, onlyFavs]);

  const filtered = useMemo(() => {
    let list = catalog?.games || [];
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.tagline.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          g.tags.some((t) => t.includes(q))
      );
    if (category !== 'All') list = list.filter((g) => g.category === category);
    if (onlyLocal) list = list.filter((g) => g.sources.some((s) => s.provider === 'local'));
    if (onlyFavs) list = list.filter((g) => favorites.includes(g.id));
    const sorted = [...list];
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else if (sort === 'az') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'new') sorted.reverse();
    else sorted.sort((a, b) => b.players - a.players);
    return sorted;
  }, [catalog, query, category, sort, onlyLocal, onlyFavs, favorites]);

  const categories = catalog?.categories || ['All'];

  return (
    <div className="page">
      <div className="eyebrow">The library</div>
      <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(30px,4.2vw,46px)', letterSpacing: '-0.045em' }}>
            Every game, <span className="grad-text">one tap</span> away
          </h1>
          <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
            {(catalog?.games.length || 0)} titles across {categories.length - 1} genres — browser classics, provider
            streams and community picks.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge badge-accent"><Gamepad2 size={11} /> {filtered.length} shown</span>
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: 28 }}>
        <div className="search">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games, genres, tags…"
            aria-label="Search games"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear"
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <button
          className={`chip ${onlyLocal ? 'active' : ''}`}
          onClick={() => setOnlyLocal((v) => !v)}
          title="Show games that run from this server"
        >
          Runs offline
        </button>
        <button
          className={`chip ${onlyFavs ? 'active' : ''}`}
          onClick={() => {
            setOnlyFavs((v) => !v);
          }}
          title={user ? 'Your library' : 'Sign in to save favourites'}
        >
          ♥ Library
        </button>
      </div>

      <div className="chips" style={{ marginBottom: 26 }}>
        {categories.map((c) => (
          <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid-games">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="big">🕹️</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
            Nothing here yet
          </div>
          <p style={{ maxWidth: 380, margin: '8px auto 0', fontSize: 13.5 }}>
            {onlyFavs && !user
              ? 'Sign in to see your saved library — it syncs across devices.'
              : 'Try a different genre, or clear the filters. There are 50+ games in here somewhere.'}
          </p>
          <button
            className="btn btn-sm"
            style={{ marginTop: 16 }}
            onClick={() => {
              setQuery('');
              setCategory('All');
              setOnlyLocal(false);
              setOnlyFavs(false);
            }}
          >
            <Filter size={13} /> Reset filters
          </button>
        </div>
      ) : (
        <motion.div layout className="grid-games">
          <AnimatePresence mode="popLayout">
            {filtered.map((g, i) => (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.32, delay: Math.min(i * 0.012, 0.25) }}
              >
                <GameCard game={g} index={i} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <div className="note" style={{ marginTop: 34 }}>
        <SlidersHorizontal />
        <div>
          Games marked <strong style={{ color: 'var(--text)' }}>Installed</strong> are open-source builds served from this
          hub — they work even if your network blocks game sites. Provider titles (CrazyGames, Poki) stream from their
          official players and may be region-locked; switch sources in the player when that happens.
        </div>
      </div>
    </div>
  );
}
