import { defineStore } from 'pinia'
import { getJson, postJson, ApiError } from '../api/client'
import { accessToken as storedAccessToken, setAccessToken, clearAccessToken } from '../auth/token-storage'

export type UserRole = 'USER' | 'ADMIN'

/** Mirrors backend/src/auth/auth.service.ts's PublicUser - never includes passwordHash. */
export interface PublicUser {
  id: string
  email: string
  role: UserRole
  emailVerified: boolean
  active: boolean
  createdAt: string
}

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'
export type LoginErrorKind = 'invalidCredentials' | 'unverified' | 'disabled' | 'network' | 'unknown'
export type RegisterErrorKind = 'duplicateEmail' | 'validation' | 'network' | 'unknown'

interface AuthState {
  user: PublicUser | null
  loginStatus: AsyncStatus
  loginErrorKind: LoginErrorKind | null
  registerStatus: AsyncStatus
  registerErrorKind: RegisterErrorKind | null
  registerErrorMessage: string | null
  verifyStatus: AsyncStatus
  verifyErrorMessage: string | null
  resendStatus: AsyncStatus
  resendErrorKind: 'network' | 'unknown' | null
}

function initialState(): AuthState {
  return {
    user: null,
    loginStatus: 'idle',
    loginErrorKind: null,
    registerStatus: 'idle',
    registerErrorKind: null,
    registerErrorMessage: null,
    verifyStatus: 'idle',
    verifyErrorMessage: null,
    resendStatus: 'idle',
    resendErrorKind: null,
  }
}

export const useAuthStore = defineStore('auth', {
  state: initialState,
  getters: {
    accessToken: (): string | null => storedAccessToken.value,
  },
  actions: {
    async fetchMe(): Promise<void> {
      this.user = await getJson<PublicUser>('/auth/me')
    },

    async login(email: string, password: string): Promise<void> {
      this.loginStatus = 'loading'
      this.loginErrorKind = null
      try {
        const { accessToken } = await postJson<{ accessToken: string }>('/auth/login', { email, password })
        setAccessToken(accessToken)
        await this.fetchMe()
        this.loginStatus = 'success'
      } catch (err) {
        this.loginStatus = 'error'
        if (err instanceof ApiError && err.code === 'http') {
          if (err.status === 401 && err.message === 'Email address not verified') {
            this.loginErrorKind = 'unverified'
          } else if (err.status === 403) {
            this.loginErrorKind = 'disabled'
          } else if (err.status === 401) {
            this.loginErrorKind = 'invalidCredentials'
          } else {
            this.loginErrorKind = 'unknown'
          }
        } else if (err instanceof ApiError && err.code === 'network') {
          this.loginErrorKind = 'network'
        } else {
          this.loginErrorKind = 'unknown'
        }
      }
    },

    async register(email: string, password: string): Promise<void> {
      this.registerStatus = 'loading'
      this.registerErrorKind = null
      this.registerErrorMessage = null
      try {
        await postJson('/auth/register', { email, password })
        this.registerStatus = 'success'
      } catch (err) {
        this.registerStatus = 'error'
        if (err instanceof ApiError && err.code === 'http') {
          if (err.status === 409) {
            this.registerErrorKind = 'duplicateEmail'
          } else if (err.status === 400) {
            this.registerErrorKind = 'validation'
            this.registerErrorMessage = err.message
          } else {
            this.registerErrorKind = 'unknown'
          }
        } else if (err instanceof ApiError && err.code === 'network') {
          this.registerErrorKind = 'network'
        } else {
          this.registerErrorKind = 'unknown'
        }
      }
    },

    async verifyEmail(token: string): Promise<void> {
      this.verifyStatus = 'loading'
      this.verifyErrorMessage = null
      try {
        await postJson('/auth/verify-email', { token })
        this.verifyStatus = 'success'
      } catch (err) {
        this.verifyStatus = 'error'
        this.verifyErrorMessage = err instanceof ApiError ? err.message : null
      }
    },

    async resendVerification(email: string): Promise<void> {
      this.resendStatus = 'loading'
      this.resendErrorKind = null
      try {
        await postJson('/auth/resend-verification', { email })
        this.resendStatus = 'success'
      } catch (err) {
        this.resendStatus = 'error'
        this.resendErrorKind = err instanceof ApiError && err.code === 'network' ? 'network' : 'unknown'
      }
    },

    logout(): void {
      clearAccessToken()
      this.user = null
    },

    async restoreSession(): Promise<void> {
      if (!storedAccessToken.value) return
      try {
        await this.fetchMe()
      } catch (err) {
        // Only a genuine 401 means the session died. A network error (backend
        // restart, offline reload) must not destroy an otherwise-valid token.
        if (err instanceof ApiError && err.code === 'http') {
          clearAccessToken()
          this.user = null
        }
      }
    },

    resetRegister(): void {
      this.registerStatus = 'idle'
      this.registerErrorKind = null
      this.registerErrorMessage = null
    },

    resetResend(): void {
      this.resendStatus = 'idle'
      this.resendErrorKind = null
    },
  },
})
