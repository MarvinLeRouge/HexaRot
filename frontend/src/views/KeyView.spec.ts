import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import KeyView from './KeyView.vue'
import { useKeyStore } from '../stores/key'
import en from '../locales/en.json'
import { MOCK_KEY_GENERATE_RESPONSE, MOCK_KEY_PARSE_RESPONSE, MALFORMED_KEY } from '../__fixtures__/frontend.fixtures'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn(), getJson: vi.fn() }
})

import { postJson, getJson } from '../api/client'

function mountView() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(KeyView, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('KeyView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
    vi.mocked(getJson).mockReset()
  })

  describe('key generator section', () => {
    it('renders all parameter controls', () => {
      const wrapper = mountView()
      expect(wrapper.find('input[type="number"]').exists()).toBe(true)
      expect(wrapper.find('select[name="rotationDirection"]').exists()).toBe(true)
      expect(wrapper.find('select[name="readingOrder"]').exists()).toBe(true)
    })

    it('renders the generate button', () => {
      const wrapper = mountView()
      expect(wrapper.findAll('button[type="submit"]').length).toBe(2)
    })

    it('calls the key generate API when the generate button is clicked', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
      const wrapper = mountView()

      await wrapper.find('.key-generator-form').trigger('submit')
      await flushPromises()

      expect(postJson).toHaveBeenCalledWith('/key/generate', expect.any(Object))
    })

    it('displays the returned HR key after a successful generate response', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
      const wrapper = mountView()

      await wrapper.find('.key-generator-form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain(MOCK_KEY_GENERATE_RESPONSE.key)
    })

    it('renders a copy-to-clipboard button next to the key', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
      const wrapper = mountView()

      await wrapper.find('.key-generator-form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('.key-generator-form__result button').exists()).toBe(true)
    })

    it('provides visual feedback after clipboard copy', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
      Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
      const wrapper = mountView()

      await wrapper.find('.key-generator-form').trigger('submit')
      await flushPromises()
      await wrapper.find('.key-generator-form__result button').trigger('click')
      await flushPromises()

      expect(wrapper.find('.key-generator-form__result button').text()).toBe(en.key.generator.result.copied)
    })
  })

  describe('key parser section', () => {
    it('renders the key input field', () => {
      const wrapper = mountView()
      expect(wrapper.find('.key-parser-form input[type="text"]').exists()).toBe(true)
    })

    it('renders the parse button', () => {
      const wrapper = mountView()
      expect(wrapper.find('.key-parser-form button[type="submit"]').exists()).toBe(true)
    })

    it('calls the key parse API when the parse button is clicked', async () => {
      vi.mocked(getJson).mockResolvedValue(MOCK_KEY_PARSE_RESPONSE)
      const wrapper = mountView()

      await wrapper.find('.key-parser-form input[type="text"]').setValue('HR1·a1b2')
      await wrapper.find('.key-parser-form').trigger('submit')
      await flushPromises()

      expect(getJson).toHaveBeenCalledWith('/key/parse', { key: 'HR1·a1b2' })
    })

    it('displays all decoded parameters after a successful parse response', async () => {
      vi.mocked(getJson).mockResolvedValue(MOCK_KEY_PARSE_RESPONSE)
      const wrapper = mountView()

      await wrapper.find('.key-parser-form input[type="text"]').setValue('HR1·a1b2')
      await wrapper.find('.key-parser-form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain(String(MOCK_KEY_PARSE_RESPONSE.pivotBlockSize))
    })

    it('displays a clear error message for a malformed key (client-side validation)', async () => {
      const wrapper = mountView()

      await wrapper.find('.key-parser-form input[type="text"]').setValue(MALFORMED_KEY)

      expect(wrapper.find('.key-parser-form__error').exists()).toBe(true)
      expect(getJson).not.toHaveBeenCalled()
    })

    it('displays a clear error message when the API returns 400', async () => {
      vi.mocked(getJson).mockRejectedValue(new ApiError('unsupported key version', 'http', 400))
      const wrapper = mountView()

      await wrapper.find('.key-parser-form input[type="text"]').setValue('HR9·zzzz')
      await wrapper.find('.key-parser-form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('unsupported key version')
    })
  })

  describe('unmount', () => {
    it('resets the store when the view unmounts', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
      const wrapper = mountView()

      await wrapper.find('.key-generator-form').trigger('submit')
      await flushPromises()

      const store = useKeyStore()
      expect(store.generatedKey).toBe(MOCK_KEY_GENERATE_RESPONSE.key)

      wrapper.unmount()

      expect(store.generatedKey).toBeNull()
      expect(store.generateStatus).toBe('idle')
    })
  })

  describe('i18n', () => {
    it('renders no raw string literals - the generate button text comes from the locale file', () => {
      const wrapper = mountView()
      expect(wrapper.find('.key-generator-form button[type="submit"]').text()).toBe(en.key.generator.form.submit.label)
    })
  })
})
