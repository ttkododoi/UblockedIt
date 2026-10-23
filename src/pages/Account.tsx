import {
  AlertTriangle, Clock, Eye, EyeOff, Gamepad2, Heart, Loader2, LogOut, Monitor,
  Package, Palette, Save, Shield, Sparkles, Trash2, User as UserIcon, Volume2, Waves,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, fmt } from '../lib/api';
import { useCatalog } from '../lib/catalog';
import { useApp, avatarColor, initials } from '../lib/store';
import { ACCENTS, THEMES } from '../lib/themes';
import { GameCard } from '../components/GameCard';
import { EmptyState } from '../components/ui';
import { sfx } from '../lib/sound';

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'library', label: 'Library', icon: Heart },
  { id: 'security', label: 'Security', icon: Shield },
];

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button className={`toggle ${on ? 'is-on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
  );
}

export function Account() {
  const { user, ready, stats, favorites, settings, setSettings, updateProfile, logout, toast, refreshAuth, openCookiePrefs } = useApp();
  const { catalog } = useCatalog();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'profile';
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ displayName: '', bio: '', email: '', avatarHue: 210 });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [history, setHistory] = useState<{ game_id: string; provider: string; seconds: number; played_at: string }[]>([]);
  const [events, setEvents] = useState<{ kind: string; ip: string; user_agent: string; at: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState('');

  useEffect(() => {
    if (user) setProfile({ displayName: user.displayName, bio: user.bio, email: user.email, avatarHue: user.avatarHue });
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    api.get<{ events: any[]; history: any[] }>('/api/auth/activity').then((d) => {
      setEvents(d.events || []);
      setHistory(d.history || []);
    }).catch(() => {});
  }, [user?.id]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile(profile as any);
      toast('Profile saved.', 'success');
    } catch (e: any) {
      toast(e.message || 'Could not save your profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (pw.next !== pw.confirm) return toast('New passwords do not match.', 'error');
    if (pw.next.length < 8) return toast('Use at least 8 characters.', 'error');
    setSavingPw(true);
    try {
      await api.post('/api/auth/password', { current: pw.current, next: pw.next });
      setPw({ current: '', next: '', confirm: '' });
      toast('Password updated. Other sessions were signed out.', 'success');
      await refreshAuth();
    } catch (e: any) {
      toast(e.message || 'Could not update the password.', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  const deleteAccount = async () => {
    if (confirmDelete !== user?.username) return toast('Type your username to confirm.', 'error');
    try {
      await api.del('/api/auth/me');
      await refreshAuth();
      navigate('/');
      toast('Account deleted. Everything tied to it is gone.');
    } catch {
      toast('Could not delete the account.', 'error');
    }
  };

  const favGames = (catalog?.games || []).filter((g) => favorites.includes(g.id));

  if (ready && !user) {
    return (
      <EmptyState icon={UserIcon} title="You’re not signed in">
        Sign in to open your profile, library and appearance settings.
        <div className="row" style={{ gap: 10, marginTop: 16, justifyContent: 'center' }}>
          <Link to="/login" className="btn btn--sm btn--primary">Sign in</Link>
          <Link to="/signup" className="btn btn--sm btn--outline">Create account</Link>
        </div>
      </EmptyState>
    );
  }

  if (!user) return <div className="skeleton" style={{ height: 260, borderRadius: 20 }} />;

  return (
    <>
      <div className="row wrap" style={{ gap: 18, alignItems: 'center' }}>
        <span
          className="avatar"
          style={{ width: 68, height: 68, fontSize: 26, borderRadius: 20, ['--av' as any]: avatarColor(profile.avatarHue) }}
        >
          {initials(user.displayName)}
        </span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 className="h2" style={{ fontSize: 34 }}>{user.displayName}</h1>
          <div className="row wrap" style={{ gap: 7, marginTop: 8 }}>
            <span className="pill">@{user.username}</span>
            <span className="pill">
              member since {new Date(user.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </span>
            <span className="pill pill--green"><span className="dot" />{user.loginCount} sign-ins</span>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link to="/games" className="btn btn--sm btn--outline"><Gamepad2 size={14} /> Play something</Link>
          <button className="btn btn--sm btn--ghost" onClick={async () => { await logout(); navigate('/'); }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      <div className="stat-row">
        {[
          { n: stats.plays, l: 'sessions played' },
          { n: stats.minutes, l: 'minutes logged' },
          { n: favorites.length, l: 'saved games' },
          { n: stats.apks, l: 'APKs stored' },
          { n: Object.keys(stats.best || {}).length, l: 'scored games' },
        ].map((s) => (
          <div key={s.l} className="stat-box">
            <div className="stat-box__n">{s.n}</div>
            <div className="stat-box__l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="segmented" style={{ marginTop: 24, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setParams({ tab: t.id })}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <div className="split">
        <div>
          {tab === 'profile' && (
            <div className="card card--pad">
              <span className="eyebrow">Public profile</span>
              <h2 style={{ fontSize: 20, margin: '10px 0 18px' }}>How you show up in the lobby</h2>

              <div className="label">Avatar colour</div>
              <div className="row" style={{ gap: 12, marginBottom: 20 }}>
                <span className="avatar" style={{ width: 48, height: 48, fontSize: 17, borderRadius: 14, ['--av' as any]: avatarColor(profile.avatarHue) }}>
                  {initials(profile.displayName || user.username)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={profile.avatarHue}
                  onChange={(e) => setProfile((p) => ({ ...p, avatarHue: Number(e.target.value) }))}
                  style={{ flex: 1, accentColor: avatarColor(profile.avatarHue) }}
                  aria-label="Avatar colour"
                />
              </div>

              <div className="form-grid">
                <div>
                  <label className="label" htmlFor="dn">Display name</label>
                  <input id="dn" className="field" value={profile.displayName} onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))} maxLength={40} />
                </div>
                <div>
                  <label className="label" htmlFor="em">Email</label>
                  <input id="em" className="field" type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <label className="label" htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                className="field"
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                placeholder="What do you play? Any records worth bragging about?"
                style={{ resize: 'vertical', marginBottom: 16 }}
              />
              <button className="btn btn--primary" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save profile
              </button>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="card card--pad">
              <span className="eyebrow">Appearance</span>
              <h2 style={{ fontSize: 20, margin: '10px 0 6px' }}>Make it yours</h2>
              <p className="small muted" style={{ marginBottom: 20 }}>
                Your theme is saved to your account — sign in on another device and it loads instantly.
              </p>

              <div className="label">Theme</div>
              <div className="theme-cards" style={{ marginBottom: 22 }}>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    className={`theme-card ${settings.theme === t.id ? 'is-active' : ''}`}
                    onClick={() => {
                      setSettings({ theme: t.id });
                      updateProfile({ theme: t.id } as any).catch(() => {});
                      sfx.tap();
                    }}
                  >
                    <span className="theme-card__dot" style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }} />
                    {t.name}
                    <span className="tiny muted">{t.mode}</span>
                  </button>
                ))}
              </div>

              <div className="label">Accent</div>
              <div className="accent-row accent-row--flush" style={{ marginBottom: 20 }}>
                <button
                  className={`accent-dot ${!settings.accent ? 'is-active' : ''}`}
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
                  aria-label="Default accent"
                  onClick={() => setSettings({ accent: '' })}
                />
                {ACCENTS.map((a) => (
                  <button
                    key={a}
                    className={`accent-dot ${settings.accent === a ? 'is-active' : ''}`}
                    style={{ background: a }}
                    aria-label={`Accent ${a}`}
                    onClick={() => {
                      setSettings({ accent: a });
                      updateProfile({ accent: a } as any).catch(() => {});
                      sfx.tap();
                    }}
                  />
                ))}
              </div>

              <hr className="hairline" />

              <div className="setting-row">
                <div>
                  <div className="setting-row__t">Interface sounds</div>
                  <div className="tiny muted">Subtle confirmation tones, generated with WebAudio.</div>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <button className="iconbtn" onClick={() => sfx.success()} aria-label="Test sound"><Volume2 /></button>
                  <Toggle
                    label="Interface sounds"
                    on={settings.sound}
                    onChange={(next) => {
                      setSettings({ sound: next });
                      updateProfile({ sound: next } as any).catch(() => {});
                    }}
                  />
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <div className="setting-row__t">Motion &amp; animations</div>
                  <div className="tiny muted">Turn off for a calmer, faster interface.</div>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <Waves size={15} style={{ color: settings.motion ? 'var(--accent-ink)' : 'var(--ink-3)' }} />
                  <Toggle
                    label="Motion"
                    on={settings.motion}
                    onChange={(next) => {
                      setSettings({ motion: next });
                      updateProfile({ motion: next } as any).catch(() => {});
                    }}
                  />
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <div className="setting-row__t">Cookies</div>
                  <div className="tiny muted">Manage preferences and analytics consent.</div>
                </div>
                <button className="btn btn--sm btn--outline" onClick={openCookiePrefs}>Manage</button>
              </div>
            </div>
          )}

          {tab === 'library' && (
            <div className="stack">
              <div className="card card--pad">
                <div className="row row--between" style={{ marginBottom: 16 }}>
                  <div>
                    <span className="eyebrow">Saved games</span>
                    <h2 style={{ fontSize: 19, marginTop: 8 }}>{favGames.length} in your library</h2>
                  </div>
                  <Link to="/games" className="btn btn--sm btn--outline"><Gamepad2 size={13} /> Find more</Link>
                </div>
                {favGames.length === 0 ? (
                  <p className="small muted">Tap the heart on any game card to pin it here.</p>
                ) : (
                  <div className="grid grid--tight">
                    {favGames.map((g) => (
                      <GameCard key={g.id} game={g} />
                    ))}
                  </div>
                )}
              </div>

              <div className="card card--pad">
                <span className="eyebrow">Recent sessions</span>
                {history.length === 0 ? (
                  <p className="small muted" style={{ marginTop: 10 }}>No sessions logged yet — your playtime will appear here.</p>
                ) : (
                  <table className="table" style={{ marginTop: 12 }}>
                    <thead>
                      <tr><th>Game</th><th>Source</th><th>Time</th><th>When</th></tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 12).map((h, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 550 }}>{h.game_id}</td>
                          <td><span className="pill">{h.provider}</span></td>
                          <td className="mono">{h.seconds ? `${Math.round(h.seconds / 60)}m` : '<1m'}</td>
                          <td className="muted">{fmt.ago(h.played_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card card--pad">
                <div className="row row--between">
                  <span className="eyebrow row" style={{ gap: 6 }}><Package size={12} /> APK installs</span>
                  <Link to="/apk?tab=library" className="btn btn--sm btn--outline">Open runner</Link>
                </div>
                <p className="small muted" style={{ marginTop: 8 }}>
                  {stats.apks} package{stats.apks === 1 ? '' : 's'} stored privately on this hub.
                </p>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="stack">
              <div className="card card--pad">
                <span className="eyebrow">Password</span>
                <h2 style={{ fontSize: 19, margin: '8px 0 16px' }}>Change your password</h2>
                <label className="label" htmlFor="cur">Current password</label>
                <input id="cur" className="field" type={showPw ? 'text' : 'password'} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} style={{ marginBottom: 12 }} />
                <div className="form-grid">
                  <div>
                    <label className="label" htmlFor="np">New password</label>
                    <input id="np" className="field" type={showPw ? 'text' : 'password'} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="cp">Confirm new password</label>
                    <input id="cp" className="field" type={showPw ? 'text' : 'password'} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                  </div>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <button className="btn btn--primary" onClick={changePassword} disabled={savingPw || !pw.current || !pw.next}>
                    {savingPw ? <Loader2 size={14} className="spin" /> : <Shield size={14} />} Update password
                  </button>
                  <button className="btn btn--sm btn--ghost" onClick={() => setShowPw((v) => !v)}>
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />} {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="note" style={{ marginTop: 16 }}>
                  <AlertTriangle />
                  <div>Changing your password signs out every other device.</div>
                </div>
              </div>

              <div className="card card--pad">
                <span className="eyebrow row" style={{ gap: 6 }}><Clock size={12} /> Sign-in activity</span>
                {events.length === 0 ? (
                  <p className="small muted" style={{ marginTop: 10 }}>No activity recorded yet.</p>
                ) : (
                  <div className="stack" style={{ gap: 10, marginTop: 12 }}>
                    {events.slice(0, 8).map((e, i) => (
                      <div key={i} className="row" style={{ gap: 10, fontSize: 12.5 }}>
                        <Monitor size={14} style={{ color: 'var(--ink-3)' }} />
                        <span style={{ textTransform: 'capitalize', fontWeight: 550 }}>{e.kind}</span>
                        <span className="muted" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.user_agent?.slice(0, 64) || 'unknown device'}
                        </span>
                        <span className="mono tiny muted">{fmt.ago(e.at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card card--pad" style={{ borderColor: 'var(--red-line)' }}>
                <span className="eyebrow row" style={{ gap: 6, color: 'var(--red)' }}><Trash2 size={12} /> Danger zone</span>
                <h2 style={{ fontSize: 19, margin: '8px 0 6px' }}>Delete account</h2>
                <p className="small muted">
                  Removes your profile, library, scores, posts, comments and uploaded APKs. This cannot be undone.
                </p>
                <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  <input
                    className="field"
                    placeholder={`Type “${user.username}” to confirm`}
                    value={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.value)}
                    style={{ maxWidth: 260 }}
                  />
                  <button className="btn btn--danger" onClick={deleteAccount} disabled={confirmDelete !== user.username}>
                    <Trash2 size={14} /> Delete permanently
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card card--pad">
            <span className="eyebrow row" style={{ gap: 6 }}><Sparkles size={12} /> Account snapshot</span>
            <div className="stack" style={{ gap: 9, marginTop: 14, fontSize: 13 }}>
              {[
                ['Username', `@${user.username}`],
                ['Email', user.email],
                ['Last sign-in', user.lastLogin ? fmt.ago(user.lastLogin) : 'now'],
                ['Theme', settings.theme],
                ['Sound', settings.sound ? 'on' : 'off'],
                ['Motion', settings.motion ? 'on' : 'off'],
              ].map(([k, v]) => (
                <div key={k} className="row row--between" style={{ gap: 12 }}>
                  <span className="muted">{k}</span>
                  <span style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>{v}</span>
                </div>
              ))}
            </div>
            <hr className="hairline" />
            <Link to="/community" className="btn btn--sm btn--outline" style={{ width: '100%' }}>Visit the lobby</Link>
          </div>
          <div className="note">
            <Monitor />
            <div>Everything on this page is stored server-side, so your settings survive a browser wipe.</div>
          </div>
        </div>
      </div>
    </>
  );
}
