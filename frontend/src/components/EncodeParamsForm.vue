<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEncodeStore } from '../stores/encode'
import { READING_ORDERS } from '../constants/reading-orders'
import { isValidKeyFormat } from '../utils/key-format'
import RotationSequencePicker from './RotationSequencePicker.vue'

const store = useEncodeStore()
const { t } = useI18n()

const keyFormatError = computed(() => {
  if (store.mode !== 'key' || store.keyInput.length === 0) return null
  return isValidKeyFormat(store.keyInput) ? null : t('encode.form.key.formatError')
})

const canSubmit = computed(() => {
  if (store.status === 'loading') return false
  if (store.message.trim().length === 0) return false
  if (store.mode === 'key') {
    return store.keyInput.length > 0 && keyFormatError.value === null
  }
  return true
})

function handleSubmit(): void {
  if (!canSubmit.value) return
  void store.submit()
}
</script>

<template>
  <form
    class="encode-params-form"
    @submit.prevent="handleSubmit"
  >
    <fieldset class="encode-params-form__mode-toggle">
      <legend>{{ t('encode.form.mode.label') }}</legend>
      <label>
        <input
          v-model="store.mode"
          type="radio"
          value="params"
        >
        {{ t('encode.form.mode.params') }}
      </label>
      <label>
        <input
          v-model="store.mode"
          type="radio"
          value="key"
        >
        {{ t('encode.form.mode.key') }}
      </label>
    </fieldset>

    <label class="encode-params-form__field">
      {{ t('encode.form.message.label') }}
      <textarea
        v-model="store.message"
        :placeholder="t('encode.form.message.placeholder')"
      />
    </label>

    <template v-if="store.mode === 'params'">
      <label class="encode-params-form__field">
        {{ t('encode.form.pivotBlockSize.label') }}
        <input
          v-model.number="store.pivotBlockSize"
          type="number"
          min="1"
          max="255"
        >
      </label>

      <div class="encode-params-form__field">
        {{ t('encode.form.rotationSequence.label') }}
        <RotationSequencePicker v-model="store.rotationSequence" />
      </div>

      <label class="encode-params-form__field">
        {{ t('encode.form.rotationDirection.label') }}
        <select
          v-model="store.rotationDirection"
          name="rotationDirection"
        >
          <option value="cw">{{ t('encode.form.rotationDirection.cw') }}</option>
          <option value="ccw">{{ t('encode.form.rotationDirection.ccw') }}</option>
        </select>
      </label>

      <label class="encode-params-form__field">
        {{ t('encode.form.readingOrder.label') }}
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
    </template>

    <template v-else>
      <label class="encode-params-form__field">
        {{ t('encode.form.key.label') }}
        <input
          v-model="store.keyInput"
          type="text"
          :placeholder="t('encode.form.key.placeholder')"
        >
      </label>
      <p
        v-if="keyFormatError"
        class="encode-params-form__error"
        role="alert"
      >
        {{ keyFormatError }}
      </p>
    </template>

    <label class="encode-params-form__field">
      {{ t('encode.form.size.label') }}
      <select
        v-model="store.size"
        name="size"
      >
        <option value="small">{{ t('encode.form.size.small') }}</option>
        <option value="medium">{{ t('encode.form.size.medium') }}</option>
        <option value="large">{{ t('encode.form.size.large') }}</option>
      </select>
    </label>

    <label class="encode-params-form__checkbox">
      <input
        v-model="store.overrideWeaknessWarning"
        type="checkbox"
      >
      {{ t('encode.form.overrideWeaknessWarning.label') }}
    </label>

    <button
      type="submit"
      :disabled="!canSubmit"
    >
      {{ store.status === 'loading' ? t('encode.form.submit.loading') : t('encode.form.submit.label') }}
    </button>
  </form>
</template>

<style scoped>
.encode-params-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}

.encode-params-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.encode-params-form__mode-toggle {
  display: flex;
  gap: 16px;
  border: none;
  padding: 0;
}

.encode-params-form__error {
  color: #c0392b;
}
</style>
