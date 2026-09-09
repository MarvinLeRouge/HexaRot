import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import AdminUsersView from './AdminUsersView.vue'
import en from '../locales/en.json'
import { MOCK_ADMIN_USERS_LIST } from '../__fixtures__/frontend.fixtures'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, getJson: vi.fn(), patchJson: vi.fn(), deleteJson: vi.fn() }
})

import { getJson, patchJson, deleteJson } from '../api/client'

function mountView() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
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
    vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USERS_LIST)
    const wrapper = mountView()
    await flushPromises()

    expect(getJson).toHaveBeenCalledWith('/admin/users')
    expect(wrapper.text()).toContain('user1@example.com')
    expect(wrapper.text()).toContain('user2@example.com')
  })

  it('toggles a user active state when the activate/deactivate button is clicked', async () => {
    vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USERS_LIST)
    vi.mocked(patchJson).mockResolvedValue({ ...MOCK_ADMIN_USERS_LIST[0], active: false })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('button').filter((b) => b.text() === en.admin.users.actions.deactivate)[0].trigger('click')
    await flushPromises()

    expect(patchJson).toHaveBeenCalledWith('/admin/users/user-1', { active: false })
  })

  it('opens a confirmation dialog before deleting, and deletes only on confirm', async () => {
    vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USERS_LIST)
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

  it('shows the backend error message when an action is rejected', async () => {
    vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USERS_LIST)
    vi.mocked(patchJson).mockRejectedValue(new ApiError('You cannot modify your own account', 'http', 400))
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('button').filter((b) => b.text() === en.admin.users.actions.deactivate)[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('You cannot modify your own account')
  })
})
