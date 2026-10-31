import { describe, it, expect, beforeEach } from 'vitest'
import { resolveInitialLocale, saveLocale, loadStoredLocale } from './locale'

describe('resolveInitialLocale', () => {
  it('returns the stored locale when it is supported', () => {
    expect(resolveInitialLocale('fr', ['en-US'])).toBe('fr')
  })

  it('ignores a stored value that is not a supported locale', () => {
    expect(resolveInitialLocale('de', ['fr-FR'])).toBe('fr')
  })

  it.each([['fr-FR'], ['fr-CA'], ['fr']])(
    'falls back to the browser language %s when nothing is stored',
    (language) => {
      expect(resolveInitialLocale(null, [language])).toBe('fr')
    },
  )

  it('uses the first supported browser language, in preference order', () => {
    expect(resolveInitialLocale(null, ['de-DE', 'en-GB', 'fr-FR'])).toBe('en')
  })

  it('returns en when neither the stored value nor any browser language is supported', () => {
    expect(resolveInitialLocale('xx', ['de-DE', 'es'])).toBe('en')
    expect(resolveInitialLocale(null, [])).toBe('en')
  })
})

describe('saveLocale', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = 'en'
  })

  it('writes the locale to localStorage', () => {
    saveLocale('fr')

    expect(localStorage.getItem('hexarot_locale')).toBe('fr')
    expect(loadStoredLocale()).toBe('fr')
  })

  it('sets document.documentElement.lang to the locale', () => {
    saveLocale('fr')

    expect(document.documentElement.lang).toBe('fr')
  })
})
