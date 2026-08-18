<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import { useI18n } from 'vue-i18n'

const ANGLES = [0, 90, 180, 270] as const

interface RotationItem {
  index: number
  angle: number
}

const props = defineProps<{
  modelValue: number[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const { t } = useI18n()

const items = computed<RotationItem[]>({
  get: () => props.modelValue.map((index) => ({ index, angle: ANGLES[index] })),
  set: (value) => emit('update:modelValue', value.map((item) => item.index)),
})
</script>

<template>
  <draggable
    v-model="items"
    item-key="index"
    tag="ul"
    class="rotation-sequence-picker"
    :aria-label="t('encode.form.rotationSequence.label')"
  >
    <template #item="{ element }: { element: RotationItem }">
      <li class="rotation-sequence-picker__item">
        {{ element.angle }}°
      </li>
    </template>
  </draggable>
</template>

<style scoped>
.rotation-sequence-picker {
  display: flex;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.rotation-sequence-picker__item {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: grab;
  background: var(--code-bg);
}
</style>
