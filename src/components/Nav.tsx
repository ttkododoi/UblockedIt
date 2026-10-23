import { AnimatePresence, motion } from 'framer-motion';
import {
  Boxes,
  ChevronDown,
  Command,
  Gamepad2,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Package,
  Palette,
  Search,
  Settings,
  Sparkles,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/store';
import { ACCENTS, applyTheme, THEMES } from '../lib/themes';
import { Logo } from './ui';
import { sfx } from '../lib/sound';

const TABS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/emulators', label: 'Emulators', icon: Boxes },
  { to: '/labs', label: 'Labs', icon: Sparkles },
  { to: '/apk', label: 'APK Runner', icon: Package },
  { to: '/community', label: 'Community', icon: MessageSquare },
];

function ThemeMenu({ onClose }: { onClose: () => void }) {
  const { settings, setSettings, user, updateProfile } = useApp();
  const pick = (id: string) => {
    sfx.tap();
    setSettings({ theme: id });
    if (user) updateProfile({ theme: id } as any).catch(() => {});
  };
  const pickAccent = (accent: string) => {
    sfx.tap();
    setSettings({ accent });
    applyTheme(settings.theme, accent);
    if (user) updateProfile({ accent } as any).catch(() => {});
  };
  return (
    <motion.div
      className="popover"
      style={{ right: 0, top: 54 }}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="menu-label">Appearance</div>
      <div className="theme-grid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`theme-swatch ${settings.theme === t.id ? 'active' : ''}`}
            onClick={() => pick(t.id)}
          >
            <span
              className="theme-dot"
              style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }}
            />
            {t.name}
          </button>
        ))}
      </div>
      <div className="menu-label" style={{ marginTop: 8 }}>Accent</div>
      <div style={{ display: 'flex', gap: 8, padding: '2px 11px 10px', flexWrap: 'wrap' }}>
        {ACCENTS.map((a) => (
          <button
            key={a}
            aria-label={`Accent ${a}`}
            onClick={() => pickAccent(a)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              background: a,
              cursor: 'pointer',
              border: settings.accent === a ? '2px solid #fff' : '1px solid rgba(255,255,255,.2)',
              boxShadow: settings.accent === a ? `0 0 0 3px ${a}44` : 'none',
            }}
          />
        ))}
      </div>
      <div className="hairline" style={{ margin: '6px 0' }} />
      <button
        className="menu-item"
        onClick={() => {
          pick(settings.theme === 'daylight' ? 'nebula' : 'daylight');
          onClose();
        }}
      >
        {settings.theme === 'daylight' ? <Moon size={15} /> : <Sun size={15} />}
        {settings.theme === 'daylight' ? 'Switch to dark' : 'Switch to light'}
      </button>
      <Link to="/account" className="menu-item" onClick={onClose}>
        <Settings size={15} /> Theme & preferences
      </Link>
    </motion.div>
  );
}

function AccountMenu({ onClose }: { onClose: () => void }) {
  const { user, logout, stats } = useApp();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <motion.div
      className="popover"
      style={{ right: 0, top: 54, width: 244 }}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px 12px' }}>
        <div className="avatar" style={{ ['--hue' as any]: user.avatarHue }}>
          {user.avatar}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{user.displayName}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            @{user.username}
          </div>
        </div>
      </div>
      <div className="hairline" style={{ margin: '0 0 8px' }} />
      <Link to="/account" className="menu-item" onClick={onClose}>
        <UserIcon size={15} /> My account
      </Link>
      <Link to="/account?tab=library" className="menu-item" onClick={onClose}>
        <LayoutGrid size={15} /> Library · {stats.plays} plays
      </Link>
      <Link to="/account?tab=themes" className="menu-item" onClick={onClose}>
        <Palette size={15} /> Appearance
      </Link>
      <div className="hairline" style={{ margin: '6px 0' }} />
      <button
        className="menu-item"
        onClick={async () => {
          await logout();
          onClose();
          navigate('/');
        }}
      >
        <LogOut size={15} /> Sign out
      </button>
    </motion.div>
  );
}

export function Nav() {
  const { settings, setSettings, user, setCommandOpen, stats } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [indicator, setIndicator] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setThemeOpen(false);
    setAccountOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDown = () => {
      setThemeOpen(false);
      setAccountOpen(false);
    };
    window.addEventListener('click', onDown);
    return () => window.removeEventListener('click', onDown);
  }, []);

  const activeIndex = TABS.findIndex((t) => (t.to === '/' ? location.pathname === '/' : location.pathname.startsWith(t.to)));

  return (
    <>
      <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <Link to="/" className="brand" onClick={() => sfx.tap()}>
            <span className="brand-mark">
              <Logo size={20} />
            </span>
            <span className="brand-text">
              UblockedIt
              <span className="brand-sub">play · anywhere</span>
            </span>
          </Link>

          <nav className="nav-tabs" ref={navRef} aria-label="Primary">
            {TABS.map((t, i) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) => `nav-tab ${isActive && (t.to !== '/' || location.pathname === '/') ? 'active' : ''}`}
                onMouseEnter={() => {
                  sfx.hover();
                  setIndicator(i);
                }}
                onMouseLeave={() => setIndicator(activeIndex)}
              >
                {indicator === i && (
                  <motion.span
                    layoutId="nav-pill"
                    className="nav-tab-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <t.icon size={14} />
                {t.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav-actions">
            <button className="icon-btn" aria-label="Search (Ctrl K)" onClick={() => setCommandOpen(true)}>
              <Search />
            </button>
            <div style={{ position: 'relative' }}>
              <button
                className="icon-btn"
                aria-label="Change theme"
                onClick={(e) => {
                  e.stopPropagation();
                  setThemeOpen((v) => !v);
                  setAccountOpen(false);
                  sfx.tap();
                }}
              >
                <Palette />
              </button>
              <AnimatePresence>{themeOpen && <ThemeMenu onClose={() => setThemeOpen(false)} />}</AnimatePresence>
            </div>

            {user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAccountOpen((v) => !v);
                    setThemeOpen(false);
                    sfx.tap();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '4px 8px 4px 4px',
                    borderRadius: 999,
                    border: '1px solid var(--line)',
                    background: 'color-mix(in srgb, var(--text) 5%, transparent)',
                    cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                >
                  <span className="avatar" style={{ ['--hue' as any]: user.avatarHue, width: 30, height: 30, fontSize: 15, borderRadius: 9 }}>
                    {user.avatar}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 550, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName}
                  </span>
                  <ChevronDown size={13} style={{ opacity: 0.6 }} />
                </button>
                <AnimatePresence>{accountOpen && <AccountMenu onClose={() => setAccountOpen(false)} />}</AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm" style={{ display: 'flex' }}>
                  Sign in
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm">
                  Get started
                </Link>
              </>
            )}
            <button className="icon-btn mobile-only" aria-label="Menu" onClick={() => setMobileOpen(true)} style={{ display: 'none' }}>
              <Menu />
            </button>
          </div>
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Mobile">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <t.icon />
            <span>{t.label.replace(' Runner', '')}</span>
          </NavLink>
        ))}
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            style={{ alignItems: 'flex-start', paddingTop: 90 }}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="popover"
              style={{ position: 'relative', width: '100%', maxWidth: 360 }}
              onClick={(e) => e.stopPropagation()}
            >
              {TABS.map((t) => (
                <Link key={t.to} to={t.to} className="menu-item" onClick={() => setMobileOpen(false)}>
                  <t.icon size={16} /> {t.label}
                </Link>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
