import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './LoginView.vue'
import en from '../locales/en.json'
import { MOCK_PUBLIC_USER } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn(), getJson: vi.fn() }
})

import { postJson, getJson } from '../api/client'

async function mountView(initialPath = '/login') {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView },
      { path: '/encode', name: 'encode', component: { template: '<div>encode</div>' } },
    ],
  })
  router.push(initialPath)
  await router.isReady()

  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  const wrapper = mount(LoginView, {
    global: { plugins: [createPinia(), i18n, router] },
  })
  return { wrapper, router }
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
    vi.mocked(getJson).mockReset()
  })

  it('redirects to /encode after a successful login with no redirect query', async () => {
    vi.mocked(postJson).mockResolvedValue({ accessToken: 'jwt-token' })
    vi.mocked(getJson).mockResolvedValue(MOCK_PUBLIC_USER)
    const { wrapper, router } = await mountView('/login')

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('Password-123!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/encode')
  })

  it('redirects to the redirect query target after a successful login', async () => {
    vi.mocked(postJson).mockResolvedValue({ accessToken: 'jwt-token' })
    vi.mocked(getJson).mockResolvedValue(MOCK_PUBLIC_USER)
    const { wrapper, router } = await mountView('/login?redirect=%2Fkey')

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('Password-123!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/key')
  })
})
