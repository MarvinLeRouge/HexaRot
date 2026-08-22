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
      revealResult(errorRef.value, { focus: true })
    }
  },
)

function redecode(): void {
  void store.submit()
}

const copyState = ref<'idle' | 'copied' | 'error'>('idle')

async function copyResult(): Promise<void> {
  if (!store.result) return
  try {
    await navigator.clipboard.writeText(store.result)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'error'
  }
  setTimeout(() => {
    copyState.value = 'idle'
  }, 2000)
}

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
    <div class="decode-view__body">
      <DecodeParamsForm />
      <div class="decode-view__output">
        <p
          v-if="store.status === 'error'"
          ref="errorRef"
          class="decode-view__error"
          role="alert"
          tabindex="-1"
        >
          {{ store.errorMessage ? t('decode.form.error.prefix', { detail: store.errorMessage }) : t(`errors.${store.errorCode}`) }}
        </p>
        <div
          v-if="store.status === 'loading' && !store.result"
          class="decode-view__output-loading"
          aria-hidden="true"
        >
          <div class="decode-view__skeleton-block" />
        </div>
        <div
          v-if="store.result"
          ref="resultRef"
          class="decode-view__result-region"
          role="region"
          tabindex="-1"
          aria-live="polite"
        >
          <div
            v-if="store.resultStale"
            class="decode-view__stale-notice"
            role="status"
          >
            <p>{{ t('decode.result.staleNotice') }}</p>
            <button
              type="button"
              class="btn-primary"
              @click="redecode"
            >
              {{ t('decode.result.redecode') }}
            </button>
          </div>
          <div
            class="decode-view__result-card"
            :class="{ 'decode-view__result-card--stale': store.resultStale }"
          >
            <span class="decode-view__result-label">{{ t('decode.result.label') }}</span>
            <p class="decode-view__result">
              {{ store.result }}
            </p>
            <button
              type="button"
              class="btn-primary"
              @click="copyResult"
            >
              {{ copyState === 'copied' ? t('decode.result.copied') : copyState === 'error' ? t('decode.result.copyError') : t('decode.result.copy') }}
            </button>
          </div>
        </div>
        <p
          v-if="store.status === 'idle'"
          class="decode-view__output-empty"
        >
          {{ t('decode.result.emptyState') }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.decode-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.decode-view h1 {
  align-self: center;
}

.decode-view__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.decode-view__output {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 480px;
}

.decode-view__error {
  color: var(--danger);
}

.decode-view__result-region {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.decode-view__stale-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--warning-border);
  background: var(--warning-bg);
  border-radius: 8px;
}

.decode-view__stale-notice p {
  margin: 0;
  flex: 1;
}

.decode-view__result-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--accent-border);
  border-radius: 8px;
  background: var(--accent-bg);
}

.decode-view__result-label {
  font-size: 0.8em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-h);
}

.decode-view__result {
  margin: 0;
  width: 100%;
  font-family: var(--mono);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  max-height: 40vh;
  overflow-y: auto;
}

/*
 * Staleness is signalled by an outline, never by dimming text - opacity on
 * this text has repeatedly failed WCAG contrast in past critiques (round 4,
 * 5, 6), and there's no reason a "this answer may be wrong" state should
 * also make the answer harder to read.
 */
.decode-view__result-card--stale {
  border: 1px dashed var(--warning-border);
  background: transparent;
}

.decode-view__output-empty {
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

.decode-view__output-loading {
  display: flex;
  flex-direction: column;
}

.decode-view__skeleton-block {
  height: 60px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--code-bg) 25%, var(--border) 50%, var(--code-bg) 75%);
  background-size: 200% 100%;
  animation: decode-view-shimmer 1.5s ease-in-out infinite;
}

@keyframes decode-view-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .decode-view__skeleton-block {
    animation: none;
    background: var(--code-bg);
  }
}

@media (min-width: 900px) {
  .decode-view h1 {
    align-self: flex-start;
    width: 100%;
    max-width: 480px;
  }

  .decode-view__body {
    display: grid;
    grid-template-columns: minmax(360px, 480px) 1fr;
    align-items: start;
  }

  .decode-view__output {
    max-width: none;
  }
}
</style>
