import { Languages } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import type { Locale } from '../i18n/I18nContext';

/**
 * Floating language toggle for guest pages (Login, ForgotPassword, etc.)
 * that don't have the sidebar. Renders as a small pill in the top-right corner.
 */
export default function LanguageToggleFloating() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <button
      className="lu-lang-toggle-floating"
      onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr' as Locale)}
      aria-label={t('common.switchLanguage')}
      title={t('common.switchLanguage')}
    >
      <Languages size={14} strokeWidth={1.8} />
      <span>{locale === 'fr' ? 'EN' : 'FR'}</span>
    </button>
  );
}
