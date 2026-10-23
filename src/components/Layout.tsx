import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Nav } from './Nav';
import { Player } from './Player';
import { CommandPalette } from './CommandPalette';
import { Toasts } from './Toasts';
import { CookieBanner, CookiePreferences } from './CookieBanner';
import { Logo } from './ui';
import { useApp } from '../lib/store';

function Footer() {
  const { openCookiePrefs } = useApp();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div style={{ maxWidth: 320 }}>
            <Link to="/" className="logo" style={{ marginBottom: 10 }}>
              <span className="logo__mark"><Logo size={15} /></span>
              UblockedIt
            </Link>
            <p className="small muted" style={{ lineHeight: 1.6, marginTop: 8 }}>
              Every game hosted here runs from our own server. No embeds, no ads, no third-party players.
            </p>
          </div>
          <div>
            <h4>Play</h4>
            <Link to="/games">All games</Link>
            <Link to="/games?category=Arcade">Arcade</Link>
            <Link to="/games?category=Puzzle">Puzzle</Link>
            <Link to="/games?category=Classic">Classics</Link>
            <Link to="/games?category=Strategy">Strategy</Link>
          </div>
          <div>
            <h4>Tools</h4>
            <Link to="/emulators">Emulators</Link>
            <Link to="/labs">Labs</Link>
            <Link to="/apk">APK runner</Link>
            <Link to="/community">Community</Link>
          </div>
          <div>
            <h4>Legal</h4>
            <Link to="/cookies">Cookie policy</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/about">About &amp; licences</Link>
            <button className="menu-item" style={{ padding: 0, fontSize: 13.5, color: 'var(--ink-2)' }} onClick={openCookiePrefs}>
              Cookie settings
            </button>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} UblockedIt. Open-source games remain the property of their authors.</span>
          <span>Built with React, Node and a lot of black coffee.</span>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="shell">
      <Nav />
      <main className="page" key={location.pathname}>{children}</main>
      <Footer />
      <Player />
      <CommandPalette />
      <Toasts />
      <CookieBanner />
      <CookiePreferences />
    </div>
  );
}
