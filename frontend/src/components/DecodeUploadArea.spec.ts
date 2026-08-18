import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import DecodeUploadArea from './DecodeUploadArea.vue'
import en from '../locales/en.json'
import { MOCK_PNG_FILE, MOCK_SVG_FILE } from '../__fixtures__/frontend.fixtures'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountArea(modelValue: File | null = null) {
  return mount(DecodeUploadArea, {
    props: { modelValue },
    global: { plugins: [i18n] },
  })
}

describe('DecodeUploadArea', () => {
  it.each([
    ['PNG', MOCK_PNG_FILE],
    ['SVG', MOCK_SVG_FILE],
  ])('emits the selected %s file when chosen via the file input', async (_label, file) => {
    const wrapper = mountArea()
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file], writable: false })

    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toEqual([[file]])
  })

  it('shows an inline error and does not emit for an unsupported extension', async () => {
    const invalidFile = new File(['not a cryptogram'], 'notes.txt', { type: 'text/plain' })
    const wrapper = mountArea()
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [invalidFile], writable: false })

    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.find('.decode-upload-area__error').exists()).toBe(true)
  })

  it('emits the dropped file when a valid file is dropped', async () => {
    const wrapper = mountArea()

    await wrapper.find('.decode-upload-area').trigger('drop', {
      dataTransfer: { files: [MOCK_PNG_FILE] },
    })

    expect(wrapper.emitted('update:modelValue')).toEqual([[MOCK_PNG_FILE]])
  })

  it('displays the filename once a file is selected', () => {
    const wrapper = mountArea(MOCK_PNG_FILE)
    expect(wrapper.text()).toContain(MOCK_PNG_FILE.name)
  })

  it('does not display a filename when no file is selected', () => {
    const wrapper = mountArea(null)
    expect(wrapper.text()).not.toContain(MOCK_PNG_FILE.name)
  })
})
