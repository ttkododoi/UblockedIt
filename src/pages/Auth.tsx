import { ArrowRight, Check, Loader2, Lock, Mail, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/store';
import { Logo } from '../components/ui';

const PERKS = [
  'Your library, scores and themes on every device',
  'Save states and installs tied to one account',
  'Post, vote and reply in the community',
  'No ads, no trackers, no newsletter',
];

function Aside() {
  return (
    <div className="auth__aside">
      <Link to="/" className="logo" style={{ marginBottom: 26 }}>
        <span className="logo__mark"><Logo size={15} /></span>
        UblockedIt
      </Link>
      <h2 className="h2" style={{ fontSize: 'clamp(26px, 3vw, 34px)' }}>One account,<br />every console.</h2>
      <ul className="stack" style={{ gap: 12, marginTop: 24, listStyle: 'none', padding: 0 }}>
        {PERKS.map((p) => (
          <li key={p} className="row" style={{ gap: 10, fontSize: 14, color: 'var(--ink-2)', alignItems: 'flex-start' }}>
            <Check size={16} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
            {p}
          </li>
        ))}
      </ul>
      <div className="note" style={{ marginTop: 30 }}>
        <Lock style={{ marginTop: 2 }} />
        <div>Passwords are hashed with scrypt. We store nothing beyond your profile, library and scores.</div>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(identifier.trim(), password, remember);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="card card--pad auth__card">
        <h1 className="h3" style={{ fontSize: 26 }}>Sign in</h1>
        <p className="small muted" style={{ marginTop: 6, marginBottom: 22 }}>
          Welcome back. Your library is exactly where you left it.
        </p>
        <form onSubmit={submit} className="stack" style={{ gap: 12 }}>
          <label className="label" htmlFor="id">Username or email</label>
          <div className="input-wrap">
            <UserIcon size={16} />
            <input id="id" className="field" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="tester" required />
          </div>
          <label className="label" htmlFor="pw">Password</label>
          <div className="input-wrap">
            <Lock size={16} />
            <input id="pw" type="password" className="field" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <label className="checkbox small" style={{ marginTop: 4 }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Keep me signed in on this device
          </label>
          {error && <div className="note note--warn">{error}</div>}
          <button className="btn btn--primary btn--lg" type="submit" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? <Loader2 size={16} className="spin" /> : null}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="small muted" style={{ marginTop: 18, textAlign: 'center' }}>
          New here? <Link to="/signup" style={{ color: 'var(--accent-ink)', fontWeight: 550 }}>Create an account</Link>
        </p>
        <div className="note" style={{ marginTop: 18 }}>
          <Mail style={{ marginTop: 2 }} />
          <div>
            Demo account: <span className="mono">tester</span> / <span className="mono">newpassword123</span>
          </div>
        </div>
      </div>
      <Aside />
    </div>
  );
}

export function Signup() {
  const { signup } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', displayName: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Use at least 8 characters for your password.');
    setBusy(true);
    try {
      await signup({ ...form, displayName: form.displayName || form.username });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Could not create that account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="card card--pad auth__card">
        <h1 className="h3" style={{ fontSize: 26 }}>Create your account</h1>
        <p className="small muted" style={{ marginTop: 6, marginBottom: 22 }}>Takes about fifteen seconds. No credit card, no spam.</p>
        <form onSubmit={submit} className="stack" style={{ gap: 12 }}>
          <label className="label" htmlFor="u">Username</label>
          <div className="input-wrap">
            <UserIcon size={16} />
            <input id="u" className="field" autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="pixelpilot" required minLength={3} />
          </div>
          <label className="label" htmlFor="d">Display name <span className="muted" style={{ fontWeight: 400 }}>optional</span></label>
          <input id="d" className="field" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Pixel Pilot" />
          <label className="label" htmlFor="e">Email</label>
          <div className="input-wrap">
            <Mail size={16} />
            <input id="e" type="email" className="field" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
          </div>
          <label className="label" htmlFor="p">Password</label>
          <div className="input-wrap">
            <Lock size={16} />
            <input id="p" type="password" className="field" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" required minLength={8} />
          </div>
          {error && <div className="note note--warn">{error}</div>}
          <button className="btn btn--primary btn--lg" type="submit" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? <Loader2 size={16} className="spin" /> : null}
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="tiny muted" style={{ marginTop: 14, lineHeight: 1.6 }}>
          By creating an account you agree to the fair-use terms in our <Link to="/privacy">privacy notice</Link>.
        </p>
        <p className="small muted" style={{ marginTop: 12, textAlign: 'center' }}>
          Already have one? <Link to="/login" style={{ color: 'var(--accent-ink)', fontWeight: 550 }}>Sign in</Link>
        </p>
      </div>
      <Aside />
    </div>
  );
}
