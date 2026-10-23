import { Heart, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';
import { useApp } from '../lib/store';
import { GameCard } from '../components/GameCard';
import { EmptyState, SkeletonTile } from '../components/ui';

const SORTS = [
  { id: 'popular', label: 'Most played' },
  { id: 'rating', label: 'Top rated' },
  { id: 'az', label: 'A to Z' },
];

export function Games() {
  const { catalog, loading } = useCatalog();
  const { favorites, user } = useApp();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || 'All');
  const [sort, setSort] = useState(params.get('sort') || 'popular');
  const [onlyFavs, setOnlyFavs] = useState(params.get('fav') === '1');

  useEffect(() => {
    const next: Record<string, string> = {};
    if (query) next.q = query;
    if (category !== 'All') next.category = category;
    if (sort !== 'popular') next.sort = sort;
    if (onlyFavs) next.fav = '1';
    const t = setTimeout(() => setParams(next, { replace: true }), 300);
    return () => clearTimeout(t);
  }, [query, category, sort, onlyFavs]);

  const filtered = useMemo(() => {
    let list = [...(catalog?.games || [])];
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
    if (onlyFavs) list = list.filter((g) => favorites.includes(g.id));
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title));
    else list.sort((a, b) => b.players - a.players);
    return list;
  }, [catalog, query, category, sort, onlyFavs, favorites]);

  const categories = catalog?.categories || ['All'];

  return (
    <>
      <div className="row wrap row--between" style={{ alignItems: 'flex-end', marginBottom: 26 }}>
        <div>
          <h1 className="h2">All games</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {catalog?.games.length || 0} games installed on this server. Play instantly, no account required.
          </p>
        </div>
        <span className="pill pill--green"><span className="dot" />All self-hosted</span>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search games" aria-label="Search games" />
          {query && (
            <button className="iconbtn" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26 }} onClick={() => setQuery('')} aria-label="Clear search">
              <X size={13} />
            </button>
          )}
        </div>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <button className={`chip ${onlyFavs ? 'is-active' : ''}`} onClick={() => setOnlyFavs((v) => !v)}>
          <Heart size={12} style={{ verticalAlign: -2, marginRight: 5 }} />
          Library
        </button>
      </div>

      <div className="chips" style={{ marginBottom: 24 }}>
        {categories.map((c) => (
          <button key={c} className={`chip ${category === c ? 'is-active' : ''}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid">{Array.from({ length: 8 }).map((_, i) => <SkeletonTile key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={SlidersHorizontal} title="Nothing matches those filters">
          {onlyFavs && !user
            ? 'Sign in to see your saved library — it syncs across devices.'
            : 'Try another genre or clear the search.'}
          <div style={{ marginTop: 14 }}>
            <button
              className="btn btn--sm btn--outline"
              onClick={() => {
                setQuery('');
                setCategory('All');
                setOnlyFavs(false);
              }}
            >
              Reset filters
            </button>
          </div>
        </EmptyState>
      ) : (
        <div className="grid">
          {filtered.map((g, i) => (
            <GameCard key={g.id} game={g} eager={i < 6} />
          ))}
        </div>
      )}
    </>
  );
}
