<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKeyStore } from '../stores/key'
import { isValidKeyFormat } from '../utils/key-format'
import { revealResult } from '../utils/reveal-result'
import LoadingSpinner from './LoadingSpinner.vue'

const store = useKeyStore()
const { t } = useI18n()

const keyFormatError = computed(() => {
  if (store.keyInput.length === 0) return null
  return isValidKeyFormat(store.keyInput) ? null : t('key.parser.form.key.formatError')
})

const canParse = computed(() => {
  if (store.parseStatus === 'loading') return false
  return store.keyInput.length > 0 && keyFormatError.value === null
})

function handleParse(): void {
  if (!canParse.value) return
  void store.parse()
}

const errorRef = ref<HTMLElement | null>(null)
const resultRef = ref<HTMLElement | null>(null)

watch(
  () => store.parseStatus,
  async (status) => {
    await nextTick()
    if (status === 'success') {
      revealResult(resultRef.value, { focus: true })
    } else if (status === 'error') {
      revealResult(errorRef.value, { focus: true })
    }
  },
)
</script>

<template>
  <form
    class="key-parser-form"
    :aria-busy="store.parseStatus === 'loading'"
    @submit.prevent="handleParse"
  >
    <h2>{{ t('key.parser.title') }}</h2>

    <label class="key-parser-form__field">
      {{ t('key.parser.form.key.label') }}
      <input
        v-model="store.keyInput"
        type="text"
        :placeholder="t('key.parser.form.key.placeholder')"
      >
    </label>
    <p
      v-if="keyFormatError"
      class="key-parser-form__error"
      role="alert"
    >
      {{ keyFormatError }}
    </p>

    <button
      type="submit"
      class="key-parser-form__submit btn-primary"
      :disabled="!canParse"
    >
      <LoadingSpinner v-if="store.parseStatus === 'loading'" />
      {{ store.parseStatus === 'loading' ? t('key.parser.form.submit.loading') : t('key.parser.form.submit.label') }}
    </button>

    <p
      v-if="store.parseStatus === 'error'"
      ref="errorRef"
      class="key-parser-form__error"
      role="alert"
      tabindex="-1"
    >
      {{ store.parseErrorMessage ? t('key.parser.form.error.prefix', { detail: store.parseErrorMessage }) : t(`errors.${store.parseErrorCode}`) }}
    </p>

    <dl
      v-if="store.parseStatus === 'success' && store.parsedParams"
      ref="resultRef"
      class="key-parser-form__result"
      role="region"
      tabindex="-1"
      aria-live="polite"
      :aria-label="t('key.parser.result.regionLabel')"
    >
      <dt>{{ t('key.parser.result.pivotBlockSize') }}</dt>
      <dd>{{ store.parsedParams.pivotBlockSize }}</dd>

      <dt>{{ t('key.parser.result.rotationSequence') }}</dt>
      <dd>{{ store.parsedParams.rotationSequence.map((angle) => `${angle}°`).join(', ') }}</dd>

      <dt>{{ t('key.parser.result.rotationDirection') }}</dt>
      <dd>{{ t(`key.generator.form.rotationDirection.${store.parsedParams.rotationDirection}`) }}</dd>

      <dt>{{ t('key.parser.result.readingOrder') }}</dt>
      <dd>{{ store.parsedParams.readingOrder }}</dd>
    </dl>
  </form>
</template>

<style scoped>
.key-parser-form {
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

.key-parser-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.key-parser-form__error {
  color: var(--danger);
}

.key-parser-form__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.key-parser-form__result {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
}

.key-parser-form__result dt {
  font-weight: 600;
}
</style>
