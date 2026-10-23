import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  Download,
  Eye,
  EyeOff,
  Gamepad2,
  Heart,
  Loader2,
  LogOut,
  Monitor,
  Package,
  Palette,
  Save,
  Shield,
  Sparkles,
  Trash2,
  User as UserIcon,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, fmt } from '../lib/api';
import { useCatalog } from '../lib/catalog';
import { useApp } from '../lib/store';
import { ACCENTS, THEMES } from '../lib/themes';
import { GameCard } from '../components/GameCard';
import { sfx } from '../lib/sound';

const AVATARS = ['🛸', '👾', '🎮', '🚀', '🦊', '🐉', '👻', '🧠', '⚡', '🌌', '🕹️', '🎯', '🍄', '🪐', '🔮', '🦉', '🐙', '🤖', '🦄', '🍕'];

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'library', label: 'Library', icon: Heart },
  { id: 'security', label: 'Security', icon: Shield },
];

export function Account() {
  const { user, ready, stats, favorites, settings, setSettings, updateProfile, logout, toast, refreshAuth } = useApp();
  const { catalog } = useCatalog();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'profile';
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ displayName: '', bio: '', email: '', avatar: '🛸', avatarHue: 268 });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [history, setHistory] = useState<{ game_id: string; provider: string; seconds: number; played_at: string }[]>([]);
  const [events, setEvents] = useState<{ kind: string; ip: string; user_agent: string; at: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState('');

  useEffect(() => {
    if (user) {
      setProfile({ displayName: user.displayName, bio: user.bio, email: user.email, avatar: user.avatar, avatarHue: user.avatarHue });
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) api.get<{ events: any[]; history: any[] }>('/api/auth/activity').then((d) => {
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
      <div className="page flex-center" style={{ minHeight: '66vh', flexDirection: 'column', textAlign: 'center' }}>
        <div style={{ fontSize: 46 }}>🎟️</div>
        <h1 style={{ fontSize: 30, margin: '12px 0 8px' }}>You’re not signed in</h1>
        <p className="muted" style={{ maxWidth: 380 }}>Sign in to open your profile, library and appearance settings.</p>
        <div className="row" style={{ gap: 10, marginTop: 20 }}>
          <Link to="/login" className="btn btn-primary">Sign in</Link>
          <Link to="/signup" className="btn">Create account</Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 260, borderRadius: 24 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="row wrap" style={{ gap: 18, alignItems: 'center' }}>
        <motion.div
          className="avatar"
          style={{ ['--hue' as any]: user.avatarHue, width: 72, height: 72, fontSize: 32, borderRadius: 22 }}
          whileHover={{ rotate: -6, scale: 1.05 }}
        >
          {user.avatar}
        </motion.div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 'clamp(26px,3.4vw,38px)', letterSpacing: '-0.04em' }}>{user.displayName}</h1>
          <div className="row wrap" style={{ gap: 8, marginTop: 6 }}>
            <span className="badge">@{user.username}</span>
            <span className="badge">member since {new Date(user.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
            <span className="badge badge-live"><span className="dot" />{user.loginCount} sign-ins</span>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link to="/games" className="btn btn-sm"><Gamepad2 size={14} /> Play something</Link>
          <button className="btn btn-sm" onClick={async () => { await logout(); navigate('/'); }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 12, marginTop: 24 }}>
        {[
          { n: stats.plays, l: 'sessions played' },
          { n: stats.minutes, l: 'minutes logged' },
          { n: favorites.length, l: 'saved games' },
          { n: stats.apks, l: 'APKs stored' },
          { n: Object.keys(stats.best || {}).length, l: 'scored games' },
        ].map((s) => (
          <div key={s.l} className="stat-card" style={{ flex: '1 1 130px' }}>
            <div className="n">{s.n}</div>
            <div className="l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="tabs" style={{ marginTop: 26 }}>
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setParams({ tab: t.id })}>
            <t.icon size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="split-2" style={{ marginTop: 22 }}>
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          {tab === 'profile' && (
            <div className="card" style={{ padding: 24 }}>
              <div className="eyebrow">Public profile</div>
              <h3 style={{ fontSize: 19, margin: '10px 0 16px' }}>How you show up in the lobby</h3>

              <div className="eyebrow" style={{ marginBottom: 8 }}>Avatar</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(44px,1fr))', gap: 8, marginBottom: 18 }}>
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setProfile((p) => ({ ...p, avatar: a })); sfx.tap(); }}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 12,
                      fontSize: 20,
                      cursor: 'pointer',
                      border: profile.avatar === a ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                      background: profile.avatar === a ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'color-mix(in srgb, var(--text) 3%, transparent)',
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <div className="field">
                <label>Avatar tint</label>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={profile.avatarHue}
                  onChange={(e) => setProfile((p) => ({ ...p, avatarHue: Number(e.target.value) }))}
                  style={{ accentColor: 'var(--accent)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Display name</label>
                  <input className="input" value={profile.displayName} onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))} maxLength={40} />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input className="input" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} type="email" />
                </div>
              </div>
              <div className="field">
                <label>Bio</label>
                <textarea className="input" rows={3} value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} placeholder="What do you play? Any records worth bragging about?" style={{ resize: 'vertical' }} />
              </div>

              <button className="btn btn-primary" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save profile
              </button>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="card" style={{ padding: 24 }}>
              <div className="eyebrow">Appearance</div>
              <h3 style={{ fontSize: 19, margin: '10px 0 6px' }}>Make it yours</h3>
              <p className="small muted" style={{ marginBottom: 18 }}>
                Your theme is saved to your account — sign in on another device and it loads instantly.
              </p>

              <div className="eyebrow" style={{ marginBottom: 10 }}>Theme</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(128px,1fr))', gap: 10, marginBottom: 22 }}>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSettings({ theme: t.id });
                      updateProfile({ theme: t.id } as any).catch(() => {});
                      sfx.tap();
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      cursor: 'pointer',
                      textAlign: 'left',
                      border: settings.theme === t.id ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                      background: 'color-mix(in srgb, var(--text) 3%, transparent)',
                    }}
                  >
                    <div style={{ height: 42, borderRadius: 9, background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})`, marginBottom: 8, border: '1px solid rgba(255,255,255,.14)' }} />
                    <div style={{ fontSize: 12.5, fontWeight: 550 }}>{t.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'capitalize' }}>{t.mode}</div>
                  </button>
                ))}
              </div>

              <div className="eyebrow" style={{ marginBottom: 10 }}>Accent</div>
              <div className="row wrap" style={{ gap: 9, marginBottom: 22 }}>
                {ACCENTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => {
                      setSettings({ accent: a });
                      updateProfile({ accent: a } as any).catch(() => {});
                      sfx.tap();
                    }}
                    aria-label={`Accent ${a}`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: a,
                      cursor: 'pointer',
                      border: settings.accent === a ? '2px solid #fff' : '1px solid rgba(255,255,255,.2)',
                      boxShadow: settings.accent === a ? `0 0 0 4px ${a}44` : 'none',
                    }}
                  />
                ))}
                <button className="btn btn-sm" onClick={() => setSettings({ accent: '' })}>Reset</button>
              </div>

              <div className="hairline" />

              <div className="stack" style={{ gap: 16 }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 550 }}>Interface sounds</div>
                    <div className="small muted">Subtle ticks and confirmation tones generated with WebAudio.</div>
                  </div>
                  <div className="row" style={{ gap: 10 }}>
                    <button className="icon-btn" onClick={() => sfx.success()} aria-label="Test sound"><Volume2 /></button>
                    <button
                      onClick={() => {
                        const next = !settings.sound;
                        setSettings({ sound: next });
                        updateProfile({ sound: next } as any).catch(() => {});
                      }}
                      style={{
                        width: 46,
                        height: 26,
                        borderRadius: 99,
                        border: '1px solid var(--line)',
                        background: settings.sound ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'color-mix(in srgb, var(--text) 9%, transparent)',
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                      aria-label="Toggle sound"
                    >
                      <motion.span
                        animate={{ x: settings.sound ? 22 : 3 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                        style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,.3)' }}
                      />
                    </button>
                  </div>
                </div>

                <div className="row" style={{ justifyContent: 'space-between', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 550 }}>Motion & animations</div>
                    <div className="small muted">Turn off for a calmer, faster interface.</div>
                  </div>
                  <div className="row" style={{ gap: 10 }}>
                    {settings.motion ? <Zap size={15} style={{ color: 'var(--accent-2)' }} /> : <VolumeX size={15} style={{ color: 'var(--muted)' }} />}
                    <button
                      onClick={() => {
                        const next = !settings.motion;
                        setSettings({ motion: next });
                        updateProfile({ motion: next } as any).catch(() => {});
                      }}
                      style={{
                        width: 46,
                        height: 26,
                        borderRadius: 99,
                        border: '1px solid var(--line)',
                        background: settings.motion ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'color-mix(in srgb, var(--text) 9%, transparent)',
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                      aria-label="Toggle motion"
                    >
                      <motion.span
                        animate={{ x: settings.motion ? 22 : 3 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                        style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,.3)' }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'library' && (
            <div className="stack">
              <div className="card" style={{ padding: 22 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div className="eyebrow">Saved games</div>
                    <h3 style={{ fontSize: 18, marginTop: 8 }}>{favGames.length} in your library</h3>
                  </div>
                  <Link to="/games" className="btn btn-sm"><Gamepad2 size={13} /> Find more</Link>
                </div>
                {favGames.length === 0 ? (
                  <div className="empty" style={{ marginTop: 16 }}>
                    <div className="big">💜</div>
                    Tap the heart on any game card to pin it here.
                  </div>
                ) : (
                  <div className="grid-games" style={{ marginTop: 16 }}>
                    {favGames.map((g, i) => (
                      <GameCard key={g.id} game={g} index={i} />
                    ))}
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: 22 }}>
                <div className="eyebrow">Recent sessions</div>
                {history.length === 0 ? (
                  <p className="small muted" style={{ marginTop: 10 }}>No sessions logged yet — your playtime will appear here.</p>
                ) : (
                  <table className="simple" style={{ marginTop: 10 }}>
                    <thead>
                      <tr><th>Game</th><th>Source</th><th>Time</th><th>When</th></tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 12).map((h, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 550 }}>{h.game_id}</td>
                          <td><span className="badge">{h.provider}</span></td>
                          <td className="mono">{h.seconds ? `${Math.round(h.seconds / 60)}m` : '<1m'}</td>
                          <td className="muted">{fmt.ago(h.played_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card" style={{ padding: 22 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="eyebrow"><Package size={12} /> APK installs</div>
                  <Link to="/apk?tab=library" className="btn btn-sm">Open runner</Link>
                </div>
                <p className="small muted" style={{ marginTop: 8 }}>
                  {stats.apks} package{stats.apks === 1 ? '' : 's'} stored privately on this hub.
                </p>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="stack">
              <div className="card" style={{ padding: 22 }}>
                <div className="eyebrow">Password</div>
                <h3 style={{ fontSize: 18, margin: '8px 0 14px' }}>Change your password</h3>
                <div className="field">
                  <label>Current password</label>
                  <input className="input" type={showPw ? 'text' : 'password'} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>New password</label>
                    <input className="input" type={showPw ? 'text' : 'password'} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Confirm new password</label>
                    <input className="input" type={showPw ? 'text' : 'password'} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                  </div>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <button className="btn btn-primary" onClick={changePassword} disabled={savingPw || !pw.current || !pw.next}>
                    {savingPw ? <Loader2 size={14} className="spin" /> : <Shield size={14} />} Update password
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowPw((v) => !v)}>
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />} {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="note" style={{ marginTop: 14 }}>
                  <AlertTriangle />
                  <div>Changing your password signs out every other device.</div>
                </div>
              </div>

              <div className="card" style={{ padding: 22 }}>
                <div className="eyebrow"><Clock size={12} /> Sign-in activity</div>
                {events.length === 0 ? (
                  <p className="small muted" style={{ marginTop: 10 }}>No activity recorded yet.</p>
                ) : (
                  <div className="stack" style={{ gap: 10, marginTop: 12 }}>
                    {events.slice(0, 8).map((e, i) => (
                      <div key={i} className="row" style={{ gap: 10, fontSize: 12.5 }}>
                        <Monitor size={14} style={{ color: 'var(--muted)' }} />
                        <span style={{ textTransform: 'capitalize', fontWeight: 550 }}>{e.kind}</span>
                        <span className="muted" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.user_agent?.slice(0, 64) || 'unknown device'}
                        </span>
                        <span className="mono muted" style={{ fontSize: 11 }}>{fmt.ago(e.at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: 22, borderColor: 'color-mix(in srgb, #ff4d6d 28%, transparent)' }}>
                <div className="eyebrow" style={{ color: '#ff8fa3' }}><Trash2 size={12} /> Danger zone</div>
                <h3 style={{ fontSize: 18, margin: '8px 0 6px' }}>Delete account</h3>
                <p className="small muted">
                  Removes your profile, library, scores, posts, comments and uploaded APKs. This cannot be undone.
                </p>
                <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                  <input
                    className="input"
                    placeholder={`Type “${user.username}” to confirm`}
                    value={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.value)}
                    style={{ maxWidth: 260 }}
                  />
                  <button className="btn" onClick={deleteAccount} disabled={confirmDelete !== user.username} style={{ color: '#ff8fa3', borderColor: 'color-mix(in srgb, #ff4d6d 35%, transparent)' }}>
                    <Trash2 size={14} /> Delete permanently
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <div className="stack">
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow"><Sparkles size={12} /> Account snapshot</div>
            <div className="stack" style={{ gap: 9, marginTop: 14, fontSize: 12.8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Username</span><span>@{user.username}</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Email</span><span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Last sign-in</span><span>{user.lastLogin ? fmt.ago(user.lastLogin) : 'now'}</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Theme</span><span style={{ textTransform: 'capitalize' }}>{settings.theme}</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Sound</span><span>{settings.sound ? 'on' : 'off'}</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Motion</span><span>{settings.motion ? 'on' : 'off'}</span>
              </div>
            </div>
            <div className="hairline" />
            <Link to="/community" className="btn btn-sm" style={{ width: '100%' }}>
              <Gamepad2 size={13} /> Visit the lobby
            </Link>
          </div>

          <div className="note">
            <Download />
            <div>Everything on this page is stored server-side, so your settings survive a browser wipe.</div>
          </div>
        </div>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}
