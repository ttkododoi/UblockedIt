import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MagneticButton } from '../components/ui';

export function NotFound() {
  return (
    <div className="page flex-center" style={{ minHeight: '72vh', flexDirection: 'column', textAlign: 'center' }}>
      <div
        className="mono"
        style={{
          fontSize: 'clamp(80px,18vw,180px)',
          fontWeight: 700,
          lineHeight: 1,
          background: 'linear-gradient(120deg, var(--accent), var(--accent-2))',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          letterSpacing: '-0.06em',
        }}
      >
        404
      </div>
      <h1 style={{ fontSize: 'clamp(24px,3vw,34px)', marginTop: 8 }}>This level was never built</h1>
      <p className="muted" style={{ maxWidth: 420, marginTop: 10, fontSize: 14 }}>
        The page you were looking for despawned. The arcade, however, is still very much open.
      </p>
      <div className="row" style={{ gap: 12, marginTop: 24 }}>
        <Link to="/">
          <MagneticButton className="btn btn-primary">
            <ArrowLeft size={15} /> Back to the hub
          </MagneticButton>
        </Link>
        <Link to="/games" className="btn">
          <Compass size={15} /> Browse games
        </Link>
      </div>
    </div>
  );
}
