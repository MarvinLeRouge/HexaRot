<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDecodeStore } from '../stores/decode'
import DecodeParamsForm from '../components/DecodeParamsForm.vue'

const store = useDecodeStore()
const { t } = useI18n()

onUnmounted(() => {
  store.reset()
})
</script>

<template>
  <div class="decode-view">
    <h1>{{ t('decode.title') }}</h1>
    <DecodeParamsForm />
    <p
      v-if="store.status === 'error'"
      class="decode-view__error"
      role="alert"
    >
      {{ store.errorMessage ? t('decode.form.error.prefix', { detail: store.errorMessage }) : t(`errors.${store.errorCode}`) }}
    </p>
    <p
      v-if="store.status === 'success' && store.result"
      class="decode-view__result"
      aria-live="polite"
    >
      <strong>{{ t('decode.result.label') }}:</strong> {{ store.result }}
    </p>
  </div>
</template>

<style scoped>
.decode-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.decode-view__error {
  color: #c0392b;
}
</style>
