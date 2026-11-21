<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  MAX_ROTATION_SEQUENCE_LENGTH,
  MIN_ROTATION_SEQUENCE_LENGTH,
  generateRandomRotationSequence,
  isAllZeroRotationSequence,
} from '../utils/random-rotation-sequence'

const ANGLES = [0, 90, 180, 270] as const

const props = defineProps<{
  modelValue: number[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const { t } = useI18n()

const liveMessage = ref('')
const errorId = useId()
const allZero = computed(() => isAllZeroRotationSequence(props.modelValue))

function setAngle(position: number, value: string): void {
  const next = [...props.modelValue]
  next[position] = Number(value)
  emit('update:modelValue', next)
}

function setLength(input: HTMLInputElement): void {
  const requested = Number.parseInt(input.value, 10)
  // An empty field is not a length yet.
  if (Number.isNaN(requested)) return
  const length = Math.min(MAX_ROTATION_SEQUENCE_LENGTH, Math.max(MIN_ROTATION_SEQUENCE_LENGTH, requested))
  // Show the clamped length even when it equals the current one (no re-render then).
  input.value = String(length)
  const current = props.modelValue
  if (length === current.length) return
  emit(
    'update:modelValue',
    length < current.length
      ? current.slice(0, length)
      : [...current, ...generateRandomRotationSequence(length - current.length)],
  )
}

function shuffle(): void {
  const sequence = generateRandomRotationSequence(props.modelValue.length)
  emit('update:modelValue', sequence)
  liveMessage.value = t('rotationSequence.shuffled', {
    order: sequence.map((index) => `${ANGLES[index]}°`).join(', '),
  })
}
</script>

<template>
  <div class="rotation-sequence-picker">
    <label class="rotation-sequence-picker__length">
      {{ t('rotationSequence.length') }}
      <input
        type="number"
        :min="MIN_ROTATION_SEQUENCE_LENGTH"
        :max="MAX_ROTATION_SEQUENCE_LENGTH"
        :value="modelValue.length"
        @change="setLength($event.target as HTMLInputElement)"
      >
    </label>
    <ol class="rotation-sequence-picker__angles">
      <li
        v-for="(angle, position) in modelValue"
        :key="position"
      >
        <select
          :value="String(angle)"
          :aria-label="t('rotationSequence.angle', { position: position + 1, total: modelValue.length })"
          :aria-invalid="allZero ? 'true' : undefined"
          :aria-describedby="allZero ? errorId : undefined"
          @change="setAngle(position, ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="(degrees, index) in ANGLES"
            :key="degrees"
            :value="String(index)"
          >
            {{ degrees }}°
          </option>
        </select>
      </li>
    </ol>
    <p
      v-if="allZero"
      :id="errorId"
      class="rotation-sequence-picker__error"
      role="alert"
    >
      {{ t('rotationSequence.allZero') }}
    </p>
    <button
      type="button"
      class="rotation-sequence-picker__shuffle btn-secondary"
      @click="shuffle"
    >
      {{ t('rotationSequence.shuffle') }}
    </button>
    <div
      class="rotation-sequence-picker__live"
      role="status"
      aria-live="polite"
    >
      {{ liveMessage }}
    </div>
  </div>
</template>

<style scoped>
.rotation-sequence-picker {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rotation-sequence-picker__length {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rotation-sequence-picker__length input {
  width: 5em;
}

.rotation-sequence-picker__angles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.rotation-sequence-picker__error {
  margin: 0;
  color: var(--danger);
}

.rotation-sequence-picker__shuffle {
  align-self: flex-start;
}

.rotation-sequence-picker__live {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
