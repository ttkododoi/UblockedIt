import { motion } from 'framer-motion';
import { ArrowRight, AlertTriangle, Eye, EyeOff, Loader2, Lock, Mail, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { useApp } from '../lib/store';

const LAST = 'ubid.lastUser.v1';

export function Login() {
  const { login, user, toast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate('/account', { replace: true });
    try {
      const saved = JSON.parse(localStorage.getItem(LAST) || 'null');
      if (saved?.username) setIdentifier(saved.username);
    } catch {}
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(identifier.trim(), password);
      try {
        if (remember) localStorage.setItem(LAST, JSON.stringify({ username: identifier.trim() }));
        else localStorage.removeItem(LAST);
      } catch {}
      const dest = (location.state as any)?.from || '/account';
      navigate(dest, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell side="login">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="badge"><Lock size={10} /> Secure sign-in</span>
        <Link to="/signup" className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Need an account? <ArrowRight size={12} />
        </Link>
      </div>
      <h1 style={{ fontSize: 30, letterSpacing: '-0.04em', margin: '14px 0 6px' }}>Welcome back</h1>
      <p className="small muted" style={{ marginBottom: 22 }}>
        Sign in to reload your library, scores and saved themes.
      </p>

      {error && (
        <motion.div className="form-error" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
          <AlertTriangle size={15} /> {error}
        </motion.div>
      )}

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="identifier">Username or email</label>
          <input
            id="identifier"
            className="input"
            autoComplete="username"
            placeholder="nova or nova@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              className="input"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'space-between', margin: '4px 0 20px', flexWrap: 'wrap', gap: 10 }}>
          <label className="checkbox">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember my details on this device
          </label>
        </div>

        <button className="btn btn-primary btn-lg" type="submit" disabled={busy || !identifier || !password} style={{ width: '100%' }}>
          {busy ? <Loader2 size={16} className="spin" /> : <Mail size={16} />}
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="form-note" style={{ marginTop: 18 }}>
        <Sparkles size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          Sessions last 60 days and are stored in an httpOnly cookie. Your theme and profile settings are saved with
          every login, so this device picks up exactly where you left it.
        </div>
      </div>

      <div className="divider" />
      <div className="text-center small muted">
        New here?{' '}
        <Link to="/signup" style={{ color: 'var(--accent-2)', fontWeight: 550 }}>
          Create a free account
        </Link>{' '}
        — no email verification, no spam.
      </div>
    </AuthShell>
  );
}
