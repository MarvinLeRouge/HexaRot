<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKeyStore } from '../stores/key'
import { READING_ORDERS } from '../constants/reading-orders'
import RotationSequencePicker from './RotationSequencePicker.vue'

const store = useKeyStore()
const { t } = useI18n()

const canGenerate = computed(() => {
  if (store.generateStatus === 'loading') return false
  return Number.isInteger(store.pivotBlockSize) && store.pivotBlockSize >= 1 && store.pivotBlockSize <= 255
})

function handleGenerate(): void {
  if (!canGenerate.value) return
  void store.generate()
}

const copyState = ref<'idle' | 'copied' | 'error'>('idle')

async function copyKey(): Promise<void> {
  if (!store.generatedKey) return
  try {
    await navigator.clipboard.writeText(store.generatedKey)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'error'
  }
  setTimeout(() => {
    copyState.value = 'idle'
  }, 2000)
}
</script>

<template>
  <form
    class="key-generator-form"
    @submit.prevent="handleGenerate"
  >
    <h2>{{ t('key.generator.title') }}</h2>

    <label class="key-generator-form__field">
      {{ t('key.generator.form.pivotBlockSize.label') }}
      <input
        v-model.number="store.pivotBlockSize"
        type="number"
        min="1"
        max="255"
      >
    </label>

    <div class="key-generator-form__field">
      {{ t('key.generator.form.rotationSequence.label') }}
      <RotationSequencePicker v-model="store.rotationSequence" />
    </div>

    <label class="key-generator-form__field">
      {{ t('key.generator.form.rotationDirection.label') }}
      <select
        v-model="store.rotationDirection"
        name="rotationDirection"
      >
        <option value="cw">{{ t('key.generator.form.rotationDirection.cw') }}</option>
        <option value="ccw">{{ t('key.generator.form.rotationDirection.ccw') }}</option>
      </select>
    </label>

    <label class="key-generator-form__field">
      {{ t('key.generator.form.readingOrder.label') }}
      <select
        v-model="store.readingOrder"
        name="readingOrder"
      >
        <option
          v-for="order in READING_ORDERS"
          :key="order"
          :value="order"
        >{{ order }}</option>
      </select>
    </label>

    <button
      type="submit"
      :disabled="!canGenerate"
    >
      {{ store.generateStatus === 'loading' ? t('key.generator.form.submit.loading') : t('key.generator.form.submit.label') }}
    </button>

    <p
      v-if="store.generateStatus === 'error'"
      class="key-generator-form__error"
      role="alert"
    >
      {{ store.generateErrorMessage ?? t(`errors.${store.generateErrorCode}`) }}
    </p>

    <div
      v-if="store.generateStatus === 'success' && store.generatedKey"
      class="key-generator-form__result"
    >
      <span>{{ t('key.generator.result.keyLabel') }}: <code>{{ store.generatedKey }}</code></span>
      <button
        type="button"
        @click="copyKey"
      >
        {{ copyState === 'copied' ? t('key.generator.result.copied') : copyState === 'error' ? t('key.generator.result.copyError') : t('key.generator.result.copy') }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.key-generator-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
}

.key-generator-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.key-generator-form__error {
  color: #c0392b;
}

.key-generator-form__result {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
