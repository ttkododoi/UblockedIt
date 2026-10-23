export type Consent = {
  essential: true;
  preferences: boolean;
  analytics: boolean;
  decidedAt?: string;
};

export const COOKIE_NAMES = {
  consent: 'ubid_consent',
  theme: 'ubid_theme',
  accent: 'ubid_accent',
  motion: 'ubid_motion',
  sound: 'ubid_sound',
  lastUser: 'ubid_last_user',
};

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export const DEFAULT_CONSENT: Consent = { essential: true, preferences: true, analytics: false };

export function readConsent(): Consent | null {
  const raw = getCookie(COOKIE_NAMES.consent);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return { essential: true, preferences: !!parsed.preferences, analytics: !!parsed.analytics, decidedAt: parsed.decidedAt };
  } catch {
    return null;
  }
}

export function writeConsent(consent: Consent): Consent {
  const value: Consent = { ...consent, essential: true, decidedAt: new Date().toISOString() };
  setCookie(COOKIE_NAMES.consent, JSON.stringify(value), 365);
  if (!consent.preferences) {
    deleteCookie(COOKIE_NAMES.theme);
    deleteCookie(COOKIE_NAMES.accent);
    deleteCookie(COOKIE_NAMES.motion);
    deleteCookie(COOKIE_NAMES.sound);
    deleteCookie(COOKIE_NAMES.lastUser);
  }
  return value;
}

export function preferencesAllowed() {
  const consent = readConsent();
  return consent ? consent.preferences : false;
}
