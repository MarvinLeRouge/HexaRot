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
      revealResult(errorRef.value, { focus: true })
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
    <div class="encode-view__body">
      <EncodeParamsForm />
      <div class="encode-view__output">
        <p
          v-if="store.status === 'error'"
          ref="errorRef"
          class="encode-view__error"
          role="alert"
          tabindex="-1"
        >
          {{ store.errorMessage ? t('encode.form.error.prefix', { detail: store.errorMessage }) : t(`errors.${store.errorCode}`) }}
        </p>
        <div
          v-if="store.status === 'loading'"
          class="encode-view__output-loading"
          aria-hidden="true"
        >
          <div class="encode-view__skeleton-block encode-view__skeleton-block--preview" />
          <div class="encode-view__skeleton-block encode-view__skeleton-block--key" />
        </div>
        <EncodeResultPanel
          v-if="store.status === 'success' && store.result"
          ref="resultRef"
          :result="store.result"
          :stale="store.resultStale"
        />
        <p
          v-if="store.status === 'idle'"
          class="encode-view__output-empty"
        >
          {{ t('encode.result.emptyState') }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.encode-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.encode-view h1 {
  align-self: center;
}

.encode-view__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.encode-view__output {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 480px;
}

.encode-view__error {
  color: var(--danger);
}

.encode-view__output-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  margin: 0;
  padding: 20px;
  border: 2px dashed var(--border);
  border-radius: 8px;
  color: var(--text-muted);
  text-align: center;
}

.encode-view__output-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.encode-view__skeleton-block {
  border-radius: 8px;
  background: linear-gradient(90deg, var(--code-bg) 25%, var(--border) 50%, var(--code-bg) 75%);
  background-size: 200% 100%;
  animation: encode-view-shimmer 1.5s ease-in-out infinite;
}

.encode-view__skeleton-block--preview {
  height: 280px;
}

.encode-view__skeleton-block--key {
  height: 120px;
}

@keyframes encode-view-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .encode-view__skeleton-block {
    animation: none;
    background: var(--code-bg);
  }
}

@media (min-width: 900px) {
  .encode-view h1 {
    align-self: flex-start;
    width: 100%;
    max-width: 480px;
  }

  .encode-view__body {
    display: grid;
    grid-template-columns: minmax(360px, 480px) 1fr;
    align-items: start;
  }

  .encode-view__output {
    max-width: none;
  }
}
</style>
