import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ResendVerificationForm from './ResendVerificationForm.vue'
import en from '../locales/en.json'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

function mountForm(props: Record<string, unknown> = {}) {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(ResendVerificationForm, {
    props,
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('ResendVerificationForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  it('pre-fills the email field from the initialEmail prop', () => {
    const wrapper = mountForm({ initialEmail: 'user@example.com' })
    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe('user@example.com')
  })

  it('submits the entered email', async () => {
    vi.mocked(postJson).mockResolvedValue({ message: 'ok' })
    const wrapper = mountForm()

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(postJson).toHaveBeenCalledWith('/auth/resend-verification', { email: 'user@example.com' })
  })

  it('shows the generic success message after a successful submit', async () => {
    vi.mocked(postJson).mockResolvedValue({ message: 'ok' })
    const wrapper = mountForm({ initialEmail: 'user@example.com' })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.resendVerification.success)
  })

  it('shows a network error message on a network failure', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('Network error: unable to reach the server', 'network'))
    const wrapper = mountForm({ initialEmail: 'user@example.com' })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(en.errors.network)
  })
})
