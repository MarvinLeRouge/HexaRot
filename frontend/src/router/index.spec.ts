import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { router } from './index'
import { useAuthStore } from '../stores/auth'
import { setAccessToken, clearAccessToken } from '../auth/token-storage'
import { MOCK_PUBLIC_USER, MOCK_ADMIN_USER } from '../__fixtures__/frontend.fixtures'

describe('router guards', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    clearAccessToken()
    await router.push('/')
    await router.isReady()
  })

  it('redirects an unauthenticated visitor to /login with a redirect query on a protected route', async () => {
    await router.push('/encode')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/encode')
  })

  it('allows an authenticated visitor to reach a protected route', async () => {
    setAccessToken('jwt-token')
    const authStore = useAuthStore()
    authStore.user = MOCK_PUBLIC_USER

    await router.push('/encode')

    expect(router.currentRoute.value.path).toBe('/encode')
  })

  it('redirects a non-admin visitor away from /admin/users', async () => {
    setAccessToken('jwt-token')
    const authStore = useAuthStore()
    authStore.user = MOCK_PUBLIC_USER

    await router.push('/admin/users')

    expect(router.currentRoute.value.path).toBe('/encode')
  })

  it('allows an admin visitor to reach /admin/users', async () => {
    setAccessToken('jwt-token')
    const authStore = useAuthStore()
    authStore.user = MOCK_ADMIN_USER

    await router.push('/admin/users')

    expect(router.currentRoute.value.path).toBe('/admin/users')
  })

  it('does not gate /login', async () => {
    await router.push('/login')

    expect(router.currentRoute.value.path).toBe('/login')
  })
})
