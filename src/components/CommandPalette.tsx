import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Boxes, Command, Gamepad2, Home, MessageSquare, Package, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';
import { useApp } from '../lib/store';
import { sfx } from '../lib/sound';

const ACTIONS = [
  { label: 'Home', to: '/', icon: Home, hint: 'Go' },
  { label: 'Browse all games', to: '/games', icon: Gamepad2, hint: 'Go' },
  { label: 'Emulator stations', to: '/emulators', icon: Boxes, hint: 'Go' },
  { label: 'Flash, DOS & Scratch labs', to: '/labs', icon: Sparkles, hint: 'Go' },
  { label: 'APK runner', to: '/apk', icon: Package, hint: 'Go' },
  { label: 'Community feed', to: '/community', icon: MessageSquare, hint: 'Go' },
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
      .slice(0, 7)
      .map((g) => ({ kind: 'game' as const, label: g.title, sub: `${g.category} · ${g.tagline}`, emoji: g.cover.emoji, id: g.id }));
    const actions = ACTIONS.filter((a) => !q || a.label.toLowerCase().includes(q)).map((a) => ({
      kind: 'action' as const,
      label: a.label,
      sub: 'Navigate',
      icon: a.icon,
      to: a.to,
    }));
    return [...games, ...actions];
  }, [query, catalog]);

  useEffect(() => {
    if (commandOpen) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [commandOpen]);

  useEffect(() => setActive(0), [query]);

  const run = (item: (typeof results)[number]) => {
    setCommandOpen(false);
    sfx.tap();
    if (item.kind === 'game') openPlayer(item.id);
    else navigate(item.to);
  };

  return (
    <AnimatePresence>
      {commandOpen && (
        <motion.div
          className="cmdk-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setCommandOpen(false)}
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
          <motion.div
            className="cmdk"
            initial={{ y: -14, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -10, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 16 }}>
              <Search size={17} style={{ marginLeft: 18, color: 'var(--muted)' }} />
              <input
                ref={inputRef}
                placeholder="Search games, pages, emulators…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span className="kbd" style={{ flexShrink: 0 }}>ESC</span>
            </div>
            <div className="cmdk-list">
              {results.length === 0 && (
                <div style={{ padding: 26, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  Nothing matched “{query}”. Try a genre like “racing”.
                </div>
              )}
              {results.map((item, i) => (
                <div
                  key={`${item.kind}-${item.label}-${i}`}
                  className={`cmdk-item ${i === active ? 'active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(item)}
                >
                  {item.kind === 'game' ? (
                    <span style={{ fontSize: 17, width: 20, textAlign: 'center' }}>{item.emoji}</span>
                  ) : (
                    <item.icon size={16} style={{ color: 'var(--muted)' }} />
                  )}
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: 550 }}>{item.label}</span>
                    {item.sub && (
                      <span style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.sub}
                      </span>
                    )}
                  </span>
                  <span className="ck">{item.kind === 'game' ? 'Play' : 'Open'}</span>
                  <ArrowRight size={13} style={{ color: 'var(--muted)' }} />
                </div>
              ))}
            </div>
            <div
              style={{
                borderTop: '1px solid var(--line)',
                padding: '9px 16px',
                display: 'flex',
                gap: 14,
                fontSize: 10.5,
                color: 'var(--muted)',
                fontFamily: 'var(--mono)',
              }}
            >
              <span className="row" style={{ gap: 5 }}><Command size={11} /> K to open</span>
              <span>↑↓ navigate</span>
              <span>↵ select</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
