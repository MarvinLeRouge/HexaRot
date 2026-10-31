import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import AdminUsersView from './AdminUsersView.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import en from '../locales/en.json'
import fr from '../locales/fr.json'
import { MOCK_ADMIN_USERS_LIST } from '../__fixtures__/frontend.fixtures'
import { ApiError } from '../api/client'

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

function mountView(locale: 'en' | 'fr' = 'en') {
  const i18n = createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { en, fr } })
  return mount(AdminUsersView, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('AdminUsersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getJson).mockReset()
    vi.mocked(patchJson).mockReset()
    vi.mocked(deleteJson).mockReset()
  })

  it('fetches and renders the user list on mount', async () => {
    vi.mocked(getJson).mockResolvedValue(mockAdminUsersList())
    const wrapper = mountView()
    await flushPromises()

    expect(getJson).toHaveBeenCalledWith('/admin/users')
    expect(wrapper.text()).toContain('user1@example.com')
    expect(wrapper.text()).toContain('user2@example.com')
  })

  it('toggles a user active state when the activate/deactivate button is clicked', async () => {
    vi.mocked(getJson).mockResolvedValue(mockAdminUsersList())
    vi.mocked(patchJson).mockResolvedValue({ ...MOCK_ADMIN_USERS_LIST[0], active: false })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('button').filter((b) => b.text() === en.admin.users.actions.deactivate)[0].trigger('click')
    await flushPromises()

    expect(patchJson).toHaveBeenCalledWith('/admin/users/user-1', { active: false })
  })

  it('opens a confirmation dialog before deleting, and deletes only on confirm', async () => {
    vi.mocked(getJson).mockResolvedValue(mockAdminUsersList())
    vi.mocked(deleteJson).mockResolvedValue(undefined)
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('button').filter((b) => b.text() === en.admin.users.actions.delete)[0].trigger('click')

    expect(deleteJson).not.toHaveBeenCalled()
    expect(wrapper.find('.confirm-dialog').exists()).toBe(true)

    await wrapper.find('.confirm-dialog__confirm').trigger('click')
    await flushPromises()

    expect(deleteJson).toHaveBeenCalledWith('/admin/users/user-1')
    expect(wrapper.find('.confirm-dialog').exists()).toBe(false)
  })

  it('does nothing if the confirm dialog emits confirm with no pending deletion', async () => {
    vi.mocked(getJson).mockResolvedValue(mockAdminUsersList())
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findComponent(ConfirmDialog).vm.$emit('confirm')
    await flushPromises()

    expect(deleteJson).not.toHaveBeenCalled()
  })

  it('closes the confirmation dialog without deleting when cancelled', async () => {
    vi.mocked(getJson).mockResolvedValue(mockAdminUsersList())
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('button').filter((b) => b.text() === en.admin.users.actions.delete)[0].trigger('click')
    expect(wrapper.find('.confirm-dialog').exists()).toBe(true)

    await wrapper.find('.confirm-dialog__cancel').trigger('click')

    expect(deleteJson).not.toHaveBeenCalled()
    expect(wrapper.find('.confirm-dialog').exists()).toBe(false)
  })

  it('shows the backend error message when an action is rejected', async () => {
    vi.mocked(getJson).mockResolvedValue(mockAdminUsersList())
    vi.mocked(patchJson).mockRejectedValue(new ApiError('You cannot modify your own account', 'http', 400))
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('button').filter((b) => b.text() === en.admin.users.actions.deactivate)[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('You cannot modify your own account')
  })

  it('renders the role and the verified and active flags through i18n, not raw values', async () => {
    vi.mocked(getJson).mockResolvedValue(mockAdminUsersList())
    const wrapper = mountView('fr')
    await flushPromises()

    const firstRow = wrapper.findAll('tbody tr')[0].findAll('td').map((cell) => cell.text())
    expect(firstRow.slice(1, 4)).toEqual(['Utilisateur', 'Oui', 'Oui'])
    expect(wrapper.text()).not.toMatch(/\b(USER|true|false)\b/)
  })

  it('formats the creation date for the active locale instead of the raw ISO string', async () => {
    vi.mocked(getJson).mockResolvedValue(mockAdminUsersList())
    const wrapper = mountView('fr')
    await flushPromises()

    const createdAt = wrapper.findAll('tbody tr')[0].findAll('td')[4].text()
    expect(createdAt).toBe(
      new Intl.DateTimeFormat('fr', { dateStyle: 'medium' }).format(new Date('2026-09-01T00:00:00.000Z')),
    )
    expect(createdAt).not.toContain('T00:00')
  })

  it('shows the translated network error instead of the client English message', async () => {
    vi.mocked(getJson).mockRejectedValue(new ApiError('Network error: unable to reach the server', 'network'))
    const wrapper = mountView('fr')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe(fr.errors.network)
  })
})
