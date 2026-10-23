import { motion } from 'framer-motion';
import { Heart, Shield, Sparkles } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Nav } from './Nav';
import { Background } from './Background';
import { Player } from './Player';
import { CommandPalette } from './CommandPalette';
import { Toasts } from './Toasts';
import { Logo } from './ui';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div style={{ maxWidth: 320 }}>
          <div className="brand" style={{ marginBottom: 12 }}>
            <span className="brand-mark">
              <Logo size={20} />
            </span>
            <span className="brand-text">
              UblockedIt
              <span className="brand-sub">play · anywhere</span>
            </span>
          </div>
          <p className="small muted" style={{ lineHeight: 1.7 }}>
            One hub for unblocked games, emulator stations, Flash relics, DOS classics and a real APK runner.
            Built for the people who just want to play.
          </p>
          <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <span className="badge badge-live"><span className="dot" />All systems operational</span>
            <span className="badge"><Shield size={10} />No installs</span>
          </div>
        </div>

        <div className="footer-col">
          <h4>Play</h4>
          <Link to="/games">All games</Link>
          <Link to="/games?category=Arcade">Arcade</Link>
          <Link to="/games?category=Puzzle">Puzzle</Link>
          <Link to="/games?category=Multiplayer">Multiplayer</Link>
          <Link to="/games?category=Horror">Horror</Link>
        </div>

        <div className="footer-col">
          <h4>Tools</h4>
          <Link to="/emulators">Emulators</Link>
          <Link to="/labs">Flash · DOS · Scratch</Link>
          <Link to="/apk">APK runner</Link>
          <Link to="/community">Community</Link>
          <Link to="/account">My account</Link>
        </div>

        <div className="footer-col">
          <h4>About</h4>
          <Link to="/signup">Create account</Link>
          <Link to="/login">Sign in</Link>
          <a href="https://www.crazygames.com" target="_blank" rel="noreferrer">CrazyGames</a>
          <a href="https://poki.com" target="_blank" rel="noreferrer">Poki</a>
          <a href="https://emulatorjs.org" target="_blank" rel="noreferrer">EmulatorJS</a>
        </div>
      </div>

      <div
        className="row"
        style={{
          maxWidth: 'var(--maxw)',
          margin: '30px auto 0',
          paddingTop: 18,
          borderTop: '1px solid var(--line)',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 11.5,
          color: 'var(--muted)',
        }}
      >
        <span>© {new Date().getFullYear()} UblockedIt. A fan-made playground.</span>
        <span className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
          <span className="row" style={{ gap: 4 }}><Sparkles size={12} /> Third-party games belong to their creators.</span>
          <span className="row" style={{ gap: 4 }}>Made with <Heart size={11} fill="currentColor" style={{ color: '#ff5f8f' }} /> for the bored</span>
        </span>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Background />
      <Nav />
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.main>
      <Footer />
      <Player />
      <CommandPalette />
      <Toasts />
    </div>
  );
}
