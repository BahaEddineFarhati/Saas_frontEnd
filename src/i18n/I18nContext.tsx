import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import fr from './locales/fr.json';
import en from './locales/en.json';

// ── Types ──────────────────────────────────────────────────────────────────

export type Locale = 'fr' | 'en';

type TranslationDict = Record<string, unknown>;

const TRANSLATIONS: Record<Locale, TranslationDict> = { fr, en };

/** Maps our internal locale codes to BCP 47 tags for Intl / toLocaleDateString. */
const LOCALE_TAGS: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB' };

const STORAGE_KEY = 'linkup_lang';
const DEFAULT_LOCALE: Locale = 'fr';

// ── Helpers ────────────────────────────────────────────────────────────────

function loadLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'fr' || stored === 'en') return stored;
  return DEFAULT_LOCALE;
}

/**
 * Resolve a dot-notated key against a nested object.
 * e.g. resolve('nav.dashboard', { nav: { dashboard: 'Tableau de bord' } }) → 'Tableau de bord'
 */
function resolve(key: string, dict: TranslationDict): string | undefined {
  const parts = key.split('.');
  let current: unknown = dict;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Interpolate parameters into a translated string.
 * e.g. interpolate('Invitation envoyée à {email}', { email: 'a@b.com' })
 *   → 'Invitation envoyée à a@b.com'
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, paramKey) => {
    const value = params[paramKey];
    return value !== undefined ? String(value) : match;
  });
}

// ── Context ────────────────────────────────────────────────────────────────

interface I18nContextValue {
  /** Translate a key. Returns the translated string, with optional interpolation. */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Current locale */
  locale: Locale;
  /** BCP 47 locale tag for Intl APIs (e.g. 'fr-FR', 'en-GB') */
  localeTag: string;
  /** Switch the locale */
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // 1. Try to resolve in the current locale
      const dict = TRANSLATIONS[locale];
      let value = resolve(key, dict);

      // 2. Fallback to French (default locale) if not found
      if (value === undefined && locale !== DEFAULT_LOCALE) {
        value = resolve(key, TRANSLATIONS[DEFAULT_LOCALE]);
      }

      // 3. If still not found, return key and warn (dev only)
      if (value === undefined) {
        if (import.meta.env.DEV) {
          console.warn(`[i18n] Missing translation key: "${key}" (locale: ${locale})`);
        }
        // Return last segment of the key as human-readable fallback
        // e.g. 'nav.dashboard' → 'dashboard'
        const fallback = key.split('.').pop() ?? key;
        return params ? interpolate(fallback, params) : fallback;
      }

      return params ? interpolate(value, params) : value;
    },
    [locale],
  );

  const localeTag = LOCALE_TAGS[locale];
  const value = useMemo(() => ({ t, locale, localeTag, setLocale }), [t, locale, localeTag, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return ctx;
}
