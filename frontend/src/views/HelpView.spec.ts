import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import HelpView from './HelpView.vue'
import en from '../locales/en.json'
import fr from '../locales/fr.json'

async function mountView(path: string, locale: 'en' | 'fr' = 'en') {
  const i18n = createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { en, fr } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/help', component: HelpView }] })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(HelpView, { global: { plugins: [i18n, router] }, attachTo: document.body })
  await waitForHeading(wrapper, 'How HexaRot works', 'Le principe de HexaRot')
  return { wrapper, i18n }
}

/** The help content is a lazily imported module, so it lands after more than one tick. */
async function waitForHeading(wrapper: { text: () => string }, ...headings: string[]) {
  await vi.waitFor(() => {
    if (!headings.some((heading) => wrapper.text().includes(heading))) throw new Error('help content not rendered yet')
  })
  await flushPromises()
}

// Mounted into document.body for getElementById, so each test must clean up after itself
enableAutoUnmount(afterEach)

describe('HelpView', () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    scrollIntoView.mockReset()
    Element.prototype.scrollIntoView = scrollIntoView
  })

  it('renders the help content of the active locale', async () => {
    const { wrapper } = await mountView('/help')

    expect(wrapper.get('#pivot-block-size').text()).toBe('Pivot block size')
  })

  it('switches to the other locale content when the language changes, without reloading', async () => {
    const { wrapper, i18n } = await mountView('/help')

    i18n.global.locale.value = 'fr'
    await waitForHeading(wrapper, 'Le principe de HexaRot')

    expect(wrapper.get('#pivot-block-size').text()).toBe('Taille du bloc pivot')
  })

  it('scrolls to the section named in the URL hash once the content is rendered', async () => {
    const { wrapper } = await mountView('/help#reading-order')

    expect(scrollIntoView).toHaveBeenCalled()
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(wrapper.get('#reading-order').element)
  })

  it('keeps the hash target in view after a language switch', async () => {
    const { wrapper, i18n } = await mountView('/help#reading-order')
    scrollIntoView.mockReset()

    i18n.global.locale.value = 'fr'
    await waitForHeading(wrapper, 'Le principe de HexaRot')

    expect(scrollIntoView.mock.contexts.at(-1)).toBe(wrapper.get('#reading-order').element)
  })

  it('does not scroll when the URL has no hash', async () => {
    await mountView('/help')

    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
