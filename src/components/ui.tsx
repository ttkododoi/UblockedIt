import {
  Blocks,
  Box,
  CircleDot,
  Copy,
  Cpu,
  Disc3,
  Gamepad2,
  Hand,
  HardDrive,
  Layers,
  Monitor,
  MousePointer2,
  RectangleHorizontal,
  Smartphone,
  SquareStack,
  Triangle,
  Usb,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { avatarColor, initials } from '../lib/store';

/* ------------------------------------------------------------------- logo */

export function Logo({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6.5 4.5v8.2a5.5 5.5 0 0 0 11 0V4.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="12" cy="19" r="1.7" fill="currentColor" />
    </svg>
  );
}

/* --------------------------------------------------------------- icon maps */

const ICONS: Record<string, LucideIcon> = {
  cart: Gamepad2,
  handheld: Smartphone,
  disc: Disc3,
  arcade: CircleDot,
  computer: HardDrive,
  vector: Triangle,
  zap: Zap,
  monitor: Monitor,
  blocks: Blocks,
  box: Box,
  usb: Usb,
  layers: Layers,
  cpu: Cpu,
  copy: Copy,
  mouse: MousePointer2,
  rect: RectangleHorizontal,
  stack: SquareStack,
  hand: Hand,
};

export function CatIcon({ name, size = 18, ...rest }: { name: string; size?: number; [key: string]: any }) {
  const Cmp = ICONS[name] || Gamepad2;
  return <Cmp size={size} strokeWidth={1.8} {...rest} />;
}

/* ------------------------------------------------------------ reveal helper */

export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: 0 | 1 | 2 | 3;
  className?: string;
  as?: any;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref as any} className={`reveal ${delay ? `reveal-d${delay}` : ''} ${inView ? 'is-in' : ''} ${className}`}>
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------- avatar */

export function Avatar({
  name,
  hue,
  size = 30,
  className = '',
}: {
  name: string;
  hue?: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4), ['--av' as any]: avatarColor(hue ?? 210) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ---------------------------------------------------------------- skeleton */

export function SkeletonTile() {
  return (
    <div className="tile" style={{ cursor: 'default' }}>
      <div className="skeleton" style={{ aspectRatio: '16 / 10', borderRadius: 0 }} />
      <div style={{ padding: 16 }}>
        <div className="skeleton" style={{ height: 13, width: '65%', marginBottom: 9 }} />
        <div className="skeleton" style={{ height: 11, width: '92%' }} />
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Box,
  title,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon className="empty__icon" />
      <h3>{title}</h3>
      <div className="small muted">{children}</div>
    </div>
  );
}
