<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEncodeStore } from '../stores/encode'
import { revealResult } from '../utils/reveal-result'
import EncodeParamsForm from '../components/EncodeParamsForm.vue'
import EncodeResultPanel from '../components/EncodeResultPanel.vue'

const store = useEncodeStore()
const { t } = useI18n()

const errorRef = ref<HTMLElement | null>(null)
const resultRef = ref<InstanceType<typeof EncodeResultPanel> | null>(null)

watch(
  () => store.status,
  async (status) => {
    await nextTick()
    if (status === 'success') {
      revealResult(resultRef.value?.$el ?? null, { focus: true })
    } else if (status === 'error') {
      revealResult(errorRef.value)
    }
  },
)

onUnmounted(() => {
  if (store.status !== 'success') {
    store.reset()
  }
})
</script>

<template>
  <div
    class="encode-view"
    :aria-busy="store.status === 'loading'"
  >
    <h1>{{ t('encode.title') }}</h1>
    <EncodeParamsForm />
    <p
      v-if="store.status === 'error'"
      ref="errorRef"
      class="encode-view__error"
      role="alert"
    >
      {{ store.errorMessage ? t('encode.form.error.prefix', { detail: store.errorMessage }) : t(`errors.${store.errorCode}`) }}
    </p>
    <EncodeResultPanel
      v-if="store.status === 'success' && store.result"
      ref="resultRef"
      :result="store.result"
    />
  </div>
</template>

<style scoped>
.encode-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.encode-view__error {
  color: #c0392b;
}
</style>
