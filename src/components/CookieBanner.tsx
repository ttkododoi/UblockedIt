import { Cookie, Settings2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/store';

export function CookiePreferences() {
  const { cookiePrefsOpen, setCookiePrefsOpen, consent, saveConsent } = useApp();
  const [prefs, setPrefs] = useState({
    preferences: consent?.preferences ?? true,
    analytics: consent?.analytics ?? false,
  });

  // keep the switches in sync with the stored consent each time the dialog opens
  useEffect(() => {
    if (!cookiePrefsOpen) return;
    setPrefs({ preferences: consent?.preferences ?? true, analytics: consent?.analytics ?? false });
  }, [cookiePrefsOpen]);

  if (!cookiePrefsOpen) return null;

  return (
    <div className="modal" onClick={() => setCookiePrefsOpen(false)}>
      <div className="modal__panel modal__panel--sm modal__cookie" onClick={(e) => e.stopPropagation()}>
        <div className="row row--between" style={{ marginBottom: 8 }}>
          <h3 style={{ fontSize: 21 }}>Cookie preferences</h3>
          <button className="iconbtn" onClick={() => setCookiePrefsOpen(false)} aria-label="Close"><X /></button>
        </div>
        <p className="small muted" style={{ marginBottom: 8 }}>
          UblockedIt uses a small number of first-party cookies. You can change this at any time; see the{' '}
          <Link to="/cookies">cookie policy</Link> for the full list.
        </p>

        <div className="cookie-row">
          <div>
            <h4>Strictly necessary</h4>
            <p>Session cookie that keeps you signed in, and the cookie that remembers this consent choice. Always on.</p>
          </div>
          <span className="pill">Always on</span>
        </div>

        <div className="cookie-row">
          <div>
            <h4>Preferences</h4>
            <p>Remembers your theme, accent colour, motion and sound settings and your last username on this device.</p>
          </div>
          <button
            className={`toggle ${prefs.preferences ? 'is-on' : ''}`}
            role="switch"
            aria-checked={prefs.preferences}
            aria-label="Preferences cookies"
            onClick={() => setPrefs((p) => ({ ...p, preferences: !p.preferences }))}
          />
        </div>

        <div className="cookie-row">
          <div>
            <h4>Analytics</h4>
            <p>Anonymous, aggregated page counts used to decide what to build next. Never sold or shared.</p>
          </div>
          <button
            className={`toggle ${prefs.analytics ? 'is-on' : ''}`}
            role="switch"
            aria-checked={prefs.analytics}
            aria-label="Analytics cookies"
            onClick={() => setPrefs((p) => ({ ...p, analytics: !p.analytics }))}
          />
        </div>

        <div className="row" style={{ gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          <button className="btn btn--primary" onClick={() => saveConsent({ essential: true, ...prefs })}>
            Save preferences
          </button>
          <button
            className="btn btn--outline"
            onClick={() => {
              setPrefs({ preferences: true, analytics: true });
              saveConsent({ essential: true, preferences: true, analytics: true });
            }}
          >
            Accept all
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => {
              setPrefs({ preferences: false, analytics: false });
              saveConsent({ essential: true, preferences: false, analytics: false });
            }}
          >
            Reject non-essential
          </button>
        </div>
      </div>
    </div>
  );
}

export function CookieBanner() {
  const { consent, saveConsent, openCookiePrefs } = useApp();
  if (consent) return null;

  return (
    <div className="cookie-bar" role="dialog" aria-label="Cookie notice">
      <span
        style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          display: 'grid', placeItems: 'center',
          background: 'var(--surface-2)', color: 'var(--ink-2)',
        }}
      >
        <Cookie size={18} />
      </span>
      <p>
        We use a few first-party cookies to keep you signed in and to remember your theme and preferences.
        No advertising or cross-site trackers. <Link to="/cookies">What we store</Link>
      </p>
      <div className="cookie-bar__actions">
        <button className="btn btn--sm btn--ghost" onClick={openCookiePrefs}>
          <Settings2 size={13} /> Customise
        </button>
        <button className="btn btn--sm btn--outline" onClick={() => saveConsent({ essential: true, preferences: false, analytics: false })}>
          Essential only
        </button>
        <button className="btn btn--sm btn--primary" onClick={() => saveConsent({ essential: true, preferences: true, analytics: true })}>
          Accept all
        </button>
      </div>
    </div>
  );
}
