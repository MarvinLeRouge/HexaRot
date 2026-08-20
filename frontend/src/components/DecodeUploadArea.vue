<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  modelValue: File | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: File]
}>()

const { t } = useI18n()

const isDragging = ref(false)
const formatError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function isValidExtension(file: File): boolean {
  return /\.(png|svg)$/i.test(file.name)
}

function selectFile(file: File): void {
  if (!isValidExtension(file)) {
    formatError.value = t('decode.upload.invalidExtension')
    return
  }
  formatError.value = null
  emit('update:modelValue', file)
}

function handleInputChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) selectFile(file)
}

function handleDrop(event: DragEvent): void {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) selectFile(file)
}

function handleDragOver(): void {
  isDragging.value = true
}

function handleDragLeave(): void {
  isDragging.value = false
}

function triggerBrowse(): void {
  fileInput.value?.click()
}
</script>

<template>
  <div
    class="decode-upload-area"
    :class="{ 'decode-upload-area--dragging': isDragging }"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".png,.svg"
      class="decode-upload-area__input"
      @change="handleInputChange"
    >
    <button
      type="button"
      class="btn-secondary"
      @click="triggerBrowse"
    >
      {{ t('decode.upload.browse') }}
    </button>
    <p>{{ t('decode.upload.dropHint') }}</p>
    <p
      v-if="modelValue"
      class="decode-upload-area__filename"
    >
      {{ modelValue.name }}
    </p>
    <p
      v-if="formatError"
      class="decode-upload-area__error"
      role="alert"
    >
      {{ formatError }}
    </p>
  </div>
</template>

<style scoped>
.decode-upload-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 2px dashed var(--border);
  border-radius: 4px;
}

.decode-upload-area--dragging {
  border-color: var(--accent);
}

.decode-upload-area__input {
  display: none;
}

.decode-upload-area__error {
  color: var(--danger);
}
</style>
