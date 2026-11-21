import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import RotationSequencePicker from './RotationSequencePicker.vue'
import en from '../locales/en.json'

vi.mock('../utils/random-rotation-sequence', async () => {
  const actual = await vi.importActual<typeof import('../utils/random-rotation-sequence')>(
    '../utils/random-rotation-sequence',
  )
  return {
    ...actual,
    generateRandomRotationSequence: vi.fn((length = 8) => Array.from({ length }, () => 3)),
  }
})

import { generateRandomRotationSequence } from '../utils/random-rotation-sequence'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountPicker(modelValue: number[]) {
  return mount(RotationSequencePicker, {
    props: { modelValue },
    global: { plugins: [i18n] },
  })
}

function lastEmitted(wrapper: ReturnType<typeof mountPicker>): number[] | undefined {
  const events = wrapper.emitted('update:modelValue') as number[][][] | undefined
  return events?.at(-1)?.[0]
}

describe('RotationSequencePicker', () => {
  beforeEach(() => {
    vi.mocked(generateRandomRotationSequence).mockClear()
  })

  it('renders one angle select per position, showing the sequence angles', () => {
    const wrapper = mountPicker([0, 1, 2, 3, 3])
    const selects = wrapper.findAll('select')
    expect(selects).toHaveLength(5)
    expect(selects.map((select) => (select.element as HTMLSelectElement).value)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '3',
    ])
  })

  it('offers the four angles in each select', () => {
    const wrapper = mountPicker([0, 1, 2, 3])
    const options = wrapper.findAll('select')[0].findAll('option')
    expect(options.map((option) => option.text())).toEqual(['0°', '90°', '180°', '270°'])
  })

  it('labels each select with its position for assistive technology', () => {
    const wrapper = mountPicker([0, 1, 2, 3])
    expect(wrapper.findAll('select')[2].attributes('aria-label')).toBe('Rotation 3 of 4')
  })

  it('emits the sequence with the edited angle when a select changes', async () => {
    const wrapper = mountPicker([0, 1, 2, 3])
    await wrapper.findAll('select')[1].setValue('3')
    expect(lastEmitted(wrapper)).toEqual([0, 3, 2, 3])
  })

  it('shows the length in a number input bounded to 4-32', () => {
    const wrapper = mountPicker([0, 1, 2, 3, 1])
    const input = wrapper.find('input[type="number"]')
    expect((input.element as HTMLInputElement).value).toBe('5')
    expect(input.attributes('min')).toBe('4')
    expect(input.attributes('max')).toBe('32')
  })

  it('appends random angles when the length grows', async () => {
    const wrapper = mountPicker([0, 1, 2, 3])
    await wrapper.find('input[type="number"]').setValue('6')
    expect(lastEmitted(wrapper)).toEqual([0, 1, 2, 3, 3, 3])
    expect(generateRandomRotationSequence).toHaveBeenCalledWith(2)
  })

  it('drops the last angles when the length shrinks', async () => {
    const wrapper = mountPicker([0, 1, 2, 3, 1, 2])
    await wrapper.find('input[type="number"]').setValue('4')
    expect(lastEmitted(wrapper)).toEqual([0, 1, 2, 3])
  })

  it('clamps a length over 32 instead of emitting an invalid sequence', async () => {
    const wrapper = mountPicker([0, 1, 2, 3])
    await wrapper.find('input[type="number"]').setValue('40')
    expect(lastEmitted(wrapper)).toHaveLength(32)
  })

  it('clamps a length under 4 and shows the clamped value back in the field', async () => {
    const wrapper = mountPicker([0, 1, 2, 3, 1, 1])
    const input = wrapper.find('input[type="number"]')
    await input.setValue('1')
    expect(lastEmitted(wrapper)).toHaveLength(4)
    expect((input.element as HTMLInputElement).value).toBe('4')
  })

  it('shows the clamped value back even when it equals the current length', async () => {
    const wrapper = mountPicker([0, 1, 2, 3])
    const input = wrapper.find('input[type="number"]')
    await input.setValue('2')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect((input.element as HTMLInputElement).value).toBe('4')
  })

  it('ignores an empty or non-numeric length while the user is typing', async () => {
    const wrapper = mountPicker([0, 1, 2, 3])
    await wrapper.find('input[type="number"]').setValue('')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  describe('shuffle', () => {
    it('emits a fresh random sequence of the current length', async () => {
      const wrapper = mountPicker([0, 1, 2, 3, 1])
      await wrapper.find('button.rotation-sequence-picker__shuffle').trigger('click')
      expect(generateRandomRotationSequence).toHaveBeenCalledWith(5)
      expect(lastEmitted(wrapper)).toEqual([3, 3, 3, 3, 3])
    })

    it('labels the shuffle button and announces the new sequence', async () => {
      const wrapper = mountPicker([0, 1, 2, 3])
      const button = wrapper.find('button.rotation-sequence-picker__shuffle')
      expect(button.attributes('type')).toBe('button')
      expect(button.text()).toBe('Shuffle')

      await button.trigger('click')

      expect(wrapper.find('[role="status"]').text()).toBe(
        'New random sequence: 270°, 270°, 270°, 270°.',
      )
    })
  })

  describe('all-0° sequence', () => {
    it('shows an error and marks the selects invalid when every angle is 0°', () => {
      const wrapper = mountPicker([0, 0, 0, 0])
      expect(wrapper.find('.rotation-sequence-picker__error').text()).toBe(en.rotationSequence.allZero)
      expect(wrapper.findAll('select')[0].attributes('aria-invalid')).toBe('true')
    })

    it('announces the error and ties it to the selects', () => {
      const wrapper = mountPicker([0, 0, 0, 0])
      const error = wrapper.find('.rotation-sequence-picker__error')
      expect(error.attributes('role')).toBe('alert')
      expect(wrapper.findAll('select')[0].attributes('aria-describedby')).toBe(error.attributes('id'))
    })

    it('shows no error as soon as one angle is not 0°', () => {
      const wrapper = mountPicker([0, 0, 0, 2])
      expect(wrapper.find('.rotation-sequence-picker__error').exists()).toBe(false)
      expect(wrapper.findAll('select')[0].attributes('aria-invalid')).toBeUndefined()
    })
  })
})
