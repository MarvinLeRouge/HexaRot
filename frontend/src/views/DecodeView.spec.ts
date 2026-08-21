import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import DecodeView from './DecodeView.vue'
import { useDecodeStore } from '../stores/decode'
import en from '../locales/en.json'
import {
  MOCK_DECODE_RESPONSE,
  MOCK_PNG_FILE,
  MOCK_SVG_FILE,
  MALFORMED_KEY,
} from '../__fixtures__/frontend.fixtures'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

function mountView() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(DecodeView, {
    global: { plugins: [createPinia(), i18n] },
  })
}

async function selectFile(wrapper: ReturnType<typeof mountView>, file: File) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], writable: false })
  await input.trigger('change')
}

describe('DecodeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  describe('initial state', () => {
    it('renders the file upload area', () => {
      const wrapper = mountView()
      expect(wrapper.find('input[type="file"]').exists()).toBe(true)
    })

    it('shows an empty-state placeholder in the output column before any submission', () => {
      const wrapper = mountView()
      expect(wrapper.find('.decode-view__output-empty').exists()).toBe(true)
    })

    it('renders the HR key input field', () => {
      const wrapper = mountView()
      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    })

    it('renders the submit button', () => {
      const wrapper = mountView()
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    })

    it('does not display a decoded message on initial render', () => {
      const wrapper = mountView()
      expect(wrapper.find('.decode-view__result').exists()).toBe(false)
    })
  })

  describe('file upload', () => {
    it('accepts a PNG file via the file input', async () => {
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      expect(wrapper.text()).toContain(MOCK_PNG_FILE.name)
    })

    it('accepts an SVG file via the file input', async () => {
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_SVG_FILE)
      expect(wrapper.text()).toContain(MOCK_SVG_FILE.name)
    })

    it('rejects files with unsupported extensions and shows an error', async () => {
      const wrapper = mountView()
      const invalidFile = new File(['x'], 'notes.txt', { type: 'text/plain' })
      await selectFile(wrapper, invalidFile)
      expect(wrapper.find('.decode-upload-area__error').exists()).toBe(true)
    })

    it('displays the uploaded filename after selection', async () => {
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      expect(wrapper.text()).toContain('cryptogram.png')
    })

    it('supports drag-and-drop (dragover and drop events are handled)', async () => {
      const wrapper = mountView()
      const dropZone = wrapper.find('.decode-upload-area')
      await dropZone.trigger('dragover')
      await dropZone.trigger('drop', { dataTransfer: { files: [MOCK_PNG_FILE] } })
      expect(wrapper.text()).toContain(MOCK_PNG_FILE.name)
    })
  })

  describe('form submission', () => {
    it('calls the decode API with the file content and key when submitted', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')

      // FileReader resolves via a browser task, not a microtask, so a single
      // flushPromises() tick is not guaranteed to be enough - poll instead.
      await vi.waitFor(() =>
        expect(postJson).toHaveBeenCalledWith(
          '/decode',
          expect.objectContaining({ format: 'png', key: 'HR1·a1b2', size: 'medium' }),
        ),
      )
    })

    it('shows a loading indicator while the API call is in progress', async () => {
      vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('button[type="submit"]').text()).toBe('Decoding...')
    })

    it('keeps the output column occupied with a skeleton while the API call is in progress', async () => {
      vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('.decode-view__output-loading').exists()).toBe(true)
      expect(wrapper.find('.decode-view__output-empty').exists()).toBe(false)
    })
  })

  describe('successful response', () => {
    it('displays the decoded message after a successful decode response', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')

      // FileReader resolves via a browser task, not a microtask, so a single
      // flushPromises() tick is not guaranteed to be enough - poll instead.
      await vi.waitFor(() => expect(wrapper.find('.decode-view__result').exists()).toBe(true))
      await flushPromises()

      expect(wrapper.find('.decode-view__result').text()).toContain(MOCK_DECODE_RESPONSE.message)
      expect(wrapper.find('.decode-view__output-empty').exists()).toBe(false)
    })
  })

  describe('stale result', () => {
    it('marks the decoded message stale, without removing it, when the key changes', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')
      await wrapper.find('form').trigger('submit')
      await vi.waitFor(() => expect(wrapper.find('.decode-view__result').exists()).toBe(true))
      await flushPromises()

      await wrapper.find('input[type="text"]').setValue('HR1·b2c3')

      expect(wrapper.find('.decode-view__result').text()).toContain(MOCK_DECODE_RESPONSE.message)
      expect(wrapper.find('.decode-view__stale-notice').exists()).toBe(true)
    })

    it('clears the stale notice when re-decoding', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')
      await wrapper.find('form').trigger('submit')
      await vi.waitFor(() => expect(wrapper.find('.decode-view__result').exists()).toBe(true))
      await flushPromises()
      await wrapper.find('input[type="text"]').setValue('HR1·b2c3')
      expect(wrapper.find('.decode-view__stale-notice').exists()).toBe(true)

      await wrapper.find('.decode-view__stale-notice button').trigger('click')
      await flushPromises()

      expect(wrapper.find('.decode-view__stale-notice').exists()).toBe(false)
    })
  })

  describe('error handling', () => {
    it('displays an error when the key format is invalid (client-side, before the API call)', async () => {
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue(MALFORMED_KEY)

      expect(wrapper.find('.decode-params-form__error').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
      expect(postJson).not.toHaveBeenCalled()
    })

    it('displays an error when the API call fails', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('invalid key', 'http', 400))
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')

      // FileReader resolves via a browser task, not a microtask, so a single
      // flushPromises() tick is not guaranteed to be enough - poll instead.
      await vi.waitFor(() => expect(wrapper.text()).toContain('invalid key'))
    })

    it('does not display a decoded message after an API error', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('invalid key', 'http', 400))
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')

      // FileReader resolves via a browser task, not a microtask, so a single
      // flushPromises() tick is not guaranteed to be enough - poll until the
      // error has actually surfaced before asserting the result is absent.
      await vi.waitFor(() => expect(wrapper.text()).toContain('invalid key'))

      expect(wrapper.find('.decode-view__result').exists()).toBe(false)
    })
  })

  describe('unmount', () => {
    it('resets the store when the view unmounts', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')
      await vi.waitFor(() => expect(wrapper.find('.decode-view__result').exists()).toBe(true))

      const store = useDecodeStore()
      expect(store.result).toBe(MOCK_DECODE_RESPONSE.message)

      wrapper.unmount()

      expect(store.result).toBeNull()
      expect(store.status).toBe('idle')
    })
  })

  describe('i18n', () => {
    it('renders no raw string literals - the submit button text comes from the locale file', () => {
      const wrapper = mountView()
      expect(wrapper.find('button[type="submit"]').text()).toBe(en.decode.form.submit.label)
    })
  })
})
