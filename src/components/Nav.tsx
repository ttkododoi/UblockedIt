import {
  Boxes,
  ChevronDown,
  Gamepad2,
  Heart,
  Home,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Package,
  Palette,
  Search,
  Settings,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp, initials, avatarColor } from '../lib/store';
import { ACCENTS, THEMES, applyTheme } from '../lib/themes';
import { Logo } from './ui';

const TABS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/emulators', label: 'Emulators', icon: Boxes },
  { to: '/labs', label: 'Labs', icon: Sparkles },
  { to: '/apk', label: 'APK runner', icon: Package },
  { to: '/community', label: 'Community', icon: MessageCircle },
];

function AppearanceMenu({ onClose }: { onClose: () => void }) {
  const { settings, setSettings, user, updateProfile } = useApp();
  const choose = (theme: string) => {
    setSettings({ theme });
    applyTheme(theme, settings.accent);
    if (user) updateProfile({ theme } as any).catch(() => {});
  };
  const chooseAccent = (accent: string) => {
    setSettings({ accent });
    applyTheme(settings.theme, accent);
    if (user) updateProfile({ accent } as any).catch(() => {});
  };

  return (
    <div className="popover" style={{ width: 268 }} onClick={(e) => e.stopPropagation()}>
      <div className="menu-label">Appearance</div>
      <div className="theme-grid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`theme-swatch ${settings.theme === t.id ? 'is-active' : ''}`}
            onClick={() => choose(t.id)}
          >
            <span className="theme-dot" style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }} />
            {t.name}
          </button>
        ))}
      </div>
      <div className="menu-label" style={{ marginTop: 6 }}>Accent</div>
      <div className="accent-row">
        <button
          className={`accent-dot ${!settings.accent ? 'is-active' : ''}`}
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
          aria-label="Default accent"
          onClick={() => chooseAccent('')}
        />
        {ACCENTS.map((a) => (
          <button
            key={a}
            className={`accent-dot ${settings.accent === a ? 'is-active' : ''}`}
            style={{ background: a }}
            aria-label={`Accent ${a}`}
            onClick={() => chooseAccent(a)}
          />
        ))}
      </div>
      <hr className="hairline" style={{ margin: '4px 0' }} />
      <Link to="/account?tab=appearance" className="menu-item" onClick={onClose}>
        <Settings size={15} /> More preferences
      </Link>
    </div>
  );
}

function AccountMenu({ onClose }: { onClose: () => void }) {
  const { user, logout, stats, favorites } = useApp();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="popover" style={{ width: 250 }} onClick={(e) => e.stopPropagation()}>
      <div className="row" style={{ padding: '8px 10px 12px', gap: 10 }}>
        <span className="avatar" style={{ width: 36, height: 36, ['--av' as any]: avatarColor(user.avatarHue) }}>
          {initials(user.displayName)}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{user.displayName}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{user.username}</div>
        </div>
      </div>
      <hr className="hairline" style={{ margin: '0 0 6px' }} />
      <Link to="/account" className="menu-item" onClick={onClose}><UserIcon size={15} /> Account</Link>
      <Link to="/account?tab=library" className="menu-item" onClick={onClose}>
        <LayoutGrid size={15} /> Library<span style={{ marginLeft: 'auto', color: 'var(--ink-3)' }}>{favorites.length}</span>
      </Link>
      <Link to="/account?tab=appearance" className="menu-item" onClick={onClose}><Palette size={15} /> Appearance</Link>
      <Link to="/account?tab=security" className="menu-item" onClick={onClose}><Heart size={15} /> Security</Link>
      <hr className="hairline" style={{ margin: '6px 0' }} />
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
      <div style={{ padding: '6px 10px 2px', fontSize: 11.5, color: 'var(--ink-3)' }}>
        {stats.plays} sessions · {stats.minutes} min played
      </div>
    </div>
  );
}

export function Nav() {
  const { user, setCommandOpen } = useApp();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setAppearanceOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = () => {
      setAppearanceOpen(false);
      setAccountOpen(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  return (
    <>
      <header className="nav" ref={navRef}>
        <div className="nav__inner">
          <Link to="/" className="logo" aria-label="UblockedIt home">
            <span className="logo__mark"><Logo size={15} /></span>
            UblockedIt
          </Link>

          <nav className="tabs" aria-label="Primary">
            {TABS.map((t) => (
              <Link key={t.to} to={t.to} className={`tab ${isActive(t.to) ? 'is-active' : ''}`}>
                {t.label}
              </Link>
            ))}
          </nav>

          <div className="nav__actions">
            <button className="iconbtn" aria-label="Search games" onClick={() => setCommandOpen(true)}>
              <Search />
            </button>
            <div style={{ position: 'relative' }}>
              <button
                className="iconbtn"
                aria-label="Appearance"
                onClick={(e) => {
                  e.stopPropagation();
                  setAppearanceOpen((v) => !v);
                  setAccountOpen(false);
                }}
              >
                <Palette />
              </button>
              {appearanceOpen && <AppearanceMenu onClose={() => setAppearanceOpen(false)} />}
            </div>

            {user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAccountOpen((v) => !v);
                    setAppearanceOpen(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px 3px 3px',
                    border: '1px solid var(--line-soft)', borderRadius: 980, background: 'var(--surface)',
                  }}
                >
                  <span className="avatar" style={{ width: 26, height: 26, ['--av' as any]: avatarColor(user.avatarHue) }}>
                    {initials(user.displayName)}
                  </span>
                  <ChevronDown size={13} style={{ color: 'var(--ink-3)' }} />
                </button>
                {accountOpen && <AccountMenu onClose={() => setAccountOpen(false)} />}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn--sm btn--outline">Sign in</Link>
                <Link to="/signup" className="btn btn--sm btn--primary">Create account</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Mobile">
        {TABS.map((t) => (
          <Link key={t.to} to={t.to} className={isActive(t.to) ? 'is-active' : ''}>
            <t.icon />
            <span>{t.label.replace(' runner', '')}</span>
          </Link>
        ))}
      </nav>

    </>
  );
}
