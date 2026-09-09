import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import RegisterView from './RegisterView.vue'
import en from '../locales/en.json'
import { MOCK_PUBLIC_USER } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

function mountView() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(RegisterView, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('RegisterView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  it('shows the register form before submitting', () => {
    const wrapper = mountView()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('swaps the form for a "check your email" panel after a successful registration', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_PUBLIC_USER)
    const wrapper = mountView()

    await wrapper.find('input[type="email"]').setValue('new@example.com')
    await wrapper.find('input[type="password"]').setValue('Correct-Horse-Battery9')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain(en.auth.register.success.heading)
  })
})
