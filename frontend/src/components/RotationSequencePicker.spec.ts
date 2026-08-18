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
})
