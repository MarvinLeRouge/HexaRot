<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKeyStore } from '../stores/key'
import { isValidKeyFormat } from '../utils/key-format'

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
</script>

<template>
  <form
    class="key-parser-form"
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
      :disabled="!canParse"
    >
      {{ store.parseStatus === 'loading' ? t('key.parser.form.submit.loading') : t('key.parser.form.submit.label') }}
    </button>

    <p
      v-if="store.parseStatus === 'error'"
      class="key-parser-form__error"
      role="alert"
    >
      {{ store.parseErrorMessage ?? t(`errors.${store.parseErrorCode}`) }}
    </p>

    <dl
      v-if="store.parseStatus === 'success' && store.parsedParams"
      class="key-parser-form__result"
    >
      <dt>{{ t('key.parser.result.pivotBlockSize') }}</dt>
      <dd>{{ store.parsedParams.pivotBlockSize }}</dd>

      <dt>{{ t('key.parser.result.rotationSequence') }}</dt>
      <dd>{{ store.parsedParams.rotationSequence.map((angle) => `${angle}°`).join(', ') }}</dd>

      <dt>{{ t('key.parser.result.rotationDirection') }}</dt>
      <dd>{{ store.parsedParams.rotationDirection }}</dd>

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
}

.key-parser-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.key-parser-form__error {
  color: #c0392b;
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
