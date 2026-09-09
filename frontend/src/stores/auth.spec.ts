import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'
import { ApiError } from '../api/client'
import { clearAccessToken, setAccessToken } from '../auth/token-storage'
import { MOCK_PUBLIC_USER, MOCK_ADMIN_USER } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn(), getJson: vi.fn() }
})

import { postJson, getJson } from '../api/client'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAccessToken()
    vi.mocked(postJson).mockReset()
    vi.mocked(getJson).mockReset()
  })

  describe('login', () => {
    it('stores the access token and fetches the current user on success', async () => {
      vi.mocked(postJson).mockResolvedValue({ accessToken: 'jwt-token' })
      vi.mocked(getJson).mockResolvedValue(MOCK_PUBLIC_USER)
      const store = useAuthStore()

      await store.login('user@example.com', 'Password-123!')

      expect(postJson).toHaveBeenCalledWith('/auth/login', { email: 'user@example.com', password: 'Password-123!' })
      expect(getJson).toHaveBeenCalledWith('/auth/me')
      expect(store.accessToken).toBe('jwt-token')
      expect(store.user).toEqual(MOCK_PUBLIC_USER)
      expect(store.loginStatus).toBe('success')
    })

    it('sets loginErrorKind to unverified on a 401 "Email address not verified" response', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('Email address not verified', 'http', 401))
      const store = useAuthStore()

      await store.login('user@example.com', 'Password-123!')

      expect(store.loginStatus).toBe('error')
      expect(store.loginErrorKind).toBe('unverified')
      expect(store.accessToken).toBeNull()
    })

    it('sets loginErrorKind to disabled on a 403 response', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('This account has been disabled', 'http', 403))
      const store = useAuthStore()

      await store.login('user@example.com', 'Password-123!')

      expect(store.loginErrorKind).toBe('disabled')
    })

    it('sets loginErrorKind to invalidCredentials on any other 401 response', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('Invalid credentials', 'http', 401))
      const store = useAuthStore()

      await store.login('user@example.com', 'wrong-password')

      expect(store.loginErrorKind).toBe('invalidCredentials')
    })

    it('sets loginErrorKind to network on a network failure', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('Network error: unable to reach the server', 'network'))
      const store = useAuthStore()

      await store.login('user@example.com', 'Password-123!')

      expect(store.loginErrorKind).toBe('network')
    })
  })

  describe('register', () => {
    it('sets registerStatus to success on a successful registration', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_PUBLIC_USER)
      const store = useAuthStore()

      await store.register('new@example.com', 'Password-123!')

      expect(postJson).toHaveBeenCalledWith('/auth/register', { email: 'new@example.com', password: 'Password-123!' })
      expect(store.registerStatus).toBe('success')
    })

    it('sets registerErrorKind to duplicateEmail on a 409 response', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('An account with this email already exists', 'http', 409))
      const store = useAuthStore()

      await store.register('taken@example.com', 'Password-123!')

      expect(store.registerErrorKind).toBe('duplicateEmail')
    })

    it('sets registerErrorKind to validation and keeps the backend message on a 400 response', async () => {
      const message =
        'password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character'
      vi.mocked(postJson).mockRejectedValue(new ApiError(message, 'http', 400))
      const store = useAuthStore()

      await store.register('new@example.com', 'allweaklowercase')

      expect(store.registerErrorKind).toBe('validation')
      expect(store.registerErrorMessage).toBe(message)
    })
  })

  describe('verifyEmail', () => {
    it('sets verifyStatus to success on a valid token', async () => {
      vi.mocked(postJson).mockResolvedValue({ message: 'Email verified successfully' })
      const store = useAuthStore()

      await store.verifyEmail('valid-token')

      expect(postJson).toHaveBeenCalledWith('/auth/verify-email', { token: 'valid-token' })
      expect(store.verifyStatus).toBe('success')
    })

    it('sets verifyStatus to error with the backend message on an invalid token', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('Invalid or expired verification token', 'http', 400))
      const store = useAuthStore()

      await store.verifyEmail('bad-token')

      expect(store.verifyStatus).toBe('error')
      expect(store.verifyErrorMessage).toBe('Invalid or expired verification token')
    })
  })

  describe('resendVerification', () => {
    it('sets resendStatus to success', async () => {
      vi.mocked(postJson).mockResolvedValue({ message: 'ok' })
      const store = useAuthStore()

      await store.resendVerification('user@example.com')

      expect(postJson).toHaveBeenCalledWith('/auth/resend-verification', { email: 'user@example.com' })
      expect(store.resendStatus).toBe('success')
    })

    it('sets resendStatus to error with resendErrorKind network on a network failure', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('Network error: unable to reach the server', 'network'))
      const store = useAuthStore()

      await store.resendVerification('user@example.com')

      expect(store.resendStatus).toBe('error')
      expect(store.resendErrorKind).toBe('network')
    })
  })

  describe('logout', () => {
    it('clears the access token and user', async () => {
      vi.mocked(postJson).mockResolvedValue({ accessToken: 'jwt-token' })
      vi.mocked(getJson).mockResolvedValue(MOCK_PUBLIC_USER)
      const store = useAuthStore()
      await store.login('user@example.com', 'Password-123!')

      store.logout()

      expect(store.accessToken).toBeNull()
      expect(store.user).toBeNull()
    })
  })

  describe('restoreSession', () => {
    it('does nothing when there is no stored token', async () => {
      const store = useAuthStore()

      await store.restoreSession()

      expect(getJson).not.toHaveBeenCalled()
      expect(store.user).toBeNull()
    })

    it('fetches and stores the current user when a token is present', async () => {
      setAccessToken('existing-token')
      vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USER)
      const store = useAuthStore()

      await store.restoreSession()

      expect(getJson).toHaveBeenCalledWith('/auth/me')
      expect(store.user).toEqual(MOCK_ADMIN_USER)
    })

    it('clears the token when it is no longer accepted by the server', async () => {
      setAccessToken('expired-token')
      vi.mocked(getJson).mockRejectedValue(new ApiError('Invalid or expired token', 'http', 401))
      const store = useAuthStore()

      await store.restoreSession()

      expect(store.accessToken).toBeNull()
      expect(store.user).toBeNull()
    })
  })
})
