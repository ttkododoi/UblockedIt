import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useApp } from '../lib/store';

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast ${t.kind}`}
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            layout
          >
            <span className="t-icon">
              {t.kind === 'success' ? <CheckCircle2 size={16} /> : t.kind === 'error' ? <AlertTriangle size={16} /> : <Info size={16} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {t.title && <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 1 }}>{t.title}</div>}
              <div style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.5 }}>{t.message}</div>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
              style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
