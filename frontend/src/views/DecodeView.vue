<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDecodeStore } from '../stores/decode'
import { revealResult } from '../utils/reveal-result'
import DecodeParamsForm from '../components/DecodeParamsForm.vue'

const store = useDecodeStore()
const { t } = useI18n()

const errorRef = ref<HTMLElement | null>(null)
const resultRef = ref<HTMLElement | null>(null)

watch(
  () => store.status,
  async (status) => {
    await nextTick()
    if (status === 'success') {
      revealResult(resultRef.value, { focus: true })
    } else if (status === 'error') {
      revealResult(errorRef.value)
    }
  },
)

onUnmounted(() => {
  store.reset()
})
</script>

<template>
  <div
    class="decode-view"
    :aria-busy="store.status === 'loading'"
  >
    <h1>{{ t('decode.title') }}</h1>
    <DecodeParamsForm />
    <p
      v-if="store.status === 'error'"
      ref="errorRef"
      class="decode-view__error"
      role="alert"
    >
      {{ store.errorMessage ? t('decode.form.error.prefix', { detail: store.errorMessage }) : t(`errors.${store.errorCode}`) }}
    </p>
    <p
      v-if="store.status === 'success' && store.result"
      ref="resultRef"
      class="decode-view__result"
      tabindex="-1"
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
