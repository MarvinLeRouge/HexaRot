import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import LanguageSwitcher from './LanguageSwitcher.vue'
import en from '../locales/en.json'
import fr from '../locales/fr.json'

function mountSwitcher(locale: 'en' | 'fr') {
  const i18n = createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { en, fr } })
  const wrapper = mount(LanguageSwitcher, { global: { plugins: [i18n] } })
  return { wrapper, i18n }
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = 'en'
  })

  it('shows the other language name, written in that language, with a matching lang attribute', () => {
    const { wrapper } = mountSwitcher('en')
    const button = wrapper.get('button')

    expect(button.text()).toBe('Français')
    expect(button.attributes('lang')).toBe('fr')
  })

  it('offers English when the interface is in French', () => {
    const { wrapper } = mountSwitcher('fr')
    const button = wrapper.get('button')

    expect(button.text()).toBe('English')
    expect(button.attributes('lang')).toBe('en')
  })

  it('has an accessible name written in the target language', () => {
    const { wrapper } = mountSwitcher('en')

    expect(wrapper.get('button').attributes('aria-label')).toBe('Passer en français')
  })

  it('switches the active locale when clicked, without any route navigation', async () => {
    const { wrapper, i18n } = mountSwitcher('en')
    const button = wrapper.get('button')

    expect(button.attributes('type')).toBe('button')
    await button.trigger('click')

    expect(i18n.global.locale.value).toBe('fr')
    expect(button.text()).toBe('English')
  })

  it('persists the chosen locale and updates the document language', async () => {
    const { wrapper } = mountSwitcher('en')

    await wrapper.get('button').trigger('click')

    expect(localStorage.getItem('hexarot_locale')).toBe('fr')
    expect(document.documentElement.lang).toBe('fr')
  })
})
