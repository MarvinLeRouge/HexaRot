import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import KeyGeneratorForm from './KeyGeneratorForm.vue'
import en from '../locales/en.json'
import { MOCK_KEY_GENERATE_RESPONSE } from '../__fixtures__/frontend.fixtures'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

function mountForm() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(KeyGeneratorForm, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('KeyGeneratorForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  it('renders all parameter controls', () => {
    const wrapper = mountForm()
    expect(wrapper.find('input[type="number"]').exists()).toBe(true)
    expect(wrapper.find('.rotation-sequence-picker').exists()).toBe(true)
    expect(wrapper.find('select[name="rotationDirection"]').exists()).toBe(true)
    expect(wrapper.find('select[name="readingOrder"]').exists()).toBe(true)
  })

  it('renders the generate button', () => {
    const wrapper = mountForm()
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('calls the key generate API with the current parameters when the generate button is clicked', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
    const wrapper = mountForm()

    await wrapper.find('input[type="number"]').setValue(7)
    await wrapper.find('select[name="rotationDirection"]').setValue('ccw')
    await wrapper.find('select[name="readingOrder"]').setValue('RL-TB')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(postJson).toHaveBeenCalledWith('/key/generate', {
      pivotBlockSize: 7,
      rotationSequence: [0, 1, 2, 3],
      rotationDirection: 'ccw',
      readingOrder: 'RL-TB',
    })
  })

  it('displays the returned HR key after a successful generate response', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
    const wrapper = mountForm()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(MOCK_KEY_GENERATE_RESPONSE.key)
  })

  it('renders a copy-to-clipboard button next to the key', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
    const wrapper = mountForm()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.key-generator-form__result button').exists()).toBe(true)
  })

  it('provides visual feedback after a successful clipboard copy', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    const wrapper = mountForm()

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await wrapper.find('.key-generator-form__result button').trigger('click')
    await flushPromises()

    expect(wrapper.find('.key-generator-form__result button').text()).toBe(en.key.generator.result.copied)
  })

  it('displays an error when the generate API call fails', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('invalid parameters', 'http', 400))
    const wrapper = mountForm()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('invalid parameters')
  })

  describe('submit feedback', () => {
    it('marks the form busy and shows a spinner while generating', async () => {
      vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
      const wrapper = mountForm()
      await wrapper.find('form').trigger('submit')

      expect(wrapper.find('.key-generator-form').attributes('aria-busy')).toBe('true')
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    })

    it('moves focus to the result after a successful generate', async () => {
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus')
      vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
      const wrapper = mountForm()

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
      focusSpy.mockRestore()
    })
  })

  describe('stale key invalidation', () => {
    it('marks the generated key stale, without removing it, when a parameter is edited', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
      const wrapper = mountForm()
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.text()).toContain(MOCK_KEY_GENERATE_RESPONSE.key)

      await wrapper.find('input[type="number"]').setValue(99)

      expect(wrapper.text()).toContain(MOCK_KEY_GENERATE_RESPONSE.key)
      expect(wrapper.find('.key-generator-form__stale-notice').exists()).toBe(true)
    })

    it('disables Copy while the generated key is stale', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
      const wrapper = mountForm()
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      await wrapper.find('input[type="number"]').setValue(99)

      const copyButton = wrapper.find('.key-generator-form__result-content button')
      expect(copyButton.attributes('disabled')).toBeDefined()
    })

    it('clears the stale notice when re-generating', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
      const wrapper = mountForm()
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      await wrapper.find('input[type="number"]').setValue(99)
      expect(wrapper.find('.key-generator-form__stale-notice').exists()).toBe(true)

      await wrapper.find('.key-generator-form__stale-notice button').trigger('click')
      await flushPromises()

      expect(wrapper.find('.key-generator-form__stale-notice').exists()).toBe(false)
    })
  })

  describe('failed re-generate', () => {
    it('keeps the previous generated key visible when a re-generate fails', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
      const wrapper = mountForm()
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.text()).toContain(MOCK_KEY_GENERATE_RESPONSE.key)

      vi.mocked(postJson).mockRejectedValue(new ApiError('invalid parameters', 'http', 400))
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain(MOCK_KEY_GENERATE_RESPONSE.key)
      expect(wrapper.find('.key-generator-form__error').exists()).toBe(true)
    })
  })
})
