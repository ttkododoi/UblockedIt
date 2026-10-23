import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import { applyTheme, THEMES } from './themes';
import { sfx, setSoundEnabled } from './sound';

type User = {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatar: string;
  avatarHue: number;
  bio: string;
  theme: string;
  accent: string;
  sound: boolean;
  motion: boolean;
  createdAt: string;
  lastLogin: string | null;
  loginCount: number;
};

type Stats = { plays: number; minutes: number; best: Record<string, number>; apks: number };

type Settings = {
  theme: string;
  accent: string;
  sound: boolean;
  motion: boolean;
};

type Toast = { id: number; message: string; kind: 'info' | 'success' | 'error'; title?: string };

type Ctx = {
  user: User | null;
  ready: boolean;
  favorites: string[];
  stats: Stats;
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  refreshAuth: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (data: { username: string; email: string; password: string; displayName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<User> & { password?: string }) => Promise<any>;
  toggleFavorite: (gameId: string) => Promise<boolean>;
  toast: (message: string, kind?: Toast['kind'], title?: string) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  player: string | null;
  openPlayer: (gameId: string) => void;
  closePlayer: () => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
};

const AppCtx = createContext<Ctx | null>(null);

const LS_KEY = 'ubid.settings.v1';
const LS_USER = 'ubid.lastUser.v1';

function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return {
      theme: raw.theme || 'nebula',
      accent: raw.accent || '',
      sound: raw.sound !== false,
      motion: raw.motion !== false,
    };
  } catch {
    return { theme: 'nebula', accent: '', sound: true, motion: true };
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({ plays: 0, minutes: 0, best: {}, apks: 0 });
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [player, setPlayer] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const toastId = useRef(1);

  const toast = useCallback((message: string, kind: Toast['kind'] = 'info', title?: string) => {
    const id = toastId.current++;
    setToasts((t) => [...t.slice(-3), { id, message, kind, title }]);
    if (kind === 'success') sfx.success();
    if (kind === 'error') sfx.error();
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4600);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // theme + motion + sound side effects
  useEffect(() => {
    applyTheme(settings.theme, settings.accent || undefined);
    document.documentElement.classList.toggle('reduce-motion', !settings.motion);
    setSoundEnabled(settings.sound);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(settings));
    } catch {
      /* storage blocked */
    }
  }, [settings]);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((s) => ({ ...s, ...patch }));
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const data = await api.get<{ user: User | null; favorites: string[]; stats: Stats }>('/api/auth/me');
      setUser(data.user);
      setFavorites(data.favorites || []);
      if (data.stats) setStats(data.stats);
      if (data.user) {
        const next: Settings = {
          theme: data.user.theme || 'nebula',
          accent: data.user.accent || '',
          sound: data.user.sound !== false,
          motion: data.user.motion !== false,
        };
        setSettingsState((cur) => {
          const merged = {
            theme: THEMES.some((t) => t.id === next.theme) ? next.theme : cur.theme,
            accent: next.accent || cur.accent,
            sound: data.user!.sound,
            motion: data.user!.motion,
          };
          return merged;
        });
        localStorage.setItem(LS_USER, JSON.stringify({ username: data.user.username, email: data.user.email }));
      }
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const data = await api.post<{ user: User }>('/api/auth/login', { identifier, password });
      setUser(data.user);
      await refreshAuth();
      toast(`Welcome back, ${data.user.displayName}.`, 'success');
    },
    [refreshAuth, toast]
  );

  const signup = useCallback(
    async (payload: { username: string; email: string; password: string; displayName?: string }) => {
      const data = await api.post<{ user: User }>('/api/auth/signup', payload);
      setUser(data.user);
      await refreshAuth();
      toast('Account created — your progress now follows you everywhere.', 'success', 'Welcome aboard');
    },
    [refreshAuth, toast]
  );

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    setUser(null);
    setFavorites([]);
    setStats({ plays: 0, minutes: 0, best: {}, apks: 0 });
    toast('Signed out. Your local settings are still saved on this device.');
  }, [toast]);

  const updateProfile = useCallback(
    async (patch: Partial<User> & { password?: string }) => {
      if (patch.password) {
        await api.post('/api/auth/password', { current: (patch as any).current, next: patch.password });
      }
      const { password, ...rest } = patch as any;
      const data = await api.patch<{ user: User }>('/api/auth/me', rest);
      setUser(data.user);
      return data.user;
    },
    []
  );

  const toggleFavorite = useCallback(
    async (gameId: string) => {
      if (!user) {
        toast('Sign in to build your library.', 'error', 'Not signed in');
        return false;
      }
      const isFav = favorites.includes(gameId);
      setFavorites((f) => (isFav ? f.filter((x) => x !== gameId) : [...f, gameId]));
      try {
        if (isFav) await api.del(`/api/favorites/${gameId}`);
        else await api.post(`/api/favorites/${gameId}`);
        sfx.tap();
      } catch {
        toast('Could not update your library.', 'error');
      }
      return !isFav;
    },
    [favorites, toast, user]
  );

  const openPlayer = useCallback((gameId: string) => {
    setPlayer(gameId);
    sfx.open();
    document.body.style.overflow = 'hidden';
    try {
      const recent: string[] = JSON.parse(localStorage.getItem('ubid.recent') || '[]');
      localStorage.setItem('ubid.recent', JSON.stringify([gameId, ...recent.filter((x) => x !== gameId)].slice(0, 8)));
    } catch {}
  }, []);

  const closePlayer = useCallback(() => {
    setPlayer(null);
    sfx.close();
    document.body.style.overflow = '';
  }, []);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // pointer parallax for the aurora backdrop
  useEffect(() => {
    if (!settings.motion) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        document.documentElement.style.setProperty('--mx', String(x));
        document.documentElement.style.setProperty('--my', String(y));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [settings.motion]);

  const value = useMemo<Ctx>(
    () => ({
      user,
      ready,
      favorites,
      stats,
      settings,
      setSettings,
      refreshAuth,
      login,
      signup,
      logout,
      updateProfile,
      toggleFavorite,
      toast,
      toasts,
      dismissToast,
      player,
      openPlayer,
      closePlayer,
      commandOpen,
      setCommandOpen,
    }),
    [
      user,
      ready,
      favorites,
      stats,
      settings,
      setSettings,
      refreshAuth,
      login,
      signup,
      logout,
      updateProfile,
      toggleFavorite,
      toast,
      toasts,
      dismissToast,
      player,
      openPlayer,
      closePlayer,
      commandOpen,
    ]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function usePlayTracker() {
  const started = useRef<number>(Date.now());
  const { user } = useApp();
  return useCallback(
    (gameId: string, provider = 'local') => {
      const seconds = Math.round((Date.now() - started.current) / 1000);
      api.post('/api/play', { gameId, provider, seconds }).catch(() => {});
      started.current = Date.now();
      return user != null;
    },
    [user]
  );
}
