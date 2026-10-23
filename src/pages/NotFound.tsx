import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';
import { GameCard } from '../components/GameCard';

export function NotFound() {
  const { catalog } = useCatalog();
  const picks = (catalog?.games || []).slice(0, 3);

  return (
    <>
      <div style={{ textAlign: 'center', padding: '48px 0 40px' }}>
        <span className="dropzone__icon" style={{ margin: '0 auto 16px' }}><Compass size={22} /></span>
        <div className="mono tiny muted" style={{ letterSpacing: '.18em', textTransform: 'uppercase' }}>Error 404</div>
        <h1 className="h2" style={{ marginTop: 10 }}>This page never shipped.</h1>
        <p className="muted" style={{ marginTop: 10, maxWidth: 420, marginInline: 'auto' }}>
          The link is broken or the page moved. The games are all still here though.
        </p>
        <div className="row" style={{ gap: 10, justifyContent: 'center', marginTop: 22 }}>
          <Link to="/" className="btn btn--primary"><ArrowLeft size={15} /> Back home</Link>
          <Link to="/games" className="btn btn--outline">Browse games</Link>
        </div>
      </div>
      {picks.length > 0 && (
        <div className="grid grid--3">
          {picks.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      )}
    </>
  );
}
