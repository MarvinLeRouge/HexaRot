import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from './ConfirmDialog.vue'

function mountDialog(open: boolean) {
  return mount(ConfirmDialog, {
    props: {
      open,
      title: 'Delete this account?',
      body: 'This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    },
  })
}

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const wrapper = mountDialog(false)
    expect(wrapper.find('.confirm-dialog').exists()).toBe(false)
  })

  it('renders the title and body when open', () => {
    const wrapper = mountDialog(true)
    expect(wrapper.text()).toContain('Delete this account?')
    expect(wrapper.text()).toContain('This cannot be undone.')
  })

  it('emits confirm when the confirm button is clicked', async () => {
    const wrapper = mountDialog(true)
    await wrapper.find('.confirm-dialog__confirm').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('emits cancel when the cancel button is clicked', async () => {
    const wrapper = mountDialog(true)
    await wrapper.find('.confirm-dialog__cancel').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
