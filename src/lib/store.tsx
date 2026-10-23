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
import { applyTheme } from './themes';
import {
  COOKIE_NAMES,
  DEFAULT_CONSENT,
  getCookie,
  readConsent,
  setCookie,
  writeConsent,
  type Consent,
} from './cookies';

export type User = {
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
type Settings = { theme: string; accent: string; sound: boolean; motion: boolean };
type Toast = { id: number; message: string; kind: 'info' | 'success' | 'error'; title?: string };

type Ctx = {
  user: User | null;
  ready: boolean;
  favorites: string[];
  stats: Stats;
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  consent: Consent | null;
  saveConsent: (c: Consent) => void;
  openCookiePrefs: () => void;
  cookiePrefsOpen: boolean;
  setCookiePrefsOpen: (v: boolean) => void;
  refreshAuth: () => Promise<void>;
  login: (identifier: string, password: string, remember?: boolean) => Promise<void>;
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

const Ctx = createContext<Ctx | null>(null);

function loadSettings(): Settings {
  return {
    theme: getCookie(COOKIE_NAMES.theme) || 'white',
    accent: getCookie(COOKIE_NAMES.accent) || '',
    sound: getCookie(COOKIE_NAMES.sound) !== 'off',
    motion: getCookie(COOKIE_NAMES.motion) !== 'off',
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({ plays: 0, minutes: 0, best: {}, apks: 0 });
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [consent, setConsent] = useState<Consent | null>(() => readConsent());
  const [cookiePrefsOpen, setCookiePrefsOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [player, setPlayer] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const toastId = useRef(1);

  const toast = useCallback((message: string, kind: Toast['kind'] = 'info', title?: string) => {
    const id = toastId.current++;
    setToasts((t) => [...t.slice(-2), { id, message, kind, title }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // theme + motion
  useEffect(() => {
    applyTheme(settings.theme, settings.accent || undefined);
    document.documentElement.dataset.motion = settings.motion ? 'on' : 'off';
    if (consent?.preferences) {
      setCookie(COOKIE_NAMES.theme, settings.theme);
      setCookie(COOKIE_NAMES.accent, settings.accent);
      setCookie(COOKIE_NAMES.motion, settings.motion ? 'on' : 'off');
      setCookie(COOKIE_NAMES.sound, settings.sound ? 'on' : 'off');
    }
  }, [settings, consent?.preferences]);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((s) => {
      const next = { ...s, ...patch };
      if (consent?.preferences) {
        if (patch.theme) setCookie(COOKIE_NAMES.theme, next.theme);
        if (patch.accent !== undefined) setCookie(COOKIE_NAMES.accent, next.accent);
        if (patch.motion !== undefined) setCookie(COOKIE_NAMES.motion, next.motion ? 'on' : 'off');
        if (patch.sound !== undefined) setCookie(COOKIE_NAMES.sound, next.sound ? 'on' : 'off');
      }
      return next;
    });
  }, [consent?.preferences]);

  const saveConsent = useCallback((c: Consent) => {
    const saved = writeConsent(c);
    setConsent(saved);
    setCookiePrefsOpen(false);
    if (!saved.preferences) {
      setSettingsState((s) => ({ ...s }));
    } else {
      // re-persist current choices now that preferences are allowed
      setCookie(COOKIE_NAMES.theme, settings.theme);
      setCookie(COOKIE_NAMES.accent, settings.accent);
      setCookie(COOKIE_NAMES.motion, settings.motion ? 'on' : 'off');
      setCookie(COOKIE_NAMES.sound, settings.sound ? 'on' : 'off');
    }
  }, [settings]);

  const refreshAuth = useCallback(async () => {
    try {
      const data = await api.get<{ user: User | null; favorites: string[]; stats: Stats }>('/api/auth/me');
      setUser(data.user);
      setFavorites(data.favorites || []);
      if (data.stats) setStats(data.stats);
      if (data.user) {
        setSettingsState({
          theme: data.user.theme || 'white',
          accent: data.user.accent || '',
          sound: data.user.sound !== false,
          motion: data.user.motion !== false,
        });
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
    async (identifier: string, password: string, remember = true) => {
      const data = await api.post<{ user: User }>('/api/auth/login', { identifier, password });
      setUser(data.user);
      await refreshAuth();
      if (remember && consent?.preferences) setCookie(COOKIE_NAMES.lastUser, data.user.username, 180);
      toast(`Welcome back, ${data.user.displayName}.`, 'success');
    },
    [refreshAuth, consent?.preferences, toast]
  );

  const signup = useCallback(
    async (payload: { username: string; email: string; password: string; displayName?: string }) => {
      const data = await api.post<{ user: User }>('/api/auth/signup', payload);
      setUser(data.user);
      await refreshAuth();
      toast('Account created.', 'success', 'Welcome to UblockedIt');
    },
    [refreshAuth, toast]
  );

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    setUser(null);
    setFavorites([]);
    setStats({ plays: 0, minutes: 0, best: {}, apks: 0 });
    toast('Signed out.');
  }, [toast]);

  const updateProfile = useCallback(async (patch: Partial<User> & { password?: string }) => {
    const { password, ...rest } = patch as any;
    if (password) await api.post('/api/auth/password', { current: (patch as any).current, next: password });
    const data = await api.patch<{ user: User }>('/api/auth/me', rest);
    setUser(data.user);
    return data.user;
  }, []);

  const toggleFavorite = useCallback(
    async (gameId: string) => {
      if (!user) {
        toast('Sign in to save games to your library.', 'error', 'Not signed in');
        return false;
      }
      const isFav = favorites.includes(gameId);
      setFavorites((f) => (isFav ? f.filter((x) => x !== gameId) : [...f, gameId]));
      try {
        if (isFav) await api.del(`/api/favorites/${gameId}`);
        else await api.post(`/api/favorites/${gameId}`);
      } catch {
        toast('Could not update your library.', 'error');
      }
      return !isFav;
    },
    [favorites, toast, user]
  );

  const openPlayer = useCallback((gameId: string) => {
    setPlayer(gameId);
    document.body.style.overflow = 'hidden';
    try {
      const recent: string[] = JSON.parse(localStorage.getItem('ubid.recent') || '[]');
      localStorage.setItem('ubid.recent', JSON.stringify([gameId, ...recent.filter((x) => x !== gameId)].slice(0, 8)));
    } catch {
      /* storage may be blocked */
    }
  }, []);

  const closePlayer = useCallback(() => {
    setPlayer(null);
    document.body.style.overflow = '';
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      user, ready, favorites, stats, settings, setSettings,
      consent: consent ?? { ...DEFAULT_CONSENT },
      saveConsent, openCookiePrefs: () => setCookiePrefsOpen(true), cookiePrefsOpen, setCookiePrefsOpen,
      refreshAuth, login, signup, logout, updateProfile, toggleFavorite,
      toast, toasts, dismissToast, player, openPlayer, closePlayer, commandOpen, setCommandOpen,
    }),
    [user, ready, favorites, stats, settings, setSettings, consent, saveConsent, cookiePrefsOpen, refreshAuth, login, signup, logout, updateProfile, toggleFavorite, toast, toasts, dismissToast, player, openPlayer, closePlayer, commandOpen]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function initials(name: string) {
  return (name || '?')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function avatarColor(hue = 210) {
  return `hsl(${hue} 62% 46%)`;
}
