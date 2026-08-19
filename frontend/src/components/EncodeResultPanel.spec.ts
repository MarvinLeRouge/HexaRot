import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import EncodeResultPanel from './EncodeResultPanel.vue'
import en from '../locales/en.json'
import { MOCK_ENCODE_RESPONSE } from '../__fixtures__/frontend.fixtures'

function mountPanel() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(EncodeResultPanel, {
    props: { result: MOCK_ENCODE_RESPONSE },
    global: { plugins: [i18n] },
  })
}

describe('EncodeResultPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('copy to clipboard', () => {
    it('copies the key and shows "Copied!" on success', async () => {
      Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
      const wrapper = mountPanel()

      await wrapper.find('.encode-result-panel__key button').trigger('click')
      await flushPromises()

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(MOCK_ENCODE_RESPONSE.key)
      expect(wrapper.find('.encode-result-panel__key button').text()).toBe(en.encode.result.copied)
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
      expect(downloadedFilename).toBe('hexarot-cryptogram.png')
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
      expect(downloadedFilename).toBe('hexarot-cryptogram.svg')
    })
  })
})
