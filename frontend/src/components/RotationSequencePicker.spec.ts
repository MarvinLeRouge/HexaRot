import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import draggable from 'vuedraggable'
import RotationSequencePicker from './RotationSequencePicker.vue'
import en from '../locales/en.json'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountPicker(modelValue: number[]) {
  return mount(RotationSequencePicker, {
    props: { modelValue },
    global: { plugins: [i18n] },
  })
}

describe('RotationSequencePicker', () => {
  it('renders the four rotation angles in the order given by modelValue', () => {
    const wrapper = mountPicker([0, 1, 2, 3])

    const items = wrapper.findAll('li')
    expect(items.map((item) => item.text())).toEqual(['0°', '90°', '180°', '270°'])
  })

  it('renders angles reordered when modelValue is a different permutation', () => {
    const wrapper = mountPicker([3, 1, 0, 2])

    const items = wrapper.findAll('li')
    expect(items.map((item) => item.text())).toEqual(['270°', '90°', '0°', '180°'])
  })

  it('emits the reordered index permutation when the draggable list is reordered', async () => {
    const wrapper = mountPicker([0, 1, 2, 3])

    await wrapper.findComponent(draggable).vm.$emit('update:modelValue', [
      { index: 2, angle: 180 },
      { index: 0, angle: 0 },
      { index: 1, angle: 90 },
      { index: 3, angle: 270 },
    ])

    expect(wrapper.emitted('update:modelValue')).toEqual([[[2, 0, 1, 3]]])
  })

  describe('keyboard accessibility', () => {
    it('exposes listbox/option roles for assistive technology', () => {
      const wrapper = mountPicker([0, 1, 2, 3])
      expect(wrapper.find('[role="listbox"]').exists()).toBe(true)
      expect(wrapper.findAll('[role="option"]').length).toBe(4)
    })

    it('gives only the first item a roving tabindex by default', () => {
      const wrapper = mountPicker([0, 1, 2, 3])
      const items = wrapper.findAll('li')
      expect(items.map((item) => item.attributes('tabindex'))).toEqual(['0', '-1', '-1', '-1'])
    })

    it('moves the roving tabindex to the next item on ArrowRight without reordering', async () => {
      const wrapper = mountPicker([0, 1, 2, 3])
      await wrapper.findAll('li')[0].trigger('keydown', { key: 'ArrowRight' })

      const items = wrapper.findAll('li')
      expect(items.map((item) => item.attributes('tabindex'))).toEqual(['-1', '0', '-1', '-1'])
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('grabs an item with Space, marking it aria-selected', async () => {
      const wrapper = mountPicker([0, 1, 2, 3])
      await wrapper.findAll('li')[0].trigger('keydown', { key: ' ' })
      expect(wrapper.findAll('li')[0].attributes('aria-selected')).toBe('true')
    })

    it('moves a grabbed item with ArrowRight, emitting the reordered indices', async () => {
      const wrapper = mountPicker([0, 1, 2, 3])
      await wrapper.findAll('li')[0].trigger('keydown', { key: ' ' })
      await wrapper.findAll('li')[0].trigger('keydown', { key: 'ArrowRight' })

      expect(wrapper.emitted('update:modelValue')).toEqual([[[1, 0, 2, 3]]])
    })

    it('drops the grabbed item on a second Space, clearing aria-selected', async () => {
      const wrapper = mountPicker([0, 1, 2, 3])
      await wrapper.findAll('li')[0].trigger('keydown', { key: ' ' })
      await wrapper.findAll('li')[0].trigger('keydown', { key: ' ' })
      expect(wrapper.findAll('li')[0].attributes('aria-selected')).toBe('false')
    })

    it('cancels an in-progress reorder on Escape, emitting the pre-grab order', async () => {
      const wrapper = mountPicker([0, 1, 2, 3])
      await wrapper.findAll('li')[0].trigger('keydown', { key: ' ' })
      await wrapper.findAll('li')[0].trigger('keydown', { key: 'ArrowRight' })
      await wrapper.findAll('li')[0].trigger('keydown', { key: 'Escape' })

      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[0, 1, 2, 3]])
      expect(wrapper.findAll('li')[0].attributes('aria-selected')).toBe('false')
    })

    it('announces the grabbed state through the live region', async () => {
      const wrapper = mountPicker([0, 1, 2, 3])
      await wrapper.findAll('li')[0].trigger('keydown', { key: ' ' })
      expect(wrapper.find('[role="status"]').text()).toContain('Picked up')
    })
  })
})
