import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import LoginForm from './LoginForm.vue'
import ResendVerificationForm from './ResendVerificationForm.vue'
import en from '../locales/en.json'
import { ApiError } from '../api/client'
import { MOCK_PUBLIC_USER } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn(), getJson: vi.fn() }
})

import { postJson, getJson } from '../api/client'

function mountForm() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(LoginForm, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('LoginForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
    vi.mocked(getJson).mockReset()
  })

  it('submits the entered credentials', async () => {
    vi.mocked(postJson).mockResolvedValue({ accessToken: 'jwt-token' })
    vi.mocked(getJson).mockResolvedValue(MOCK_PUBLIC_USER)
    const wrapper = mountForm()

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('Password-123!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(postJson).toHaveBeenCalledWith('/auth/login', { email: 'user@example.com', password: 'Password-123!' })
  })

  it('disables the submit button while a login request is in flight', async () => {
    vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('Password-123!')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('shows a generic invalid-credentials message on a plain 401 response', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('Invalid credentials', 'http', 401))
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('wrong-password')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.login.form.error.invalidCredentials)
  })

  it('shows the disabled-account message on a 403 response', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('This account has been disabled', 'http', 403))
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('Password-123!')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.login.form.error.disabled)
  })

  it('shows the resend verification form on an unverified-email response', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('Email address not verified', 'http', 401))
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('Password-123!')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.login.form.error.unverified)
    expect(wrapper.findComponent(ResendVerificationForm).exists()).toBe(true)
  })
})
