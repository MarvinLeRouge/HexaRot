import { describe, it, expect, beforeEach, vi } from 'vitest'
import { accessToken, setAccessToken, clearAccessToken } from './token-storage'

describe('token-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAccessToken()
  })

  it('starts with no token when localStorage is empty', () => {
    expect(accessToken.value).toBeNull()
  })

  it('stores the token in both the ref and localStorage', () => {
    setAccessToken('token-123')

    expect(accessToken.value).toBe('token-123')
    expect(localStorage.getItem('hexarot_access_token')).toBe('token-123')
  })

  it('clears the token from both the ref and localStorage', () => {
    setAccessToken('token-123')

    clearAccessToken()

    expect(accessToken.value).toBeNull()
    expect(localStorage.getItem('hexarot_access_token')).toBeNull()
  })

  it('restores a previously stored token when the module loads', async () => {
    localStorage.setItem('hexarot_access_token', 'preexisting-token')
    vi.resetModules()

    const mod = await import('./token-storage')

    expect(mod.accessToken.value).toBe('preexisting-token')
  })
})
