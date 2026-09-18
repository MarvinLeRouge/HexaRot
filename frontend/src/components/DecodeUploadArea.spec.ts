import { describe, it, expect, vi } from 'vitest'
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

  it('does not emit when the file input changes with no file selected', async () => {
    const wrapper = mountArea()
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [], writable: false })

    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('does not emit when a drop event carries no file', async () => {
    const wrapper = mountArea()

    await wrapper.find('.decode-upload-area').trigger('drop', {
      dataTransfer: { files: [] },
    })

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
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

  it('toggles the dragging class on dragover and dragleave', async () => {
    const wrapper = mountArea()
    const dropzone = wrapper.find('.decode-upload-area')

    await dropzone.trigger('dragover')
    expect(dropzone.classes()).toContain('decode-upload-area--dragging')

    await dropzone.trigger('dragleave')
    expect(dropzone.classes()).not.toContain('decode-upload-area--dragging')
  })

  it('clicking the browse button opens the file picker', async () => {
    const wrapper = mountArea()
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})

    await wrapper.find('button').trigger('click')

    expect(clickSpy).toHaveBeenCalled()
  })
})
