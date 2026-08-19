import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import KeyParserForm from './KeyParserForm.vue'
import en from '../locales/en.json'
import { MOCK_KEY_PARSE_RESPONSE, MALFORMED_KEY } from '../__fixtures__/frontend.fixtures'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, getJson: vi.fn() }
})

import { getJson } from '../api/client'

function mountForm() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(KeyParserForm, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('KeyParserForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getJson).mockReset()
  })

  it('renders the key input field', () => {
    const wrapper = mountForm()
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('renders the parse button', () => {
    const wrapper = mountForm()
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('calls the key parse API with the entered key when the parse button is clicked', async () => {
    vi.mocked(getJson).mockResolvedValue(MOCK_KEY_PARSE_RESPONSE)
    const wrapper = mountForm()

    await wrapper.find('input[type="text"]').setValue('HR1·a1b2')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(getJson).toHaveBeenCalledWith('/key/parse', { key: 'HR1·a1b2' })
  })

  it('displays all decoded parameters after a successful parse response', async () => {
    vi.mocked(getJson).mockResolvedValue(MOCK_KEY_PARSE_RESPONSE)
    const wrapper = mountForm()

    await wrapper.find('input[type="text"]').setValue('HR1·a1b2')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(String(MOCK_KEY_PARSE_RESPONSE.pivotBlockSize))
    expect(wrapper.text()).toContain('0°, 90°, 180°, 270°')
    expect(wrapper.text()).toContain(MOCK_KEY_PARSE_RESPONSE.rotationDirection)
    expect(wrapper.text()).toContain(MOCK_KEY_PARSE_RESPONSE.readingOrder)
  })

  it('displays a clear error message for a malformed key without calling the API', async () => {
    const wrapper = mountForm()

    await wrapper.find('input[type="text"]').setValue(MALFORMED_KEY)

    expect(wrapper.find('.key-parser-form__error').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(getJson).not.toHaveBeenCalled()
  })

  it('displays a clear error message when the API returns 400', async () => {
    vi.mocked(getJson).mockRejectedValue(new ApiError('unsupported key version', 'http', 400))
    const wrapper = mountForm()

    await wrapper.find('input[type="text"]').setValue('HR9·zzzz')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('unsupported key version')
  })
})
