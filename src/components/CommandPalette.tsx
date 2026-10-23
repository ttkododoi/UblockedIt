import { ArrowRight, Boxes, Gamepad2, Home, MessageCircle, Package, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';
import { useApp } from '../lib/store';

const ACTIONS = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'All games', to: '/games', icon: Gamepad2 },
  { label: 'Emulators', to: '/emulators', icon: Boxes },
  { label: 'Labs', to: '/labs', icon: Sparkles },
  { label: 'APK runner', to: '/apk', icon: Package },
  { label: 'Community', to: '/community', icon: MessageCircle },
];

export function CommandPalette() {
  const { commandOpen, setCommandOpen, openPlayer } = useApp();
  const { catalog } = useCatalog();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const games = (catalog?.games || [])
      .filter((g) => !q || g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q) || g.tags.some((t) => t.includes(q)))
      .slice(0, 6)
      .map((g) => ({ kind: 'game' as const, label: g.title, sub: g.category, cover: g.cover, id: g.id }));
    const actions = ACTIONS.filter((a) => !q || a.label.toLowerCase().includes(q)).map((a) => ({
      kind: 'action' as const,
      label: a.label,
      sub: 'Go to',
      icon: a.icon,
      to: a.to,
    }));
    return [...games, ...actions];
  }, [query, catalog]);

  useEffect(() => {
    if (commandOpen) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [commandOpen]);

  useEffect(() => setActive(0), [query]);

  const run = (item: (typeof results)[number]) => {
    setCommandOpen(false);
    if (item.kind === 'game') openPlayer(item.id);
    else navigate(item.to);
  };

  if (!commandOpen) return null;

  return (
    <div className="cmdk" onClick={() => setCommandOpen(false)}>
      <div
        className="cmdk__panel"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(results.length - 1, i + 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          }
          if (e.key === 'Enter' && results[active]) run(results[active]);
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 14 }}>
          <Search size={16} style={{ marginLeft: 18, color: 'var(--ink-3)' }} />
          <input
            ref={inputRef}
            placeholder="Search games"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ borderBottom: 0, flex: 1 }}
          />
          <span className="kbd">esc</span>
        </div>
        <div className="cmdk__list" style={{ borderTop: '1px solid var(--line-soft)' }}>
          {results.length === 0 && (
            <div className="small muted" style={{ padding: 24, textAlign: 'center' }}>No matches for “{query}”.</div>
          )}
          {results.map((item, i) => (
            <div
              key={`${item.kind}-${item.label}-${i}`}
              className={`cmdk__item ${i === active ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(item)}
            >
              {item.kind === 'game' ? (
                <img src={item.cover} alt="" width={30} height={30} loading="lazy" />
              ) : (
                <item.icon size={16} style={{ color: 'var(--ink-2)' }} />
              )}
              <span style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 500 }}>{item.label}</span>
                <span style={{ marginLeft: 8, color: 'var(--ink-3)', fontSize: 12 }}>{item.sub}</span>
              </span>
              <ArrowRight size={14} className="cmdk__hint" style={{ marginLeft: 'auto', color: 'var(--ink-3)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
