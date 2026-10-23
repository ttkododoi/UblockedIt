import { motion } from 'framer-motion';
import { Boxes, Gamepad2, MessageSquare, Package, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';

const QUOTES = [
  {
    text: 'I got the whole lobby onto the emulator page during a free period. Ten minutes later there were six of us on Moto X3M.',
    who: 'nova · community host',
    icon: '🎮',
  },
  {
    text: 'The APK runner is the first one that actually told me what was in the package before installing it.',
    who: 'bytecrash · tinkerer',
    icon: '📦',
  },
  {
    text: 'Saved my library on my phone, opened the laptop, everything was exactly where I left it.',
    who: 'pixelqueen · high-score gremlin',
    icon: '✨',
  },
];

export function AuthShell({ children, side = 'signup' }: { children: ReactNode; side?: 'login' | 'signup' }) {
  const { catalog } = useCatalog();
  const [quote, setQuote] = useState(0);
  const games = catalog?.games || [];

  useEffect(() => {
    const t = setInterval(() => setQuote((q) => (q + 1) % QUOTES.length), 6500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="page">
      <div className="auth-shell">
        <div className="auth-visual">
          <div>
            <Link to="/" className="brand" style={{ marginBottom: 26 }}>
              <span className="brand-mark">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6.5 4.5v8.2a5.5 5.5 0 0 0 11 0V4.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                  <circle cx="12" cy="19" r="1.6" fill="currentColor" />
                </svg>
              </span>
              <span className="brand-text">
                UblockedIt
                <span className="brand-sub">play · anywhere</span>
              </span>
            </Link>
            <h2 style={{ fontSize: 'clamp(26px,3vw,36px)', letterSpacing: '-0.04em', maxWidth: '18ch' }}>
              Your whole arcade,
              <br />
              <span className="grad-text">following you around.</span>
            </h2>
            <p className="small muted" style={{ marginTop: 14, maxWidth: '42ch', lineHeight: 1.7 }}>
              One account keeps your library, high scores, themes and APK installs in sync — on every device you sign in
              from.
            </p>
          </div>

          <div style={{ position: 'relative', minHeight: 120, marginTop: 30 }}>
            <motion.div key={quote} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div
                className="card"
                style={{ padding: 18, background: 'color-mix(in srgb, var(--bg) 45%, transparent)', borderColor: 'var(--line-strong)' }}
              >
                <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>{QUOTES[quote].icon}</span>
                  <div className="row" style={{ gap: 2 }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} size={11} fill="#ffd166" stroke="#ffd166" />
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)', margin: 0 }}>“{QUOTES[quote].text}”</p>
                <div className="post-meta" style={{ marginTop: 10 }}>— {QUOTES[quote].who}</div>
              </div>
            </motion.div>
          </div>

          <div className="stack" style={{ gap: 12, marginTop: 26 }}>
            {[
              { icon: Gamepad2, t: 'Library sync', d: `${games.length || 50}+ games, favourites and recents` },
              { icon: Boxes, t: 'Emulator saves', d: 'Pick up the exact frame you left' },
              { icon: Package, t: 'APK storage', d: 'Private installs, removable anytime' },
              { icon: MessageSquare, t: 'Community', d: 'Post, vote and help other players' },
            ].map((f) => (
              <div key={f.t} className="row" style={{ gap: 11 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'color-mix(in srgb, var(--text) 7%, transparent)',
                    border: '1px solid var(--line)',
                    flexShrink: 0,
                  }}
                >
                  <f.icon size={15} style={{ color: 'var(--accent-2)' }} />
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 550 }}>{f.t}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="row" style={{ gap: 10, marginTop: 30, fontSize: 11, color: 'var(--muted)' }}>
            <ShieldCheck size={13} /> Passwords are scrypt-hashed. Sessions are httpOnly cookies.
          </div>
        </div>

        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
