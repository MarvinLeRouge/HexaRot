import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAdminStore } from './admin'
import { ApiError } from '../api/client'
import { MOCK_ADMIN_USERS_LIST } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, getJson: vi.fn(), patchJson: vi.fn(), deleteJson: vi.fn() }
})

import { getJson, patchJson, deleteJson } from '../api/client'

/**
 * MOCK_ADMIN_USERS_LIST is a shared module-level fixture. The admin store
 * assigns the array returned by getJson directly to state and mutates it
 * in place (setActive replaces an element by index), so resolving with the
 * literal fixture would corrupt it for every later test in this file.
 */
function mockAdminUsersList(): typeof MOCK_ADMIN_USERS_LIST {
  return MOCK_ADMIN_USERS_LIST.map((user) => ({ ...user }))
}

describe('useAdminStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getJson).mockReset()
    vi.mocked(patchJson).mockReset()
    vi.mocked(deleteJson).mockReset()
  })

  describe('fetchUsers', () => {
    it('stores the returned user list on success', async () => {
      vi.mocked(getJson).mockResolvedValue(mockAdminUsersList())
      const store = useAdminStore()

      await store.fetchUsers()

      expect(getJson).toHaveBeenCalledWith('/admin/users')
      expect(store.users).toEqual(MOCK_ADMIN_USERS_LIST)
      expect(store.status).toBe('success')
    })

    it('sets an error message on failure', async () => {
      vi.mocked(getJson).mockRejectedValue(new ApiError('Forbidden', 'http', 403))
      const store = useAdminStore()

      await store.fetchUsers()

      expect(store.status).toBe('error')
      expect(store.errorMessage).toBe('Forbidden')
    })
  })

  describe('setActive', () => {
    it('replaces the updated user in the list', async () => {
      vi.mocked(getJson).mockResolvedValue(mockAdminUsersList())
      const store = useAdminStore()
      await store.fetchUsers()
      const updated = { ...MOCK_ADMIN_USERS_LIST[0], active: false }
      vi.mocked(patchJson).mockResolvedValue(updated)

      await store.setActive(updated.id, false)

      expect(patchJson).toHaveBeenCalledWith(`/admin/users/${updated.id}`, { active: false })
      expect(store.users.find((u) => u.id === updated.id)).toEqual(updated)
    })

    it('sets an error message and rethrows on a self-modification rejection', async () => {
      vi.mocked(patchJson).mockRejectedValue(new ApiError('You cannot modify your own account', 'http', 400))
      const store = useAdminStore()

      await expect(store.setActive('self-id', false)).rejects.toBeInstanceOf(ApiError)
      expect(store.errorMessage).toBe('You cannot modify your own account')
    })
  })

  describe('removeUser', () => {
    it('removes the deleted user from the list', async () => {
      vi.mocked(getJson).mockResolvedValue(mockAdminUsersList())
      const store = useAdminStore()
      await store.fetchUsers()
      vi.mocked(deleteJson).mockResolvedValue(undefined)

      await store.removeUser(MOCK_ADMIN_USERS_LIST[0].id)

      expect(deleteJson).toHaveBeenCalledWith(`/admin/users/${MOCK_ADMIN_USERS_LIST[0].id}`)
      expect(store.users.find((u) => u.id === MOCK_ADMIN_USERS_LIST[0].id)).toBeUndefined()
    })

    it('sets an error message and rethrows on a self-deletion rejection', async () => {
      vi.mocked(deleteJson).mockRejectedValue(new ApiError('You cannot delete your own account', 'http', 400))
      const store = useAdminStore()

      await expect(store.removeUser('self-id')).rejects.toBeInstanceOf(ApiError)
      expect(store.errorMessage).toBe('You cannot delete your own account')
    })
  })
})
