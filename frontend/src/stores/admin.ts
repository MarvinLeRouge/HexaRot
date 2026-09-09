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
}

function initialState(): AdminState {
  return {
    users: [],
    status: 'idle',
    errorMessage: null,
  }
}

function describeError(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong'
}

export const useAdminStore = defineStore('admin', {
  state: initialState,
  actions: {
    async fetchUsers(): Promise<void> {
      this.status = 'loading'
      this.errorMessage = null
      try {
        this.users = await getJson<AdminUserSummary[]>('/admin/users')
        this.status = 'success'
      } catch (err) {
        this.status = 'error'
        this.errorMessage = describeError(err)
      }
    },

    async setActive(id: string, active: boolean): Promise<void> {
      this.errorMessage = null
      try {
        const updated = await patchJson<AdminUserSummary>(`/admin/users/${id}`, { active })
        const index = this.users.findIndex((user) => user.id === id)
        if (index !== -1) this.users[index] = updated
      } catch (err) {
        this.errorMessage = describeError(err)
        throw err
      }
    },

    async removeUser(id: string): Promise<void> {
      this.errorMessage = null
      try {
        await deleteJson(`/admin/users/${id}`)
        this.users = this.users.filter((user) => user.id !== id)
      } catch (err) {
        this.errorMessage = describeError(err)
        throw err
      }
    },
  },
})
