import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Check, Eye, EyeOff, Loader2, Sparkles, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { useApp } from '../lib/store';

const AVATAR_PREVIEW = ['🛸', '👾', '🎮', '🚀', '🦊', '🐉', '👻', '🧠', '⚡', '🌌'];

function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

export function Signup() {
  const { signup, user } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', displayName: '', email: '', password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate('/account', { replace: true });
  }, [user, navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Those passwords do not match.');
    if (form.password.length < 8) return setError('Use at least 8 characters for your password.');
    if (!agree) return setError('Please accept the house rules to continue.');
    setBusy(true);
    try {
      await signup({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        displayName: form.displayName.trim() || form.username.trim(),
      });
      navigate('/account', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  const pwScore = strength(form.password);

  return (
    <AuthShell side="signup">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="badge badge-accent"><Sparkles size={10} /> Free forever</span>
        <Link to="/login" className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Already have one? <ArrowRight size={12} />
        </Link>
      </div>
      <h1 style={{ fontSize: 30, letterSpacing: '-0.04em', margin: '14px 0 6px' }}>Create your player</h1>
      <p className="small muted" style={{ marginBottom: 22 }}>
        Pick a name, set a password, and everything you play follows you.
      </p>

      {error && (
        <motion.div className="form-error" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
          <AlertTriangle size={15} /> {error}
        </motion.div>
      )}

      <form onSubmit={submit}>
        <div className="row" style={{ gap: 10, marginBottom: 16 }}>
          {AVATAR_PREVIEW.slice(0, 6).map((a, i) => (
            <motion.span
              key={a}
              className="avatar"
              style={{ ['--hue' as any]: i * 47, width: 34, height: 34, fontSize: 16, borderRadius: 10, opacity: i === 0 ? 1 : 0.45 }}
              animate={i === 0 ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 2.4, repeat: Infinity }}
            >
              {a}
            </motion.span>
          ))}
          <span className="small muted" style={{ alignSelf: 'center' }}>Your avatar is randomised — change it later.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" className="input" placeholder="pixelqueen" autoComplete="username" value={form.username} onChange={set('username')} required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" />
          </div>
          <div className="field">
            <label htmlFor="displayName">Display name <span className="muted">(optional)</span></label>
            <input id="displayName" className="input" placeholder="Pixel Queen" value={form.displayName} onChange={set('displayName')} maxLength={40} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" placeholder="you@example.com" autoComplete="email" value={form.email} onChange={set('email')} required />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              className="input"
              type={show ? 'text' : 'password'}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
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
          <div className="row" style={{ gap: 6, marginTop: 2 }}>
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                animate={{
                  background:
                    i < pwScore
                      ? pwScore <= 1
                        ? '#ff4d6d'
                        : pwScore === 2
                        ? '#ffb703'
                        : '#22c55e'
                      : 'color-mix(in srgb, var(--text) 10%, transparent)',
                }}
                style={{ height: 4, flex: 1, borderRadius: 99 }}
              />
            ))}
            <span className="small muted" style={{ minWidth: 62, textAlign: 'right', fontSize: 11 }}>
              {['weak', 'weak', 'okay', 'strong', 'excellent'][pwScore]}
            </span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input id="confirm" className="input" type={show ? 'text' : 'password'} placeholder="Repeat it" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
          <AnimatePresence>
            {form.confirm && form.confirm === form.password && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="row small" style={{ gap: 5, color: '#4ade80' }}>
                <Check size={12} /> Passwords match
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <label className="checkbox" style={{ marginBottom: 18 }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          I’ll be decent, won’t post piracy links, and accept the house rules.
        </label>

        <button className="btn btn-primary btn-lg" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="form-note" style={{ marginTop: 16 }}>
        <Sparkles size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>We only store what the hub needs: your credentials (scrypt-hashed), display profile, library and scores.</div>
      </div>
    </AuthShell>
  );
}
