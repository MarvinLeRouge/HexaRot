import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import EncodeView from './EncodeView.vue'
import { useEncodeStore } from '../stores/encode'
import en from '../locales/en.json'
import {
  MOCK_ENCODE_RESPONSE,
  MOCK_ENCODE_RESPONSE_WITH_WARNINGS,
} from '../__fixtures__/frontend.fixtures'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

function mountView() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(EncodeView, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('EncodeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  describe('initial state', () => {
    it('renders the message input field', () => {
      const wrapper = mountView()
      expect(wrapper.find('textarea').exists()).toBe(true)
    })

    it.each([
      ['pivotBlockSize', 'input[type="number"]'],
      ['rotationDirection', 'select[name="rotationDirection"]'],
      ['readingOrder', 'select[name="readingOrder"]'],
      ['size', 'select[name="size"]'],
    ])('renders the %s control', (_field, selector) => {
      const wrapper = mountView()
      expect(wrapper.find(selector).exists()).toBe(true)
    })

    it('renders the rotation sequence picker', () => {
      const wrapper = mountView()
      expect(wrapper.findAll('li').length).toBe(4)
    })

    it('renders the submit button', () => {
      const wrapper = mountView()
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    })

    it('does not display a cryptogram preview on initial render', () => {
      const wrapper = mountView()
      expect(wrapper.find('.encode-result-panel__svg').exists()).toBe(false)
    })

    it('does not display warnings or unknown chars on initial render', () => {
      const wrapper = mountView()
      expect(wrapper.find('.encode-result-panel__warnings').exists()).toBe(false)
      expect(wrapper.find('.encode-result-panel__unknown-chars').exists()).toBe(false)
    })
  })

  describe('form submission', () => {
    it('calls the encode API with the correct payload when the form is submitted', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(postJson).toHaveBeenCalledWith(
        '/encode',
        expect.objectContaining({ message: 'hello world', size: 'medium' }),
      )
    })

    it('shows a loading indicator while the API call is in progress', async () => {
      vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')

      await wrapper.find('form').trigger('submit')

      expect(wrapper.find('button[type="submit"]').text()).toBe('Encoding...')
    })

    it('hides the loading indicator after the API call resolves', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('button[type="submit"]').text()).toBe('Encode')
    })

    it.each([
      ['size', 'select[name="size"]', 'large'],
      ['readingOrder', 'select[name="readingOrder"]', 'BT-LR-ALT'],
      ['rotationDirection', 'select[name="rotationDirection"]', 'ccw'],
    ])('includes the selected %s value in the API payload', async (field, selector, value) => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find(selector).setValue(value)

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(postJson).toHaveBeenCalledWith('/encode', expect.objectContaining({ [field]: value }))
    })
  })

  describe('key mode', () => {
    it('shows an inline error for a malformed key and disables submit', async () => {
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('input[type="radio"][value="key"]').setValue()
      await wrapper.find('input[type="text"]').setValue('not-a-valid-key')

      expect(wrapper.find('.encode-params-form__error').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    })

    it('submits the key-mode payload for a well-formed key', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('input[type="radio"][value="key"]').setValue()
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(postJson).toHaveBeenCalledWith('/encode', expect.objectContaining({ message: 'hello world', key: 'HR1·a1b2' }))
    })
  })

  describe('successful response', () => {
    async function submitAndResolve(response = MOCK_ENCODE_RESPONSE) {
      vi.mocked(postJson).mockResolvedValue(response)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      return wrapper
    }

    it('displays the SVG preview after a successful encode response', async () => {
      const wrapper = await submitAndResolve()
      expect(wrapper.find('.encode-result-panel__svg svg').exists()).toBe(true)
    })

    it('displays the HR key returned by the API', async () => {
      const wrapper = await submitAndResolve()
      expect(wrapper.text()).toContain(MOCK_ENCODE_RESPONSE.key)
    })

    it('makes the HR key copyable (copy button present)', async () => {
      const wrapper = await submitAndResolve()
      expect(wrapper.text()).toContain('Copy')
    })

    it('shows a PNG download link/button', async () => {
      const wrapper = await submitAndResolve()
      expect(wrapper.text()).toContain('Download PNG')
    })

    it('shows an SVG download link/button', async () => {
      const wrapper = await submitAndResolve()
      expect(wrapper.text()).toContain('Download SVG')
    })
  })

  describe('stale result invalidation', () => {
    async function submitAndResolve() {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      return wrapper
    }

    it('clears the result when the message is edited after a successful encode', async () => {
      const wrapper = await submitAndResolve()
      expect(wrapper.text()).toContain(MOCK_ENCODE_RESPONSE.key)

      await wrapper.find('textarea').setValue('a completely different message')

      expect(wrapper.text()).not.toContain(MOCK_ENCODE_RESPONSE.key)
      expect(wrapper.find('.encode-result-panel__svg').exists()).toBe(false)
    })

    it('clears the result when the pivot block size is edited after a successful encode', async () => {
      const wrapper = await submitAndResolve()

      await wrapper.find('input[type="number"]').setValue(99)

      expect(wrapper.find('.encode-result-panel__svg').exists()).toBe(false)
    })

    it('clears the result when the mode is switched after a successful encode', async () => {
      const wrapper = await submitAndResolve()

      await wrapper.find('input[type="radio"][value="key"]').setValue()

      expect(wrapper.find('.encode-result-panel__svg').exists()).toBe(false)
    })

    it('does not clear anything before a result exists', async () => {
      const wrapper = mountView()

      await wrapper.find('textarea').setValue('hello world')

      const store = useEncodeStore()
      expect(store.status).toBe('idle')
    })
  })

  describe('warnings and unknown chars', () => {
    it('displays weakness warnings when the API response includes them', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE_WITH_WARNINGS)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('.encode-result-panel__warnings').text()).toContain(
        MOCK_ENCODE_RESPONSE_WITH_WARNINGS.warnings[0],
      )
    })

    it('displays the list of unknown characters when the API response includes them', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE_WITH_WARNINGS)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('.encode-result-panel__unknown-chars').text()).toContain('@')
    })

    it('does not display warning or unknown char sections when arrays are empty', async () => {
      const wrapper = await (async () => {
        vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
        const w = mountView()
        await w.find('textarea').setValue('hello world')
        await w.find('form').trigger('submit')
        await flushPromises()
        return w
      })()

      expect(wrapper.find('.encode-result-panel__warnings').exists()).toBe(false)
      expect(wrapper.find('.encode-result-panel__unknown-chars').exists()).toBe(false)
    })
  })

  describe('error handling', () => {
    it('displays an error message when the API call returns a 4xx or 5xx response', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('message must not be empty', 'http', 400))
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('message must not be empty')
    })

    it('does not display a cryptogram preview after an API error', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('message must not be empty', 'http', 400))
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('.encode-result-panel__svg').exists()).toBe(false)
    })

    it('clears the previous result when a new submission is made', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.find('.encode-result-panel__svg').exists()).toBe(true)

      vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
      await wrapper.find('form').trigger('submit')

      expect(wrapper.find('.encode-result-panel__svg').exists()).toBe(false)
    })
  })

  describe('i18n', () => {
    it('renders no raw string literals - the submit button text comes from the locale file', () => {
      const wrapper = mountView()
      expect(wrapper.find('button[type="submit"]').text()).toBe(en.encode.form.submit.label)
    })
  })

  describe('submit feedback', () => {
    it('marks the view busy and shows a spinner while the request is in flight', async () => {
      vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')

      expect(wrapper.find('.encode-view').attributes('aria-busy')).toBe('true')
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    })

    it('moves focus to the result panel after a successful encode', async () => {
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus')
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
      focusSpy.mockRestore()
    })

    it('does not mark the view busy once the request has settled', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('.encode-view').attributes('aria-busy')).toBe('false')
    })
  })

  describe('unmount', () => {
    it('does not reset the store when the view unmounts after a successful encode', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      const store = useEncodeStore()
      expect(store.result).toEqual(MOCK_ENCODE_RESPONSE)

      wrapper.unmount()

      expect(store.result).toEqual(MOCK_ENCODE_RESPONSE)
      expect(store.status).toBe('success')
    })

    it('resets the store when the view unmounts without a successful encode', () => {
      const wrapper = mountView()
      const store = useEncodeStore()
      store.message = 'a draft message'

      wrapper.unmount()

      expect(store.message).toBe('')
      expect(store.status).toBe('idle')
    })
  })
})
