<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDecodeStore } from '../stores/decode'
import { isValidKeyFormat } from '../utils/key-format'
import DecodeUploadArea from './DecodeUploadArea.vue'

const store = useDecodeStore()
const { t } = useI18n()

const keyFormatError = computed(() => {
  if (store.keyInput.length === 0) return null
  return isValidKeyFormat(store.keyInput) ? null : t('decode.form.key.formatError')
})

const canSubmit = computed(() => {
  if (store.status === 'loading') return false
  if (store.file === null) return false
  return store.keyInput.length > 0 && keyFormatError.value === null
})

function handleSubmit(): void {
  if (!canSubmit.value) return
  void store.submit()
}
</script>

<template>
  <form
    class="decode-params-form"
    @submit.prevent="handleSubmit"
  >
    <div class="decode-params-form__field">
      {{ t('decode.form.upload.label') }}
      <DecodeUploadArea v-model="store.file" />
    </div>

    <label class="decode-params-form__field">
      {{ t('decode.form.key.label') }}
      <input
        v-model="store.keyInput"
        type="text"
        :placeholder="t('decode.form.key.placeholder')"
      >
    </label>
    <p
      v-if="keyFormatError"
      class="decode-params-form__error"
      role="alert"
    >
      {{ keyFormatError }}
    </p>

    <label class="decode-params-form__field">
      {{ t('decode.form.size.label') }}
      <select
        v-model="store.size"
        name="size"
      >
        <option value="small">{{ t('decode.form.size.small') }}</option>
        <option value="medium">{{ t('decode.form.size.medium') }}</option>
        <option value="large">{{ t('decode.form.size.large') }}</option>
      </select>
    </label>
    <p class="decode-params-form__hint">
      {{ t('decode.form.size.hint') }}
    </p>

    <button
      type="submit"
      :disabled="!canSubmit"
    >
      {{ store.status === 'loading' ? t('decode.form.submit.loading') : t('decode.form.submit.label') }}
    </button>
  </form>
</template>

<style scoped>
.decode-params-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}

.decode-params-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.decode-params-form__error {
  color: #c0392b;
}

.decode-params-form__hint {
  font-size: 0.85em;
  color: var(--text-muted);
  margin: 0;
}
</style>
