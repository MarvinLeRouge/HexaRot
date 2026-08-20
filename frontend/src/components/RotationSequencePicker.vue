<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
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

const focusedKey = ref<number>(items.value[0]?.index ?? 0)
const grabbedKey = ref<number | null>(null)
const liveMessage = ref('')
const itemEls = new Map<number, HTMLLIElement>()
let preGrabOrder: RotationItem[] = []

function setItemRef(key: number, el: Element | null): void {
  if (el instanceof HTMLLIElement) {
    itemEls.set(key, el)
  } else {
    itemEls.delete(key)
  }
}

async function focusItem(key: number): Promise<void> {
  await nextTick()
  itemEls.get(key)?.focus()
}

function moveItem(fromPos: number, toPos: number): void {
  const next = [...items.value]
  const [moved] = next.splice(fromPos, 1)
  next.splice(toPos, 0, moved)
  items.value = next
}

function announce(key: string, params: Record<string, number>): void {
  liveMessage.value = t(key, params)
}

function onKeydown(event: KeyboardEvent, key: number): void {
  const pos = items.value.findIndex((item) => item.index === key)
  const angle = ANGLES[key]

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    const dir = event.key === 'ArrowRight' ? 1 : -1
    const newPos = pos + dir
    if (newPos < 0 || newPos >= items.value.length) return

    if (grabbedKey.value === key) {
      moveItem(pos, newPos)
      announce('rotationSequence.moved', { position: newPos + 1, total: items.value.length })
      void focusItem(key)
    } else {
      const destinationKey = items.value[newPos].index
      focusedKey.value = destinationKey
      void focusItem(destinationKey)
    }
    return
  }

  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    if (grabbedKey.value === key) {
      grabbedKey.value = null
      announce('rotationSequence.dropped', { angle, position: pos + 1, total: items.value.length })
    } else {
      preGrabOrder = [...items.value]
      grabbedKey.value = key
      announce('rotationSequence.grabbed', { angle, position: pos + 1, total: items.value.length })
    }
    return
  }

  if (event.key === 'Escape' && grabbedKey.value === key) {
    event.preventDefault()
    items.value = preGrabOrder
    grabbedKey.value = null
    liveMessage.value = t('rotationSequence.cancelled')
    void focusItem(key)
  }
}
</script>

<template>
  <draggable
    v-model="items"
    item-key="index"
    tag="ul"
    class="rotation-sequence-picker"
    role="listbox"
    :aria-label="t('encode.form.rotationSequence.label')"
  >
    <template #item="{ element }: { element: RotationItem }">
      <li
        :ref="(el) => setItemRef(element.index, el as Element | null)"
        class="rotation-sequence-picker__item"
        role="option"
        aria-roledescription="sortable item"
        :aria-selected="element.index === grabbedKey"
        :tabindex="element.index === focusedKey ? 0 : -1"
        :class="{ 'rotation-sequence-picker__item--grabbed': element.index === grabbedKey }"
        @keydown="onKeydown($event, element.index)"
        @focus="focusedKey = element.index"
      >
        <svg
          class="rotation-sequence-picker__handle"
          width="10"
          height="16"
          viewBox="0 0 10 16"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            cx="2.5"
            cy="2.5"
            r="1.5"
            fill="currentColor"
          />
          <circle
            cx="7.5"
            cy="2.5"
            r="1.5"
            fill="currentColor"
          />
          <circle
            cx="2.5"
            cy="8"
            r="1.5"
            fill="currentColor"
          />
          <circle
            cx="7.5"
            cy="8"
            r="1.5"
            fill="currentColor"
          />
          <circle
            cx="2.5"
            cy="13.5"
            r="1.5"
            fill="currentColor"
          />
          <circle
            cx="7.5"
            cy="13.5"
            r="1.5"
            fill="currentColor"
          />
        </svg>
        <span>{{ element.angle }}°</span>
      </li>
    </template>
  </draggable>
  <div
    class="rotation-sequence-picker__live"
    role="status"
    aria-live="polite"
  >
    {{ liveMessage }}
  </div>
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: grab;
  background: var(--code-bg);
  color: var(--text);
}

.rotation-sequence-picker__item--grabbed {
  cursor: grabbing;
  border: 2px solid var(--accent);
  background: var(--accent-bg);
  color: var(--text-h);
  box-shadow: var(--shadow);
}

.rotation-sequence-picker__handle {
  color: var(--text-muted);
  flex-shrink: 0;
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
