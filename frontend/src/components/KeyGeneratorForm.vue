<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKeyStore } from '../stores/key'
import { READING_ORDERS } from '../constants/reading-orders'
import { revealResult } from '../utils/reveal-result'
import RotationSequencePicker from './RotationSequencePicker.vue'
import LoadingSpinner from './LoadingSpinner.vue'

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

const errorRef = ref<HTMLElement | null>(null)
const resultRef = ref<HTMLElement | null>(null)

watch(
  () => store.generateStatus,
  async (status) => {
    await nextTick()
    if (status === 'success') {
      revealResult(resultRef.value, { focus: true })
    } else if (status === 'error') {
      revealResult(errorRef.value, { focus: true })
    }
  },
)

watch(
  () => [store.pivotBlockSize, store.rotationSequence, store.rotationDirection, store.readingOrder],
  () => store.invalidateGenerated(),
)

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
    :aria-busy="store.generateStatus === 'loading'"
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
        >{{ t(`readingOrder.${order}`) }}</option>
      </select>
    </label>

    <button
      type="submit"
      class="key-generator-form__submit btn-primary"
      :disabled="!canGenerate"
    >
      <LoadingSpinner v-if="store.generateStatus === 'loading'" />
      {{ store.generateStatus === 'loading' ? t('key.generator.form.submit.loading') : t('key.generator.form.submit.label') }}
    </button>

    <p
      v-if="store.generateStatus === 'error'"
      ref="errorRef"
      class="key-generator-form__error"
      role="alert"
      tabindex="-1"
    >
      {{ store.generateErrorMessage ? t('key.generator.form.error.prefix', { detail: store.generateErrorMessage }) : t(`errors.${store.generateErrorCode}`) }}
    </p>

    <div
      v-if="store.generateStatus === 'success' && store.generatedKey"
      ref="resultRef"
      class="key-generator-form__result"
      role="region"
      tabindex="-1"
      aria-live="polite"
      :aria-label="t('key.generator.result.regionLabel')"
    >
      <div
        v-if="store.generatedKeyStale"
        class="key-generator-form__stale-notice"
        role="status"
      >
        <p>{{ t('key.generator.result.staleNotice') }}</p>
        <button
          type="button"
          class="btn-primary"
          @click="handleGenerate"
        >
          {{ t('key.generator.result.regenerate') }}
        </button>
      </div>
      <div
        class="key-generator-form__result-content"
        :class="{ 'key-generator-form__result-content--stale': store.generatedKeyStale }"
      >
        <span class="key-generator-form__result-label">{{ t('key.generator.result.keyLabel') }}</span>
        <code class="key-generator-form__result-value">{{ store.generatedKey }}</code>
        <p class="key-generator-form__result-hint">
          {{ t('key.generator.result.keyHint') }}
        </p>
        <button
          type="button"
          class="btn-primary"
          :disabled="store.generatedKeyStale"
          @click="copyKey"
        >
          {{ copyState === 'copied' ? t('key.generator.result.copied') : copyState === 'error' ? t('key.generator.result.copyError') : t('key.generator.result.copy') }}
        </button>
      </div>
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
  color: var(--danger);
}

.key-generator-form__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.key-generator-form__result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.key-generator-form__stale-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--warning-border);
  background: var(--warning-bg);
  border-radius: 8px;
}

.key-generator-form__stale-notice p {
  margin: 0;
  flex: 1;
}

.key-generator-form__result-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--accent-border);
  border-radius: 8px;
  background: var(--accent-bg);
}

/*
 * A dashed outline instead of opacity: opacity on this text has repeatedly
 * failed WCAG contrast in past critiques (round 4, 5, 6).
 */
.key-generator-form__result-content--stale {
  border-style: dashed;
  border-color: var(--warning-border);
  background: transparent;
}

.key-generator-form__result-label {
  font-size: 0.8em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-h);
}

.key-generator-form__result-value {
  font-size: 1.3em;
  padding: 0;
  background: transparent;
  word-break: break-all;
}

.key-generator-form__result-hint {
  margin: 0;
  font-size: 0.9em;
  color: var(--text);
}
</style>
