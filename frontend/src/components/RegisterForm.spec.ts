import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import RegisterForm from './RegisterForm.vue'
import en from '../locales/en.json'
import { ApiError } from '../api/client'
import { MOCK_PUBLIC_USER } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

function mountForm() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(RegisterForm, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('RegisterForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  it('disables submit until every password criterion is met', async () => {
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('new@example.com')
    await wrapper.find('input[type="password"]').setValue('weak')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('input[type="password"]').setValue('Correct-Horse-Battery9')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('marks each password criterion as met once satisfied', async () => {
    const wrapper = mountForm()
    await wrapper.find('input[type="password"]').setValue('Correct-Horse-Battery9')

    const metItems = wrapper.findAll('.register-form__criteria-met')
    expect(metItems).toHaveLength(5)
  })

  it('submits the entered email and password', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_PUBLIC_USER)
    const wrapper = mountForm()

    await wrapper.find('input[type="email"]').setValue('new@example.com')
    await wrapper.find('input[type="password"]').setValue('Correct-Horse-Battery9')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(postJson).toHaveBeenCalledWith('/auth/register', { email: 'new@example.com', password: 'Correct-Horse-Battery9' })
  })

  it('shows a duplicate-email message on a 409 response', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('An account with this email already exists', 'http', 409))
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('taken@example.com')
    await wrapper.find('input[type="password"]').setValue('Correct-Horse-Battery9')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.register.form.error.duplicateEmail)
  })

  it('shows the backend validation message on a 400 response', async () => {
    const message =
      'password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character';
    vi.mocked(postJson).mockRejectedValue(new ApiError(message, 'http', 400))
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('new@example.com')
    await wrapper.find('input[type="password"]').setValue('Correct-Horse-Battery9')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(message)
  })
})
