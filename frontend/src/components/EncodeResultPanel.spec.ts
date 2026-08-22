import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import EncodeResultPanel from './EncodeResultPanel.vue'
import en from '../locales/en.json'
import { MOCK_ENCODE_RESPONSE } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'
import { useEncodeStore } from '../stores/encode'
import type { EncodeResult } from '../stores/encode'

function mountPanel(props: { stale?: boolean; result?: EncodeResult } = {}) {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(EncodeResultPanel, {
    props: { result: MOCK_ENCODE_RESPONSE, ...props },
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('EncodeResultPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  describe('cryptogram size', () => {
    it('displays the size that produced this result, next to the key', () => {
      const wrapper = mountPanel({ result: { ...MOCK_ENCODE_RESPONSE, size: 'large' } })

      expect(wrapper.find('.encode-result-panel__key-size').text()).toContain(en.encode.form.size.large)
    })

    it('keeps showing the result size even after the live form field changes', async () => {
      const wrapper = mountPanel({ result: { ...MOCK_ENCODE_RESPONSE, size: 'small' } })
      const store = useEncodeStore()

      store.size = 'large'
      await flushPromises()

      expect(wrapper.find('.encode-result-panel__key-size').text()).toContain(en.encode.form.size.small)
      expect(wrapper.find('.encode-result-panel__key-size').text()).not.toContain(en.encode.form.size.large)
    })
  })

  describe('copy to clipboard', () => {
    it('copies the key and size together, and shows "Copied!" on success', async () => {
      Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
      const wrapper = mountPanel()

      await wrapper.find('.encode-result-panel__key button').trigger('click')
      await flushPromises()

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${MOCK_ENCODE_RESPONSE.key} · ${en.encode.form.size.medium}`)
      expect(wrapper.find('.encode-result-panel__key button').text()).toBe(en.encode.result.copied)
    })

    it('copies the snapshotted result size, not the live form field', async () => {
      Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
      const wrapper = mountPanel({ result: { ...MOCK_ENCODE_RESPONSE, size: 'large' } })
      const store = useEncodeStore()
      store.size = 'small'
      await flushPromises()

      await wrapper.find('.encode-result-panel__key button').trigger('click')
      await flushPromises()

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${MOCK_ENCODE_RESPONSE.key} · ${en.encode.form.size.large}`)
    })

    it('shows "Copy failed" when the clipboard write rejects', async () => {
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      })
      const wrapper = mountPanel()

      await wrapper.find('.encode-result-panel__key button').trigger('click')
      await flushPromises()

      expect(wrapper.find('.encode-result-panel__key button').text()).toBe(en.encode.result.copyError)
    })
  })

  describe('downloads', () => {
    it('downloads the PNG as a correctly-typed blob with the expected filename', async () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:png-url')
      const revokeObjectURL = vi.fn()
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
      let downloadedFilename = ''
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFilename = this.download
      })

      const wrapper = mountPanel()
      const [pngButton] = wrapper.findAll('.encode-result-panel__downloads button')
      await pngButton.trigger('click')

      expect(createObjectURL).toHaveBeenCalledOnce()
      const blob = createObjectURL.mock.calls[0][0] as Blob
      expect(blob.type).toBe('image/png')
      expect(downloadedFilename).toBe('hexarot-medium.png')
    })

    it('never includes the key in the filename, since it must travel on a separate channel', async () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:png-url')
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
      let downloadedFilename = ''
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFilename = this.download
      })

      const wrapper = mountPanel()
      const [pngButton] = wrapper.findAll('.encode-result-panel__downloads button')
      await pngButton.trigger('click')

      expect(downloadedFilename).not.toContain('A1B2')
      expect(downloadedFilename).not.toContain(MOCK_ENCODE_RESPONSE.key.replace(/[^0-9A-Za-z]/g, ''))
    })

    it('downloads the SVG as a correctly-typed blob with the expected filename', async () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:svg-url')
      const revokeObjectURL = vi.fn()
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
      let downloadedFilename = ''
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFilename = this.download
      })

      const wrapper = mountPanel()
      const [, svgButton] = wrapper.findAll('.encode-result-panel__downloads button')
      await svgButton.trigger('click')

      expect(createObjectURL).toHaveBeenCalledOnce()
      const blob = createObjectURL.mock.calls[0][0] as Blob
      expect(blob.type).toBe('image/svg+xml')
      expect(downloadedFilename).toBe('hexarot-medium.svg')
    })

    it('uses the result size in the download filename, not the live form field', async () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:png-url')
      const revokeObjectURL = vi.fn()
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
      let downloadedFilename = ''
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFilename = this.download
      })

      const wrapper = mountPanel({ result: { ...MOCK_ENCODE_RESPONSE, size: 'large' } })
      const store = useEncodeStore()
      store.size = 'small'
      await flushPromises()
      const [pngButton] = wrapper.findAll('.encode-result-panel__downloads button')
      await pngButton.trigger('click')

      expect(downloadedFilename).toBe('hexarot-large.png')
    })

    it('styles Download SVG the same as its Download PNG sibling', () => {
      const wrapper = mountPanel()
      const [pngButton, svgButton] = wrapper.findAll('.encode-result-panel__downloads button')

      expect(svgButton.classes()).toContain('btn-secondary')
      expect(svgButton.classes()).toEqual(pngButton.classes())
    })
  })

  describe('stale state', () => {
    it('shows no notice and enables all actions when not stale', () => {
      const wrapper = mountPanel()

      expect(wrapper.find('.encode-result-panel__stale-notice').exists()).toBe(false)
      expect(wrapper.find('.encode-result-panel__stale-badge').exists()).toBe(false)
      expect(wrapper.find('.encode-result-panel__key button').attributes('disabled')).toBeUndefined()
      const downloadButtons = wrapper.findAll('.encode-result-panel__downloads button')
      expect(downloadButtons[0].attributes('disabled')).toBeUndefined()
      expect(downloadButtons[1].attributes('disabled')).toBeUndefined()
    })

    it('shows a notice but keeps Copy and both downloads enabled when stale, so a still-valid result can still be saved', () => {
      const wrapper = mountPanel({ stale: true })

      expect(wrapper.find('.encode-result-panel__stale-notice').exists()).toBe(true)
      expect(wrapper.find('.encode-result-panel__key button').attributes('disabled')).toBeUndefined()
      const downloadButtons = wrapper.findAll('.encode-result-panel__downloads button')
      expect(downloadButtons[0].attributes('disabled')).toBeUndefined()
      expect(downloadButtons[1].attributes('disabled')).toBeUndefined()
    })

    it('marks the preview with a badge when stale, so the cryptogram itself keeps its true colors', () => {
      const wrapper = mountPanel({ stale: true })

      expect(wrapper.find('.encode-result-panel__stale-badge').text()).toBe(en.encode.result.staleBadge)
    })

    it('re-encodes with the current store parameters when Re-encode is clicked', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountPanel({ stale: true })
      const store = useEncodeStore()

      await wrapper.find('.encode-result-panel__stale-notice button').trigger('click')
      await flushPromises()

      expect(postJson).toHaveBeenCalledOnce()
      expect(store.status).toBe('success')
    })
  })
})
