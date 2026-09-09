import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createWebHistory } from 'vue-router'
import VerifyEmailView from './VerifyEmailView.vue'
import en from '../locales/en.json'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

async function mountView(token: string) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/verify-email', name: 'verify-email', component: VerifyEmailView },
      { path: '/login', name: 'login', component: { template: '<div>login</div>' } },
    ],
  })
  router.push(`/verify-email?token=${token}`)
  await router.isReady()

  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(VerifyEmailView, {
    global: { plugins: [createPinia(), i18n, router] },
  })
}

describe('VerifyEmailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  it('calls verify-email automatically on mount with the token from the query', async () => {
    vi.mocked(postJson).mockResolvedValue({ message: 'Email verified successfully' })
    await mountView('valid-token')
    await flushPromises()

    expect(postJson).toHaveBeenCalledWith('/auth/verify-email', { token: 'valid-token' })
  })

  it('shows a success message and a login link on success', async () => {
    vi.mocked(postJson).mockResolvedValue({ message: 'Email verified successfully' })
    const wrapper = await mountView('valid-token')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.verifyEmail.success)
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
  })

  it('shows an error and the resend-verification form on an invalid token', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('Invalid or expired verification token', 'http', 400))
    const wrapper = await mountView('bad-token')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.verifyEmail.error)
    expect(wrapper.find('form').exists()).toBe(true)
  })
})
