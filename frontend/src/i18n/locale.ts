export const SUPPORTED_LOCALES = ['en', 'fr'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

const STORAGE_KEY = 'hexarot_locale'
export const DEFAULT_LOCALE: Locale = 'en'

function isSupportedLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale)
}

/**
 * Picks the startup locale: the user's saved choice wins, then the first
 * browser language whose primary subtag is supported (`fr-CA` gives `fr`),
 * then English.
 */
export function resolveInitialLocale(stored: string | null, browserLanguages: readonly string[]): Locale {
  if (isSupportedLocale(stored)) return stored
  const browserLocale = browserLanguages.map((language) => language.split('-')[0]).find(isSupportedLocale)
  return browserLocale ?? DEFAULT_LOCALE
}

export function loadStoredLocale(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

/** Sets <html lang> so screen readers apply the right pronunciation rules. */
export function applyDocumentLanguage(locale: Locale): void {
  document.documentElement.lang = locale
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(STORAGE_KEY, locale)
  applyDocumentLanguage(locale)
}
