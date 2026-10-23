import { Cookie, FileText, Info, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/store';

function Doc({ title, lede, icon: Icon, children }: { title: string; lede: string; icon: any; children: React.ReactNode }) {
  return (
    <>
      <div style={{ maxWidth: 720, marginBottom: 28 }}>
        <span className="eyebrow row" style={{ gap: 6, display: 'inline-flex' }}><Icon size={13} /> Legal</span>
        <h1 className="h2" style={{ marginTop: 12 }}>{title}</h1>
        <p className="muted" style={{ marginTop: 10, fontSize: 16, lineHeight: 1.65 }}>{lede}</p>
        <div className="tiny muted" style={{ marginTop: 12 }}>Last updated 23 October 2026</div>
      </div>
      <div className="prose">{children}</div>
    </>
  );
}

export function Cookies() {
  const { consent, openCookiePrefs, saveConsent } = useApp();

  return (
    <Doc
      title="Cookie policy"
      lede="UblockedIt is run from a single server and keeps the cookie list deliberately short: one session cookie, one consent cookie, and a few optional preference cookies."
      icon={Cookie}
    >
      <h2>What we set</h2>
      <table className="table">
        <thead>
          <tr><th>Name</th><th>Purpose</th><th>Type</th><th>Expires</th></tr>
        </thead>
        <tbody>
          <tr><td className="mono">ubid_session</td><td>Keeps you signed in between visits.</td><td>Essential</td><td>30 days</td></tr>
          <tr><td className="mono">ubid_consent</td><td>Stores the choice you made on this page.</td><td>Essential</td><td>12 months</td></tr>
          <tr><td className="mono">ubid_theme</td><td>Remembers the theme you picked.</td><td>Preferences</td><td>12 months</td></tr>
          <tr><td className="mono">ubid_accent</td><td>Remembers your accent colour.</td><td>Preferences</td><td>12 months</td></tr>
          <tr><td className="mono">ubid_motion</td><td>Remembers whether animations are on.</td><td>Preferences</td><td>12 months</td></tr>
          <tr><td className="mono">ubid_sound</td><td>Remembers whether interface sounds are on.</td><td>Preferences</td><td>12 months</td></tr>
          <tr><td className="mono">ubid_last_user</td><td>Prefills your username on the sign-in form.</td><td>Preferences</td><td>180 days</td></tr>
        </tbody>
      </table>

      <h2>Analytics</h2>
      <p>
        Analytics is off unless you switch it on. When enabled we record aggregate page counts in our own database — no
        third-party script, no cross-site identifier, no advertising cookie, nothing sold or shared.
      </p>

      <h2>Your current choice</h2>
      <p>
        {consent?.decidedAt
          ? `Stored ${new Date(consent.decidedAt).toLocaleString()} — preferences ${consent.preferences ? 'on' : 'off'}, analytics ${consent.analytics ? 'on' : 'off'}.`
          : 'You have not made a choice yet; only essential cookies are in use.'}
      </p>

      <h2>Change it any time</h2>
      <div className="row wrap" style={{ gap: 8 }}>
        <button className="btn btn--sm btn--primary" onClick={openCookiePrefs}>Open preferences</button>
        <button className="btn btn--sm btn--outline" onClick={() => saveConsent({ essential: true, preferences: true, analytics: false })}>
          Essential + preferences
        </button>
        <button className="btn btn--sm btn--ghost" onClick={() => saveConsent({ essential: true, preferences: false, analytics: false })}>
          Essential only
        </button>
      </div>

      <h2>Clearing cookies</h2>
      <p>
        Deleting site data in your browser removes every cookie above and signs you out. Nothing on the server breaks —
        your library, scores and settings live in your account.
      </p>
      <p>
        Questions about data handling are covered in the <Link to="/privacy">privacy notice</Link>.
      </p>
    </Doc>
  );
}

export function Privacy() {
  return (
    <Doc
      title="Privacy notice"
      lede="We collect the minimum needed to run an account-based game hub: an email, a username, a password hash and the games you play."
      icon={ShieldCheck}
    >
      <h2>What we store</h2>
      <ul>
        <li>Account: username, email, display name, password hash (scrypt, salted), theme and sound preferences.</li>
        <li>Activity: favourites, play sessions (game, duration, timestamp), scores and community posts.</li>
        <li>APK runner: packages you upload, their manifest report, and install sessions you start.</li>
        <li>Security: sign-in events with IP address and browser user agent, kept so you can spot unfamiliar logins.</li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>No advertising networks, no cross-site trackers, no fingerprinting.</li>
        <li>No selling or sharing of personal data with third parties.</li>
        <li>No email marketing. We only send mail if you ask for a password reset.</li>
      </ul>

      <h2>Games and ROMs</h2>
      <p>
        Every game on this hub is served from this server. ROM files for emulators are read locally in your browser and
        are never uploaded. Do not use the emulators with content you do not have the right to play.
      </p>

      <h2>Deleting your data</h2>
      <p>
        Account → Security → Delete account removes your profile, library, scores, posts, comments and uploaded packages
        immediately and permanently. You can also email the operator to request a copy of your data.
      </p>

      <h2>Cookies</h2>
      <p>See the <Link to="/cookies">cookie policy</Link> for the exact list and to change your consent.</p>
    </Doc>
  );
}

export function About() {
  return (
    <Doc
      title="About UblockedIt"
      lede="A games hub built like a product, not a link farm: self-hosted titles, working emulators, and an APK runner that tells you the truth about what a package contains."
      icon={Info}
    >
      <h2>How it is built</h2>
      <ul>
        <li><strong>Frontend</strong> — React with Vite, hand-written CSS design system, lucide icons.</li>
        <li><strong>Backend</strong> — Node and Express, SQLite for accounts, posts, scores and APK metadata.</li>
        <li><strong>Games</strong> — static builds served from <span className="mono">/games</span> on this origin. The player is a plain iframe, so a game can post scores to the hub.</li>
        <li><strong>Emulators</strong> — EmulatorJS cores (libretro) compiled to WebAssembly, loaded on demand.</li>
      </ul>

      <h2>Licences</h2>
      <p>
        2048 (MIT, Gabriele Cirulli), Hextris (GPL-3), Clumsy Bird (GPL-3, Ellison Leão), Tetris and Pong (MIT, Jake
        Gordon), Chess AI (Apache-2.0, Lars Hartikk), Astray (public domain, wwwtyro), Asteroids (MIT, Doug McInnes),
        HexGL (MIT, BKcore). Minesweeper, Sudoku, Solitaire, Connect Four, Pool, Neon Snake and Vector Breakout were
        written for this hub. Emulator cores remain the property of their respective projects.
      </p>

      <h2>Fair use</h2>
      <p>
        Emulator support exists for legally owned software. Nothing here ships copyrighted ROMs, and uploads to the APK
        runner are private to the account that made them.
      </p>

      <div className="row wrap" style={{ gap: 8 }}>
        <Link to="/cookies" className="btn btn--sm btn--outline"><FileText size={13} /> Cookie policy</Link>
        <Link to="/privacy" className="btn btn--sm btn--outline"><ShieldCheck size={13} /> Privacy notice</Link>
      </div>
    </Doc>
  );
}
