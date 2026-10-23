import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useApp } from '../lib/store';

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  if (!toasts.length) return null;

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          {t.kind === 'success' ? (
            <CheckCircle2 className="toast__icon" />
          ) : t.kind === 'error' ? (
            <AlertCircle className="toast__icon" />
          ) : (
            <Info className="toast__icon" />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {t.title && <div style={{ fontWeight: 600, marginBottom: 1 }}>{t.title}</div>}
            <div className="muted" style={{ fontSize: 13 }}>{t.message}</div>
          </div>
          <button className="iconbtn" style={{ width: 22, height: 22 }} onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
