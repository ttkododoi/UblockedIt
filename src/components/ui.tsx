import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { sfx } from '../lib/sound';

/** Scroll-triggered reveal with a soft spring. */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className, gap = 0.05 }: { children: ReactNode; className?: string; gap?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

/** Count-up number that animates once it enters the viewport. */
export function Counter({ to, suffix = '', duration = 1.4 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return (
    <span ref={ref}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

/** Button that leans towards the cursor and plays a hover tick. */
export function MagneticButton({
  children,
  className = 'btn',
  strength = 10,
  silent = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
  silent?: boolean;
  [key: string]: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 240, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 240, damping: 18 });

  return (
    <motion.div
      ref={ref}
      className="magnetic"
      style={{ x, y }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        x.set(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
        y.set(((e.clientY - r.top) / r.height - 0.5) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <motion.button
        className={className}
        whileTap={{ scale: 0.97 }}
        onPointerEnter={() => !silent && sfx.hover()}
        {...rest}
      >
        {children}
      </motion.button>
    </motion.div>
  );
}

/** Card surface that tracks the pointer for a living border glow. */
export function TiltCard({
  children,
  className = '',
  onClick,
  style,
  tilt = 0,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: any;
  tilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 180, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 180, damping: 20 });

  return (
    <motion.div
      ref={ref}
      className={`card ${className}`}
      style={{ ...style, rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * 100;
        const py = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty('--px', `${px}%`);
        el.style.setProperty('--py', `${py}%`);
        if (tilt) {
          ry.set(((e.clientX - r.left) / r.width - 0.5) * tilt);
          rx.set(-((e.clientY - r.top) / r.height - 0.5) * tilt);
        }
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 4.5v8.2a5.5 5.5 0 0 0 11 0V4.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="19" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="skeleton" style={{ aspectRatio: '16/11', borderRadius: 0 }} />
      <div style={{ padding: 15 }}>
        <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 11, width: '90%' }} />
      </div>
    </div>
  );
}
