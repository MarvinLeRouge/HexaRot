import { defineStore } from 'pinia'
import { getJson, patchJson, deleteJson, ApiError } from '../api/client'
import type { UserRole } from './auth'

/** Mirrors backend/src/admin/admin-users.service.ts's AdminUserSummary - never includes passwordHash. */
export interface AdminUserSummary {
  id: string
  email: string
  role: UserRole
  active: boolean
  emailVerified: boolean
  createdAt: string
}

type AdminStatus = 'idle' | 'loading' | 'success' | 'error'

interface AdminState {
  users: AdminUserSummary[]
  status: AdminStatus
  errorMessage: string | null
  errorCode: 'network' | 'unknown' | null
}

function initialState(): AdminState {
  return {
    users: [],
    status: 'idle',
    errorMessage: null,
    errorCode: null,
  }
}

/** Keeps the backend's message for HTTP errors; other failures get a code the view translates. */
function describeError(err: unknown): Pick<AdminState, 'errorMessage' | 'errorCode'> {
  if (err instanceof ApiError && err.code === 'http') return { errorMessage: err.message, errorCode: null }
  return { errorMessage: null, errorCode: err instanceof ApiError && err.code === 'network' ? 'network' : 'unknown' }
}

export const useAdminStore = defineStore('admin', {
  state: initialState,
  actions: {
    async fetchUsers(): Promise<void> {
      this.status = 'loading'
      this.errorMessage = null
      this.errorCode = null
      try {
        this.users = await getJson<AdminUserSummary[]>('/admin/users')
        this.status = 'success'
      } catch (err) {
        this.status = 'error'
        Object.assign(this, describeError(err))
      }
    },

    async setActive(id: string, active: boolean): Promise<void> {
      this.errorMessage = null
      this.errorCode = null
      try {
        const updated = await patchJson<AdminUserSummary>(`/admin/users/${id}`, { active })
        const index = this.users.findIndex((user) => user.id === id)
        if (index !== -1) this.users[index] = updated
        this.status = 'success'
      } catch (err) {
        this.status = 'error'
        Object.assign(this, describeError(err))
        throw err
      }
    },

    async removeUser(id: string): Promise<void> {
      this.errorMessage = null
      this.errorCode = null
      try {
        await deleteJson(`/admin/users/${id}`)
        this.users = this.users.filter((user) => user.id !== id)
        this.status = 'success'
      } catch (err) {
        this.status = 'error'
        Object.assign(this, describeError(err))
        throw err
      }
    },
  },
})
